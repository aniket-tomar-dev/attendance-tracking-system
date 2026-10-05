import cron from "node-cron";
import QRCode from "qrcode";
import { q } from "./db";
import { chunk, head } from "./messages";
import { findCustomers } from "./services";
import type { Gym } from "./services";

/* ---------- Senders (registered once from the webhook file) ---------- */
type SendText = (to: string, text: string) => Promise<unknown>;
type SendReminder = (
  to: string,
  vars: string[],
  fallback: string,
) => Promise<unknown>;
let sendText: SendText = async () => {
  throw new Error("fees.ts: setSender() not called");
};
let sendReminder: SendReminder = async () => {
  throw new Error("fees.ts: setSender() not called");
};
export const setSender = (text: SendText, reminder: SendReminder) => {
  sendText = text;
  sendReminder = reminder;
};

const rupee = (n: number) => `₹${Number(n).toLocaleString("en-IN")}`;
const amountTxt = (n: number) => Number(n).toLocaleString("en-IN");

/* ---------- Message templates ---------- */
export const reminderMsg = (
  name: string,
  gymName: string,
  due: string,
  amount: number,
) =>
  `${head("💳", "Fee reminder")}\nHi *${name}*, your membership fee at *${gymName}* is due.\n\n📅 Due date: *${due}*\n💰 Amount: *${rupee(amount)}*\n\nReply *PAY* for the UPI QR or *CASH* to pay at the gym.`;

export const payMsg = (gymName: string, amount: number, upi: string) =>
  `${head("💳", "Pay your fees")}\n🏋️ ${gymName}\n💰 Amount: *${rupee(amount)}*\n\n📲 UPI ID: \`\`\`${upi}\`\`\`\n🔗 upi://pay?pa=${upi}&pn=${encodeURIComponent(gymName)}&am=${amount}&cu=INR&tn=Gym%20fees\n\nAfter paying, reply *PAID*.`;

/* ---------- Owner: DUE ---------- */
export async function dueText(gym: Gym): Promise<string[]> {
  const r = await q(
    `select name, to_char(next_due,'DD Mon') as due,
            (next_due - (now() at time zone $2)::date) as days
       from customers
      where gym_id=$1 and status='active' and next_due is not null
        and next_due <= (now() at time zone $2)::date + 3
      order by next_due`,
    [gym.id, gym.timezone],
  );
  const when = (d: number) =>
    d < 0 ? `overdue ${-d}d` : d === 0 ? "due today" : `in ${d}d`;
  return chunk([
    `${head("💳", "Fees due")}\nTotal: *${r.length}*\n`,
    ...r.map(
      (x: any, i: number) =>
        `${i + 1}. *${x.name}*  ·  ${x.due} (${when(Number(x.days))})`,
    ),
  ]);
}

/* ---------- Owner: REMIND <name/phone> ---------- */
export async function remindOne(gym: Gym, arg: string): Promise<string[]> {
  const f = await findCustomers(gym, arg);
  if (f.length !== 1)
    return [
      f.length
        ? `⚠️ ${f.length} matches found. Please use the phone number.`
        : "⚠️ No customer found.",
    ];
  const [r] = await q(
    `select c.name, c.phone, g.name as gym_name, g.fee_amount,
            to_char(c.next_due,'DD Mon YYYY') as due
       from customers c join gyms g on g.id=c.gym_id where c.id=$1`,
    [f[0].id],
  );
  await sendReminder(
    r.phone,
    [r.name, r.gym_name, r.due, amountTxt(r.fee_amount)],
    reminderMsg(r.name, r.gym_name, r.due, r.fee_amount),
  );
  await q("update customers set last_reminded=current_date where id=$1", [
    f[0].id,
  ]);
  return [`✅ Reminder sent to *${r.name}*`];
}

/* ---------- Owner: PAID <name/phone> ---------- */
export async function markPaid(gym: Gym, arg: string): Promise<string[]> {
  const f = await findCustomers(gym, arg);
  if (f.length !== 1)
    return [
      f.length
        ? `⚠️ ${f.length} matches found. Please use the phone number.`
        : "⚠️ No customer found.",
    ];
  const [r] = await q(
    `update customers
        set next_due = greatest(next_due, current_date) + 30, last_reminded = null
      where id=$1
  returning name, to_char(next_due,'DD Mon YYYY') as due`,
    [f[0].id],
  );
  return [
    `${head("✅", "Payment recorded")}\n👤 *${r.name}*\n📅 Next due: *${r.due}*`,
  ];
}

