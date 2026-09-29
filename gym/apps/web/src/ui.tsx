import { ButtonHTMLAttributes, ReactNode } from "react";
import type { Day, Progress } from "@gym/shared";
export const inputCls = "w-full rounded-lg border border-slate-300 bg-white px-3 py-2";
export const Btn = ({ className = "", ...p }: ButtonHTMLAttributes<HTMLButtonElement>) =>
  <button {...p} className={`rounded-lg bg-emerald-600 px-4 py-2 font-medium text-white hover:bg-emerald-700 disabled:opacity-50 ${className}`} />;
export const Card = ({ children, className = "" }: { children: ReactNode; className?: string }) =>
  <div className={`rounded-xl border border-slate-200 bg-white p-4 ${className}`}>{children}</div>;
export const Loading = () => <p className="p-6 text-slate-500">Loading…</p>;
export const ErrorBox = ({ error }: { error: unknown }) => <p className="rounded-lg bg-red-50 p-3 text-red-700">{(error as Error)?.message ?? "Something went wrong"}</p>;
export const Empty = ({ text }: { text: string }) => <p className="p-6 text-center text-slate-500">{text}</p>;
export function Stats({ p }: { p: Progress }) {
  const items = [["Total days", p.total], ["This month", p.thisMonth], ["Streak", p.currentStreak], ["Best streak", p.longestStreak]];
  return <div className="grid grid-cols-2 gap-3 md:grid-cols-4">{items.map(([l, v]) => <Card key={l}><div className="text-2xl font-bold">{v}</div><div className="text-sm text-slate-500">{l}</div></Card>)}</div>;
}
export const Strip = ({ days }: { days: Day[] }) =>
  <div className="flex flex-wrap gap-1">{days.map((d) => <div key={d.date} title={d.date} className={`h-6 w-6 rounded ${d.present ? "bg-emerald-500" : "bg-slate-200"}`} />)}</div>;
