import { q } from "./db";
import { M, chunk, calendar, head } from "./messages";
import {
  AppError,
  addCustomer,
  checkIn,
  findCustomers,
  getGym,
  getProgress,
  listAbsent,
  listCustomers,
  listToday,
} from "./services";
import type { Gym } from "./services";

const base = () => process.env.WEB_ORIGIN ?? "http://localhost:5173";

async function historyText(name: string, id: string, tz: string) {
  const { progress, days } = await getProgress(id, tz);
  const present = days.filter((d) => d.present).map((d) => d.date.slice(5));
  return `${M.progress(name, progress)}\n\n🗓 *Last 30 days:* ${present.length} visits${present.length ? "\n_" + present.join(", ") + "_" : ""}`;
}
async function monthCalendar(id: string, tz: string) {
  const { days } = await getProgress(id, tz);
  const today = new Date().toLocaleDateString("en-CA", { timeZone: tz }); // YYYY-MM-DD
  const [y, m] = today.split("-").map(Number);
  const attended = days
    .filter((d) => d.present && d.date.startsWith(today.slice(0, 7)))
    .map((d) => Number(d.date.slice(8, 10)));
  return calendar(y, m - 1, attended);
}

/* ---------- Owner-only reports ---------- */

async function totalMembersText(gym: Gym): Promise<string[]> {
  const all = await listCustomers(gym.id, "", "");
  const active = all.filter((x) => x.status === "active").length;
  return chunk([
    `${head("👥", "Members")}\nTotal: *${all.length}*  ·  Active: *${active}*  ·  Inactive: *${all.length - active}*\n`,
    ...all.map(
      (x, i) =>
        `${i + 1}. *${x.name}*  ${x.phone}${x.status === "active" ? "" : "  _(inactive)_"}`,
    ),
  ]);
}
async function todayText(gym: Gym): Promise<string[]> {
  const r = await listToday(gym);
  return chunk([
    `${head("🟢", "Today's check-ins")}\nTotal: *${r.length}*\n`,
    ...r.map((x, i) => `${i + 1}. *${x.name}*  ·  ${x.time}`),
  ]);
}
async function absentText(gym: Gym): Promise<string[]> {
  const r = await listAbsent(gym);
  return chunk([
    `${head("🔴", "Absent today")}\nTotal: *${r.length}*\n`,
    ...r.map((x, i) => `${i + 1}. ${x.name}`),
  ]);
}
async function statsText(gym: Gym): Promise<string[]> {
  const [active, today, absent] = await Promise.all([
    listCustomers(gym.id, "", "active"),
    listToday(gym),
    listAbsent(gym),
  ]);
  return [
    `${head("📊", gym.name)}\n👥 Active members: *${active.length}*\n🟢 Came today: *${today.length}*\n🔴 Absent today: *${absent.length}*`,
  ];
}

/* ---------- Add member from WhatsApp ---------- */

const ADD_USAGE = `${head("➕", "Add a member")}\n\`\`\`ADD <name> <phone>\`\`\`\nExample:\n_ADD Rahul Sharma 9876543210_\n_add member Rahul Sharma +91 98765 43210_`;

/** Parses "ADD member Rahul Sharma 98765 43210" -> { name, phone } (null if it doesn't fit). */
function parseAdd(text: string): { name: string; phone: string } | null {
  const body = text
    .trim()
    .replace(/^add\s+(a\s+)?(new\s+)?(member|customer)?\s*/i, "")
    .trim();
  const m = body.match(/^(.*?)[\s:,-]*(\+?\d[\d\s-]{6,}\d)\s*$/);
  if (!m) return null;
  const name = m[1].trim();
  const phone = m[2].trim();
  if (!name) return null;
  return { name, phone };
}

/* ---------- Natural-language question detection (English / Hinglish / Hindi) ---------- */

type Intent = "absent" | "today" | "total";

