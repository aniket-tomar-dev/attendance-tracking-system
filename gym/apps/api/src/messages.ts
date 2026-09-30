import type { Progress } from "@gym/shared";
export const M = {
  checkedIn: (n: string, monthCount: number, streak: number) =>
    `Checked in, ${n}! Day ${monthCount} this month. ${streak}-day streak.`,
  milestone: (n: string, total: number) =>
    `${total} days completed! Real consistency, ${n}.`,
  already: (time: string) => `You're already checked in today (${time}).`,
  notRegistered:
    "We couldn't find your number. Please ask the gym owner to add you.",
  inactive: "Your membership is inactive. Please contact the gym owner.",
  unknown: "Didn't get that. Send HELP.",
  ownerOnly:
    "This information is only available to the gym owner.\nयह जानकारी सिर्फ़ gym owner के लिए है।",
  progress: (n: string, p: Progress) =>
    `${n}: ${p.total} total days, ${p.thisMonth} this month, ${p.currentStreak}-day streak (best ${p.longestStreak}). Last visit: ${p.lastVisit ?? "never"}.`,
  helpOwner:
    'Commands:\nADD <name> <phone>\nTODAY\nCUSTOMERS\nABSENT\nSTATS\nHISTORY <name or phone>\nPROGRESS <name or phone>\n\nYou can also ask:\n"how many members"\n"aaj kitne aaye"\n"kitne nahi aaye"',
  helpCustomer: "Commands:\nCHECKIN <GYM_CODE>\nHISTORY\nPROGRESS",
};
export function calendar(year: number, month: number, days: number[]): string {
  const names = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const total = new Date(year, month + 1, 0).getDate();
  const set = new Set(days);
  const rows: string[] = [];
  for (let start = 1; start <= total; start += 7) {
    const cells: string[] = [];
    for (let d = start; d < start + 7 && d <= total; d++) {
      cells.push(set.has(d) ? "✅" : "▫️");
    }
    rows.push(cells.join(" ") + `  (${start}-${Math.min(start + 6, total)})`);
  }
  return `📅 *${names[month]} ${year}*\n${rows.join("\n")}\n\n✅ = Come, ▫️ = Don't come`;
}
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
