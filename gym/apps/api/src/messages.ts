import type { Progress } from "@gym/shared";

const LINE = "━━━━━━━━━━━━━━";
export const head = (icon: string, title: string) =>
  `${icon} *${title}*\n${LINE}`;

export const M = {
  checkedIn: (n: string, monthCount: number, streak: number) =>
    `${head("✅", "Checked in!")}\nWelcome, *${n}* 💪\n\n📅 Day *${monthCount}* this month\n🔥 Streak: *${streak}* days`,
  milestone: (n: string, total: number) =>
    `${head("🎉", "Milestone unlocked!")}\n*${total} days* completed, ${n}.\nReal consistency. Keep going! 🏆`,
  already: (time: string) =>
    `${head("ℹ️", "Already checked in")}\nYou checked in today at *${time}*.`,
  notRegistered: `${head("⚠️", "Number not found")}\nWe couldn't find your number.\nPlease ask the gym owner to add you.`,
  inactive: `${head("⚠️", "Membership inactive")}\nPlease contact the gym owner.`,
  unknown: "🤔 Didn't get that.\nSend *HELP* to see what I can do.",
  ownerOnly: `${head("🔒", "Owner only")}\nThis information is only available to the gym owner.\nयह जानकारी सिर्फ़ gym owner के लिए है।`,
  progress: (n: string, p: Progress) =>
    `${head("📈", n)}\n🏋️ Total days: *${p.total}*\n📅 This month: *${p.thisMonth}*\n🔥 Streak: *${p.currentStreak}* days (best ${p.longestStreak})\n🕒 Last visit: ${p.lastVisit ?? "never"}`,
  helpOwner: `${head("🏋️", "Owner commands")}\n➕ *ADD* <name> <phone>\n🟢 *TODAY*  – today's check-ins\n🔴 *ABSENT*  – who didn't come\n📋 *CUSTOMERS*  – active list\n📊 *STATS*  – quick summary\n📈 *HISTORY* <name/phone>\n📈 *PROGRESS* <name/phone>\n💳 *DUE*  – fees due list\n🔔 *REMIND* <name/phone>\n✅ *PAID* <name/phone>\n\n💬 *You can also ask:*\n_how many members_\n_aaj kitne aaye_\n_kitne nahi aaye_`,
  helpCustomer: `${head("🏋️", "Commands")}\n✅ *CHECKIN* <GYM_CODE>\n📈 *HISTORY*\n📈 *PROGRESS*\n💳 *PAY*  – pay by UPI QR\n💵 *CASH*  – pay at the gym`,
};

/** Same signature as before. Weekday-aligned; attended days shown as [12]. */
export function calendar(year: number, month: number, days: number[]): string {
  const names = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  const total = new Date(year, month + 1, 0).getDate();
  const offset = (new Date(year, month, 1).getDay() + 6) % 7; // Monday first
  const set = new Set(days);
  const cell = (d: number) =>
    set.has(d)
      ? `[${String(d).padStart(2, "0")}]`
      : ` ${String(d).padStart(2, " ")} `;

  const rows: string[] = ["Mo  Tu  We  Th  Fr  Sa  Su"];
  let line = "    ".repeat(offset);
  for (let d = 1; d <= total; d++) {
    line += cell(d);
    if ((offset + d) % 7 === 0 || d === total) {
      rows.push(line.trimEnd());
      line = "";
    }
  }
  return `${head("📅", `${names[month]} ${year}`)}\n\`\`\`${rows.join("\n")}\`\`\`\n✅ Attended: *${set.size}* days  _( [ ] = visited )_`;
}

/** Unchanged logic. */
export function chunk(lines: string[], max = 3800): string[] {
  const out: string[] = [];
  let cur = "";
  for (const l of lines) {
    if ((cur + "\n" + l).length > max && cur) {
      out.push(cur);
      cur = l;
    } else cur = cur ? cur + "\n" + l : l;
  }
  if (cur) out.push(cur);
  return out.length ? out : ["(none)"];
}
