import crypto from "crypto";
import express, { Router } from "express";
import { q } from "./db";
import { handleText } from "./commands";
import { chunk } from "./messages";

export async function sendText(to: string, body: string) {
  const { WHATSAPP_TOKEN: t, WHATSAPP_PHONE_NUMBER_ID: id } = process.env;
  if (!t || !id) return console.log(`[WA dry-run] -> ${to}: ${body}`);
  const r = await fetch(`https://graph.facebook.com/v20.0/${id}/messages`, {
    method: "POST", headers: { Authorization: `Bearer ${t}`, "Content-Type": "application/json" },
    body: JSON.stringify({ messaging_product: "whatsapp", to: to.replace("+", ""), type: "text", text: { body } }),
  });
  if (!r.ok) console.error("WA send failed", r.status, await r.text());
}

function validSig(req: any): boolean {
  const secret = process.env.WHATSAPP_APP_SECRET;
  if (!secret) { console.warn("WHATSAPP_APP_SECRET not set: skipping signature check"); return true; }
  const sig = String(req.headers["x-hub-signature-256"] ?? "");
  const exp = "sha256=" + crypto.createHmac("sha256", secret).update(req.raw ?? Buffer.alloc(0)).digest("hex");
  return sig.length === exp.length && crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(exp));
}

export async function processMessage(id: string, from: string, text: string) {
  const fresh = await q("insert into processed_messages(whatsapp_message_id) values($1) on conflict do nothing returning 1", [id]);
  if (!fresh.length) return; // WhatsApp retry: already handled
  const phone = "+" + from.replace(/\D/g, "");
  for (const msg of (await handleText(phone, text)).flatMap((m) => chunk(m.split("\n")))) await sendText(phone, msg);
}

export const webhook = Router();
webhook.get("/", (req, res) => {
  if (req.query["hub.mode"] === "subscribe" && req.query["hub.verify_token"] === process.env.WHATSAPP_VERIFY_TOKEN) return void res.send(req.query["hub.challenge"]);
  res.sendStatus(403);
});
webhook.post("/", express.json({ verify: (req: any, _r, buf) => { req.raw = buf; } }), (req, res) => {
  if (!validSig(req)) return void res.sendStatus(401);
  res.sendStatus(200); // ack fast; Meta retries slow responses
  (async () => {
    for (const e of req.body?.entry ?? []) for (const ch of e.changes ?? []) for (const m of ch.value?.messages ?? [])
      if (m.type === "text") await processMessage(m.id, m.from, m.text.body).catch((err) => console.error("webhook error", err));
  })();
});
