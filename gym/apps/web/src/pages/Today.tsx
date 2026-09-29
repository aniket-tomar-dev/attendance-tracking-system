import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api } from "../api";
import { Card, Empty, ErrorBox, Loading } from "../ui";

export default function Today() {
  const [tab, setTab] = useState<"present" | "absent">("present");
  const present = useQuery({ queryKey: ["today"], queryFn: () => api<any[]>("/attendance/today"), refetchInterval: 30_000 });
  const absent = useQuery({ queryKey: ["absent"], queryFn: () => api<any[]>("/attendance/absent"), refetchInterval: 30_000 });
  const cur = tab === "present" ? present : absent;
  return <div className="space-y-4">
    <h1 className="text-2xl font-bold">Today</h1>
    <div className="grid grid-cols-2 gap-3">
      {(["present", "absent"] as const).map((t) => <button key={t} onClick={() => setTab(t)} className={`rounded-xl border p-4 text-left ${tab === t ? "border-emerald-500 bg-emerald-50" : "bg-white"}`}>
        <div className="text-3xl font-bold">{(t === "present" ? present : absent).data?.length ?? "–"}</div><div className="text-sm capitalize text-slate-500">{t === "present" ? "Checked in" : "Absent"}</div></button>)}
    </div>
    <Card>
      {cur.isLoading ? <Loading /> : cur.isError ? <ErrorBox error={cur.error} /> : !cur.data?.length ? <Empty text={tab === "present" ? "No check-ins yet today." : "Everyone active has checked in."} /> :
        <ul className="divide-y">{cur.data.map((r: any) => <li key={r.attendance_id ?? r.id} className="flex justify-between py-2">
          <Link className="font-medium" to={`/customers/${r.customer_id ?? r.id}`}>{r.name}</Link><span className="text-slate-500">{r.time ?? r.phone}</span></li>)}</ul>}
    </Card>
  </div>;
}
