import crypto from "crypto";
import express, { Router } from "express";
import { q } from "./db";
import { handleText } from "./commands";
import { chunk } from "./messages";
import { setSender, startFeeScheduler, payQr } from "./fees";

export async function sendText(to: string, body: string) {
  const { WHATSAPP_TOKEN: t, WHATSAPP_PHONE_NUMBER_ID: id } = process.env;
  if (!t || !id) return console.log(`[WA dry-run] -> ${to}: ${body}`);
  const r = await fetch(`https://graph.facebook.com/v20.0/${id}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${t}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: to.replace("+", ""),
      type: "text",
      text: { body },
    }),
  });
  if (!r.ok) console.error("WA send failed", r.status, await r.text());
}

/**
 * Fee reminder. Uses the approved Meta template when WHATSAPP_FEE_TEMPLATE is set
 * (works even if the member hasn't messaged in 24h). Otherwise falls back to plain text.
 * vars = [name, gymName, dueDate, amount] -> {{1}}..{{4}}. Throws on failure.
 */
export async function sendFeeReminder(
  to: string,
  vars: string[],
  fallback: string,
) {
  const {
    WHATSAPP_TOKEN: t,
    WHATSAPP_PHONE_NUMBER_ID: id,
    WHATSAPP_FEE_TEMPLATE: tpl,
  } = process.env;
  if (!t || !id)
    return console.log(
      `[WA dry-run] -> ${to}: [template ${tpl ?? "none"}] ${vars.join(" | ")}`,
    );
  if (!tpl) {
    const r = await fetch(`https://graph.facebook.com/v20.0/${id}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${t}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: to.replace("+", ""),
        type: "text",
        text: { body: fallback },
      }),
    });
    if (!r.ok) throw new Error(`WA send failed ${r.status} ${await r.text()}`);
    return;
  }
  const r = await fetch(`https://graph.facebook.com/v20.0/${id}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${t}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: to.replace("+", ""),
      type: "template",
      template: {
        name: tpl,
        language: { code: process.env.WHATSAPP_FEE_TEMPLATE_LANG ?? "en" },
        components: [
          {
            type: "body",
            parameters: vars.map((text) => ({ type: "text", text })),
          },
        ],
      },
    }),
  });
  if (!r.ok)
    throw new Error(`WA template send failed ${r.status} ${await r.text()}`);
}

/** Sends a PNG (e.g. UPI QR) as a WhatsApp image with caption. Throws on failure. */
async function sendImage(to: string, png: Buffer, caption: string) {
  const { WHATSAPP_TOKEN: t, WHATSAPP_PHONE_NUMBER_ID: id } = process.env;
  if (!t || !id)
    return console.log(`[WA dry-run] -> ${to}: [QR image] ${caption}`);
  const form = new FormData();
  form.append("messaging_product", "whatsapp");
  form.append("type", "image/png");
  form.append(
    "file",
    new Blob([new Uint8Array(png)], { type: "image/png" }),
    "qr.png",
  );
  const up = await fetch(`https://graph.facebook.com/v20.0/${id}/media`, {
    method: "POST",
    headers: { Authorization: `Bearer ${t}` },
    body: form,
  });
  if (!up.ok)
    throw new Error(`WA media upload failed ${up.status} ${await up.text()}`);
  const { id: mediaId } = (await up.json()) as { id: string };
  const r = await fetch(`https://graph.facebook.com/v20.0/${id}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${t}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: to.replace("+", ""),
      type: "image",
      image: { id: mediaId, caption },
    }),
  });
  if (!r.ok)
    throw new Error(`WA image send failed ${r.status} ${await r.text()}`);
}

/** Text of an incoming message. Template/quick-reply button taps are mapped to commands. */
function incomingText(m: any): string | null {
  if (m.type === "text") return m.text?.body ?? null;
  const label: string | undefined =
    m.type === "button"
      ? (m.button?.text ?? m.button?.payload)
      : m.type === "interactive"
        ? (m.interactive?.button_reply?.title ??
          m.interactive?.button_reply?.id)
        : undefined;
  if (!label) return null;
  if (/cash/i.test(label)) return "CASH";
  if (/pay/i.test(label)) return "PAY";
  return label;
}

setSender(sendText, sendFeeReminder);
if (process.env.NODE_ENV !== "test") startFeeScheduler();

function validSig(req: any): boolean {
  const secret = process.env.WHATSAPP_APP_SECRET;
  if (!secret) {
    console.warn("WHATSAPP_APP_SECRET not set: skipping signature check");
    return true;
  }
  const sig = String(req.headers["x-hub-signature-256"] ?? "");
  const exp =
    "sha256=" +
    crypto
      .createHmac("sha256", secret)
      .update(req.raw ?? Buffer.alloc(0))
      .digest("hex");
  return (
    sig.length === exp.length &&
    crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(exp))
  );
}

export async function processMessage(id: string, from: string, text: string) {
  const fresh = await q(
    "insert into processed_messages(whatsapp_message_id) values($1) on conflict do nothing returning 1",
    [id],
  );
  if (!fresh.length) return; // WhatsApp retry: already handled
  const phone = "+" + from.replace(/\D/g, "");
  if (text.trim().toUpperCase() === "PAY") {
    try {
      const qr = await payQr(phone);
      if (qr) return void (await sendImage(phone, qr.png, qr.caption));
    } catch (e) {
      console.error("QR send failed, falling back to text", e);
    }
  }
  for (const msg of (await handleText(phone, text)).flatMap((m) =>
    chunk(m.split("\n")),
  ))
    await sendText(phone, msg);
}

export const webhook = Router();
webhook.get("/", (req, res) => {
  if (
    req.query["hub.mode"] === "subscribe" &&
    req.query["hub.verify_token"] === process.env.WHATSAPP_VERIFY_TOKEN
  )
    return void res.send(req.query["hub.challenge"]);
  res.sendStatus(403);
});
webhook.post(
  "/",
  express.json({
    verify: (req: any, _r, buf) => {
      req.raw = buf;
    },
  }),
  (req, res) => {
    if (!validSig(req)) return void res.sendStatus(401);
    res.sendStatus(200); // ack fast; Meta retries slow responses
    (async () => {
      for (const e of req.body?.entry ?? [])
        for (const ch of e.changes ?? [])
          for (const m of ch.value?.messages ?? []) {
            const text = incomingText(m);
            if (text)
              await processMessage(m.id, m.from, text).catch((err) =>
                console.error("webhook error", err),
              );
          }
    })();
  },
);
