import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { loginSchema, registerSchema } from "@gym/shared";
import { send } from "../api";
import { Btn, Card, ErrorBox, inputCls } from "../ui";

function Shell({ title, children, alt }: { title: string; children: React.ReactNode; alt: React.ReactNode }) {
  return <div className="mx-auto max-w-md p-4 pt-12"><Card><h1 className="mb-4 text-xl font-bold">{title}</h1>{children}</Card><p className="mt-4 text-center text-sm text-slate-600">{alt}</p></div>;
}
function useSubmit(path: string, schema: { safeParse: (v: any) => any }) {
  const nav = useNavigate(); const [err, setErr] = useState<unknown>(null); const [busy, setBusy] = useState(false);
  return { err, busy, submit: async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault(); setErr(null);
    const v = schema.safeParse(Object.fromEntries(new FormData(e.currentTarget)));
    if (!v.success) return setErr(new Error(v.error.issues.map((i: any) => `${i.path.join(".")}: ${i.message}`).join("; ")));
    setBusy(true);
    try { await send("POST", path, v.data); location.href = "/"; } catch (x) { setErr(x); setBusy(false); }
    void nav;
  } };
}
export function Login() {
  const { err, busy, submit } = useSubmit("/auth/login", loginSchema);
  return <Shell title="Owner login" alt={<>New gym? <Link className="text-emerald-700" to="/register">Register</Link></>}>
    <form onSubmit={submit} className="space-y-3">
      <input name="email" type="email" placeholder="Email" className={inputCls} />
      <input name="password" type="password" placeholder="Password" className={inputCls} />
      {err ? <ErrorBox error={err} /> : null}<Btn disabled={busy} className="w-full">Log in</Btn>
    </form></Shell>;
}
export function Register() {
  const { err, busy, submit } = useSubmit("/auth/register", registerSchema);
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return <Shell title="Register your gym" alt={<>Have an account? <Link className="text-emerald-700" to="/login">Log in</Link></>}>
    <form onSubmit={submit} className="space-y-3">
      <input name="gymName" placeholder="Gym name" className={inputCls} />
      <input name="whatsappNumber" placeholder="Gym WhatsApp number (with country code)" className={inputCls} />
      <div className="flex gap-2"><input name="countryCode" defaultValue="+91" className={inputCls + " w-24"} /><input name="timezone" defaultValue={tz} className={inputCls} /></div>
      <input name="ownerName" placeholder="Your name" className={inputCls} />
      <input name="phone" placeholder="Your WhatsApp phone (for owner commands)" className={inputCls} />
      <input name="email" type="email" placeholder="Email" className={inputCls} />
      <input name="password" type="password" placeholder="Password (min 8)" className={inputCls} />
      {err ? <ErrorBox error={err} /> : null}<Btn disabled={busy} className="w-full">Create gym</Btn>
    </form></Shell>;
}
