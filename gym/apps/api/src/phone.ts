/** Normalize to E.164. Returns null if invalid. */
export function normalizePhone(raw: string, cc = "+91"): string | null {
  const t = raw.trim(), d = t.replace(/\D/g, ""), c = cc.replace(/\D/g, "");
  let full: string;
  if (t.startsWith("+")) full = d;
  else if (d.startsWith("00")) full = d.slice(2);
  else if (d.length === 10) full = c + d;
  else if (d.length === 11 && d.startsWith("0")) full = c + d.slice(1);
  else full = d;
  return full.length >= 8 && full.length <= 15 ? "+" + full : null;
}
