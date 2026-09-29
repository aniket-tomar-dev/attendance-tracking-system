import type { Progress, Day } from "@gym/shared";
const dn = (d: string) => Date.parse(d) / 864e5;
export function calcProgress(dates: string[], today: string): Progress {
  const s = [...new Set(dates)].sort();
  let longest = 0, run = 0, prev = NaN;
  for (const d of s) { run = dn(d) - prev === 1 ? run + 1 : 1; longest = Math.max(longest, run); prev = dn(d); }
  const last = s[s.length - 1] ?? null;
  return {
    total: s.length, thisMonth: s.filter((d) => d.startsWith(today.slice(0, 7))).length,
    currentStreak: last && dn(today) - dn(last) <= 1 ? run : 0, longestStreak: longest, lastVisit: last,
  };
}
export function lastDays(today: string, dates: string[], n = 30): Day[] {
  const set = new Set(dates);
  return Array.from({ length: n }, (_, i) => {
    const date = new Date((dn(today) - (n - 1 - i)) * 864e5).toISOString().slice(0, 10);
    return { date, present: set.has(date) };
  });
}
export const nextMilestone = (total: number) => (Math.floor(total / 10) + 1) * 10;
