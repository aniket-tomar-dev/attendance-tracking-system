import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { api, send } from "../api";
import { Btn, Card, Empty, ErrorBox, Loading, Stats, Strip } from "../ui";

export default function Detail() {
  const { id } = useParams(); const qc = useQueryClient();
  const key = ["customer", id];
  const { data, isLoading, error } = useQuery({ queryKey: key, queryFn: () => api(`/customers/${id}`) });
  const refresh = () => { qc.invalidateQueries({ queryKey: key }); qc.invalidateQueries({ queryKey: ["today"] }); qc.invalidateQueries({ queryKey: ["absent"] }); };
  const mark = useMutation({ mutationFn: () => send("POST", `/customers/${id}/attendance`, {}), onSuccess: refresh });
  const del = useMutation({ mutationFn: (aid: string) => send("DELETE", `/attendance/${aid}`), onSuccess: refresh });
  const toggle = useMutation({ mutationFn: (status: string) => send("PATCH", `/customers/${id}`, { status }), onSuccess: refresh });
  const regen = useMutation({ mutationFn: () => send("POST", `/customers/${id}/progress-link/regenerate`), onSuccess: refresh });
  if (isLoading) return <Loading />; if (error) return <ErrorBox error={error} />;
  const { customer: c, progress, days, history } = data;
  const link = `${location.origin}/p/${c.progress_token}`;
  return <div className="space-y-4">
    <div><h1 className="text-2xl font-bold">{c.name}</h1><p className="text-slate-500">{c.phone} · {c.status}</p></div>
    <Stats p={progress} />
    <Card><h2 className="mb-2 font-semibold">Last 30 days</h2><Strip days={days} /></Card>
    <div className="flex flex-wrap gap-2">
      <Btn onClick={() => mark.mutate()} disabled={mark.isPending}>Mark present today</Btn>
      <Btn className="!bg-slate-700" onClick={() => toggle.mutate(c.status === "active" ? "inactive" : "active")}>{c.status === "active" ? "Deactivate" : "Activate"}</Btn>
      <Btn className="!bg-slate-700" onClick={() => navigator.clipboard.writeText(link)}>Copy progress link</Btn>
      <Btn className="!bg-slate-500" onClick={() => confirm("Old link stops working. Continue?") && regen.mutate()}>New link</Btn>
    </div>
    {[mark, del, toggle, regen].map((m, i) => m.isError ? <ErrorBox key={i} error={m.error} /> : null)}
    <Card><h2 className="mb-2 font-semibold">History</h2>
      {!history.length ? <Empty text="No attendance yet." /> : <ul className="divide-y">{history.map((h: any) => <li key={h.id} className="flex items-center justify-between py-2">
        <span>{h.date} <span className="text-sm text-slate-500">{h.time} · {h.source}</span></span>
        <button className="text-sm text-red-600" onClick={() => confirm("Remove this entry?") && del.mutate(h.id)}>Remove</button></li>)}</ul>}
    </Card>
  </div>;
}
