export const BASE: string = import.meta.env.VITE_API_URL || "/api";
export async function api<T = any>(path: string, opts: RequestInit = {}): Promise<T> {
  const r = await fetch(BASE + path, { credentials: "include", headers: { "Content-Type": "application/json" }, ...opts });
  if (r.status === 204) return undefined as T;
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error?.message || "Request failed");
  return j;
}
export const send = <T = any>(method: string, path: string, body?: unknown) => api<T>(path, { method, body: body === undefined ? undefined : JSON.stringify(body) });
