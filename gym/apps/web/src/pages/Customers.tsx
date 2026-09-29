import { FormEvent, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { customerSchema } from "@gym/shared";
import { api, send } from "../api";
import { Btn, Card, Empty, ErrorBox, Loading, inputCls } from "../ui";

function AddModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const m = useMutation({ mutationFn: (b: unknown) => send("POST", "/customers", b), onSuccess: () => { qc.invalidateQueries({ queryKey: ["customers"] }); onClose(); } });
  const [local, setLocal] = useState<string | null>(null);
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault(); const v = customerSchema.safeParse(Object.fromEntries(new FormData(e.currentTarget)));
    if (!v.success) return setLocal(v.error.issues[0].message); setLocal(null); m.mutate(v.data);
  };
  return <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/40 p-4"><Card className="w-full max-w-sm">
    <h2 className="mb-3 text-lg font-bold">Add customer</h2>
    <form onSubmit={submit} className="space-y-3">
      <input name="name" placeholder="Name" className={inputCls} /><input name="phone" placeholder="Phone" className={inputCls} />
      {local ? <ErrorBox error={new Error(local)} /> : null}{m.isError ? <ErrorBox error={m.error} /> : null}
      <div className="flex gap-2"><Btn disabled={m.isPending}>Save</Btn><button type="button" onClick={onClose} className="px-4 text-slate-600">Cancel</button></div>
    </form></Card></div>;
}
export default function Customers() {
  const [search, setSearch] = useState(""), [status, setStatus] = useState(""), [open, setOpen] = useState(false);
  const { data, isLoading, error } = useQuery({ queryKey: ["customers", search, status], queryFn: () => api<any[]>(`/customers?search=${encodeURIComponent(search)}&status=${status}`) });
  return <div className="space-y-4">
    <div className="flex items-center justify-between"><h1 className="text-2xl font-bold">Customers</h1><Btn onClick={() => setOpen(true)}>+ Add</Btn></div>
    <div className="flex gap-2"><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name or phone" className={inputCls} />
      <select value={status} onChange={(e) => setStatus(e.target.value)} className={inputCls + " w-32"}><option value="">All</option><option value="active">Active</option><option value="inactive">Inactive</option></select></div>
    <Card className="overflow-x-auto p-0">
      {isLoading ? <Loading /> : error ? <ErrorBox error={error} /> : !data?.length ? <Empty text="No customers yet. Add your first one." /> :
        <table className="w-full text-left text-sm"><thead className="border-b bg-slate-50 text-slate-500"><tr><th className="p-3">Name</th><th>Phone</th><th>Status</th><th>Last visit</th><th>Days</th></tr></thead>
          <tbody>{data.map((c) => <tr key={c.id} className="border-b last:border-0"><td className="p-3 font-medium"><Link to={`/customers/${c.id}`}>{c.name}</Link></td><td>{c.phone}</td>
            <td><span className={c.status === "active" ? "text-emerald-700" : "text-slate-400"}>{c.status}</span></td><td>{c.last_visit ?? "–"}</td><td>{c.total}</td></tr>)}</tbody></table>}
    </Card>
    {open && <AddModal onClose={() => setOpen(false)} />}
  </div>;
}