/* ---------- Customer: PAY and PAID ---------- */
async function customerByPhone(phone: string) {
  return (
    await q(
      `select c.id, c.name, c.gym_id, g.name as gym_name, g.fee_amount, g.upi_id
         from customers c join gyms g on g.id=c.gym_id
        where c.phone=$1 and c.status='active' order by c.created_at limit 1`,
      [phone],
    )
  )[0];
}
const NOT_FOUND = `${head("⚠️", "Number not found")}\nWe couldn't find your number.\nPlease ask the gym owner to add you.`;

export async function customerPay(phone: string): Promise<string> {
  const c = await customerByPhone(phone);
  if (!c) return NOT_FOUND;
  if (!c.upi_id) return `Please pay your fees at the *${c.gym_name}* counter.`;
  return payMsg(c.gym_name, c.fee_amount, c.upi_id);
}

/** UPI QR image (amount pre-filled). Returns null if the gym has no UPI ID. */
export async function payQr(
  phone: string,
): Promise<{ caption: string; png: Buffer } | null> {
  const c = await customerByPhone(phone);
  if (!c || !c.upi_id) return null;
  const amt = Number(c.fee_amount) > 0 ? `&am=${c.fee_amount}` : "";
  const link = `upi://pay?pa=${c.upi_id}&pn=${encodeURIComponent(c.gym_name)}${amt}&cu=INR&tn=${encodeURIComponent("Gym fees")}`;
  const png = await QRCode.toBuffer(link, { width: 512, margin: 2 });
  const caption = `${head("💳", "Scan to pay")}\n🏋️ ${c.gym_name}\n💰 Amount: *${rupee(c.fee_amount)}*\n📲 UPI ID: ${c.upi_id}\n\nScan with any UPI app (or save this image and scan it from your gallery).\nAfter paying, reply *PAID*.`;
  return { caption, png };
}

/** Customer chose to pay cash at the gym. */
export async function customerCash(phone: string): Promise<string> {
  const c = await customerByPhone(phone);
  if (!c) return NOT_FOUND;
  const owners = await q("select phone from owners where gym_id=$1", [
    c.gym_id,
  ]);
  for (const o of owners)
    await sendText(
      o.phone,
      `${head("💵", "Cash payment")}\n*${c.name}* will pay cash at the gym.\nAfter you collect it, reply:\n\`\`\`PAID ${c.name}\`\`\``,
    ).catch((e) => console.error("owner notify failed", e));
  return `${head("💵", "Pay at the gym")}\nPlease pay *${rupee(c.fee_amount)}* at the *${c.gym_name}* counter.\nWe've informed the gym owner.`;
}

export async function customerPaid(phone: string): Promise<string> {
  const c = await customerByPhone(phone);
  if (!c) return NOT_FOUND;
  const owners = await q("select phone from owners where gym_id=$1", [
    c.gym_id,
  ]);
  for (const o of owners)
    await sendText(
      o.phone,
      `${head("💰", "Payment claimed")}\n*${c.name}* says they've paid.\nVerify, then reply:\n\`\`\`PAID ${c.name}\`\`\``,
    ).catch((e) => console.error("owner notify failed", e));
  return `${head("✅", "Thank you")}\nWe've informed the gym owner. Your membership will be updated once they confirm.`;
}

/* ---------- Daily automatic reminders ---------- */
export async function runDailyReminders(): Promise<number> {
  const rows = await q(
    `select c.id, c.name, c.phone, g.name as gym_name, g.fee_amount,
            to_char(c.next_due,'DD Mon YYYY') as due
       from customers c join gyms g on g.id=c.gym_id
      where c.status='active' and c.next_due is not null
        and c.next_due <= (now() at time zone coalesce(g.timezone,'UTC'))::date
        and (c.last_reminded is null or c.last_reminded <= current_date - 3)`,
  );
  let sent = 0;
  for (const r of rows) {
    try {
      await sendReminder(
        r.phone,
        [r.name, r.gym_name, r.due, amountTxt(r.fee_amount)],
        reminderMsg(r.name, r.gym_name, r.due, r.fee_amount),
      );
      await q("update customers set last_reminded=current_date where id=$1", [
        r.id,
      ]);
      sent++;
    } catch (e) {
      console.error("fee reminder failed for", r.phone, e);
    }
  }
  return sent;
}

export function startFeeScheduler() {
  cron.schedule(
    "0 9 * * *",
    () => {
      runDailyReminders()
        .then((n) => console.log(`[fees] ${n} reminders sent`))
        .catch((e) => console.error("[fees] scheduler error", e));
    },
    { timezone: "Asia/Kolkata" },
  );
}