const ABSENT_RE =
  /(absent|not\s+(come|came|attend|attended|present)|(didn'?t|haven'?t|hasn'?t)\s+(come|came|attend|attended|show)|missed|nahi\s*aa|nahin\s*aa|nhi\s*aa|gayab|नहीं\s*आ|नही\s*आ|अनुपस्थित|गैर\s*हाज़?िर)/i;
const TODAY_RE = /(today|aaj|\bpresent\b|\bcame\b|attended|आज|उपस्थित)/i;
const TOTAL_RE =
  /(how\s*many|kitne|kitni|total|member|customer|list|count|कितने|मेंबर|मेम्बर|सदस्य|ग्राहक)/i;

function detectIntent(text: string): Intent | null {
  if (ABSENT_RE.test(text)) return "absent";
  if (TODAY_RE.test(text)) return "today";
  if (TOTAL_RE.test(text)) return "total";
  return null;
}

const OWNER_ONLY_CMDS = new Set([
  "ADD",
  "TODAY",
  "CUSTOMERS",
  "ABSENT",
  "STATS",
  "SUMMARY",
]);

/** Returns reply messages for an incoming WhatsApp text. `phone` is E.164 (+...). */
export async function handleText(
  phone: string,
  text: string,
): Promise<string[]> {
  const [c, ...rest] = text.trim().split(/\s+/);
  const cmd = (c ?? "").toUpperCase(),
    arg = rest.join(" ");
  const owner = (
    await q("select gym_id from owners where phone=$1", [phone])
  )[0];

  if (owner) {
    const gym = await getGym(owner.gym_id);
    try {
      if (cmd === "ADD") {
        const p = parseAdd(text);
        if (!p) return [ADD_USAGE];
        const cu = await addCustomer(gym, p.name, p.phone);
        return [
          `${head("✅", "Member added")}\n👤 *${cu.name}*\n📞 ${cu.phone}\n🏋️ ${gym.name}\n\nThey can check in with:\n\`\`\`CHECKIN ${gym.gym_code}\`\`\``,
        ];
      }
      if (cmd === "TODAY") return await todayText(gym);
      if (cmd === "CUSTOMERS") {
        const r = await listCustomers(gym.id, "", "active");
        return chunk([
          `${head("📋", "Active customers")}\nTotal: *${r.length}*\n`,
          ...r.map(
            (x, i) => `${i + 1}. *${x.name}*  ·  _${x.last_visit ?? "never"}_`,
          ),
        ]);
      }
      if (cmd === "ABSENT") return await absentText(gym);
      if (cmd === "STATS" || cmd === "SUMMARY") return await statsText(gym);
      if ((cmd === "HISTORY" || cmd === "PROGRESS") && arg) {
        const f = await findCustomers(gym, arg);
        if (f.length !== 1)
          return [
            f.length
              ? `⚠️ ${f.length} matches found. Please use the phone number.`
              : "⚠️ No customer found.",
          ];
        return [await historyText(f[0].name, f[0].id, gym.timezone)];
      }
      if (cmd === "HELP") return [M.helpOwner];

      // Free-form questions, e.g. "how many members", "who is absent today"
      if (cmd !== "CHECKIN") {
        const intent = detectIntent(text);
        if (intent === "absent") return await absentText(gym);
        if (intent === "today") return await todayText(gym);
        if (intent === "total") return await totalMembersText(gym);
      }
    } catch (e) {
      if (e instanceof AppError) return [e.message];
      throw e;
    }
  }

  if (cmd === "CHECKIN") {
    const gym = (
      await q("select id from gyms where gym_code=$1", [arg.toUpperCase()])
    )[0];
    const cu =
      gym &&
      (
        await q("select * from customers where gym_id=$1 and phone=$2", [
          gym.id,
          phone,
        ])
      )[0];
    if (!cu) return [M.notRegistered];
    if (cu.status !== "active") return [M.inactive];
    const g = await getGym(gym.id),
      r = await checkIn(g, cu.id);
    if (!r.created)
      return [M.already(r.time), await monthCalendar(cu.id, g.timezone)];
    const out = [
      M.checkedIn(cu.name, r.progress.thisMonth, r.progress.currentStreak),
    ];
    if (r.milestone) out.push(M.milestone(cu.name, r.progress.total));
    out.push(await monthCalendar(cu.id, g.timezone));
    out.push(`🔗 *Full progress:*\n${base()}/p/${cu.progress_token}`);
    return out;
  }
  if (cmd === "HISTORY" || cmd === "PROGRESS") {
    const cu = (
      await q(
        "select * from customers where phone=$1 and status='active' order by created_at limit 1",
        [phone],
      )
    )[0];
    if (!cu) return [M.notRegistered];
    const g = await getGym(cu.gym_id);
    return [
      await historyText(cu.name, cu.id, g.timezone),
      await monthCalendar(cu.id, g.timezone),
      ...(cmd === "PROGRESS"
        ? [`🔗 *Your progress page:*\n${base()}/p/${cu.progress_token}`]
        : []),
    ];
  }

  if (cmd === "HELP") return [owner ? M.helpOwner : M.helpCustomer];

  // Not an owner: block owner-only commands and owner-type questions.
  if (!owner && (OWNER_ONLY_CMDS.has(cmd) || detectIntent(text) !== null))
    return [M.ownerOnly];

  return [M.unknown];
}
