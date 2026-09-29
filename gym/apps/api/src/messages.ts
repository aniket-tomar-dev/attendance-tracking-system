import type { Progress } from "@gym/shared";
export const M = {
  checkedIn: (n: string, monthCount: number, streak: number) => `Checked in, ${n}! Day ${monthCount} this month. ${streak}-day streak.`,
  milestone: (n: string, total: number) => `${total} days completed! Real consistency, ${n}.`,
  already: (time: string) => `You're already checked in today (${time}).`,
  notRegistered: "We couldn't find your number. Please ask the gym owner to add you.",
  inactive: "Your membership is inactive. Please contact the gym owner.",
  unknown: "Didn't get that. Send HELP.",
  progress: (n: string, p: Progress) => `${n}: ${p.total} total days, ${p.thisMonth} this month, ${p.currentStreak}-day streak (best ${p.longestStreak}). Last visit: ${p.lastVisit ?? "never"}.`,
  helpOwner: "Commands:\nADD <name> <phone>\nTODAY\nCUSTOMERS\nABSENT\nHISTORY <name or phone>\nPROGRESS <name or phone>",
  helpCustomer: "Commands:\nCHECKIN <GYM_CODE>\nHISTORY\nPROGRESS",
};
export function chunk(lines: string[], max = 3800): string[] {
  const out: string[] = []; let cur = "";
  for (const l of lines) { if ((cur + "\n" + l).length > max && cur) { out.push(cur); cur = l; } else cur = cur ? cur + "\n" + l : l; }
  if (cur) out.push(cur);
  return out.length ? out : ["(none)"];
}
