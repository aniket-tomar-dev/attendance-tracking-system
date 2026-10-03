import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { loginSchema, registerSchema } from "@gym/shared";
import { send } from "../api";
import { ErrorBox } from "../ui";

const focus =
  "focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-white";
const field =
  "w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-sm text-zinc-900 shadow-sm outline-none transition placeholder:text-zinc-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10";

const PERKS = [
  "Members check in by scanning one QR code",
  "Automatic WhatsApp message after every visit",
  "Milestone messages at 10, 20 days and beyond",
  "Owner commands: TODAY, CUSTOMERS, ABSENT",
];

function Logo({ light = false }: { light?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm shadow-emerald-600/30">
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z" />
        </svg>
      </div>
      <span
        className={`text-lg font-semibold tracking-tight ${light ? "text-white" : "text-zinc-900"}`}
      >
        Fit Pulse
      </span>
    </div>
  );
}

function Shell({
  title,
  subtitle,
  children,
  alt,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  alt: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-white lg:grid lg:grid-cols-2">
      {/* Brand panel */}
      <aside className="relative hidden overflow-hidden bg-zinc-900 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-emerald-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-16 h-96 w-96 rounded-full bg-teal-400/10 blur-3xl" />
        <div className="relative">
          <Logo light />
        </div>
        <div className="relative max-w-md">
          <h2 className="text-4xl font-semibold leading-tight tracking-tight">
            Attendance that runs itself on WhatsApp.
          </h2>
          <ul className="mt-8 space-y-3">
            {PERKS.map((p) => (
              <li
                key={p}
                className="flex items-start gap-3 text-sm text-zinc-300"
              >
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
                  <svg
                    className="h-3 w-3"
                    viewBox="0 0 20 20"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="m4 10 4 4 8-8" />
                  </svg>
                </span>
                {p}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-xs text-zinc-500">
          Simple attendance for gym owners.
        </p>
      </aside>

      {/* Form panel */}
      <main className="flex min-h-screen flex-col justify-center bg-zinc-50 px-5 py-10 sm:px-10 lg:min-h-0 lg:bg-white">
        <div className="mx-auto w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <Logo />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
            {title}
          </h1>
          <p className="mt-1 text-sm text-zinc-500">{subtitle}</p>
          <div className="mt-8">{children}</div>
          <p className="mt-6 text-center text-sm text-zinc-500">{alt}</p>
        </div>
      </main>
    </div>
  );
}

function Field({
  label,
  hint,
  className = "",
  children,
}: {
  label: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={`block space-y-1.5 ${className}`}>
      <span className="text-sm font-medium text-zinc-700">{label}</span>
      {children}
      {hint && <span className="block text-xs text-zinc-400">{hint}</span>}
    </label>
  );
}

function Submit({
  busy,
  children,
}: {
  busy: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      disabled={busy}
      className={`w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-60 ${focus}`}
    >
      {busy ? "Please wait…" : children}
    </button>
  );
}

function useSubmit(path: string, schema: { safeParse: (v: any) => any }) {
  const nav = useNavigate();
  const [err, setErr] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  return {
    err,
    busy,
    submit: async (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setErr(null);
      const v = schema.safeParse(
        Object.fromEntries(new FormData(e.currentTarget)),
      );
      if (!v.success)
        return setErr(
          new Error(
            v.error.issues
              .map((i: any) => `${i.path.join(".")}: ${i.message}`)
              .join("; "),
          ),
        );
      setBusy(true);
      try {
        await send("POST", path, v.data);
        location.href = "/";
      } catch (x) {
        setErr(x);
        setBusy(false);
      }
      void nav;
    },
  };
}

export function Login() {
  const { err, busy, submit } = useSubmit("/auth/login", loginSchema);
  return (
    <Shell
      title="Welcome back"
      subtitle="Log in to your gym dashboard."
      alt={
        <>
          New gym?{" "}
          <Link
            className="font-medium text-emerald-700 hover:underline"
            to="/register"
          >
            Register
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <Field label="Email">
          <input
            name="email"
            type="email"
            placeholder="you@gym.com"
            autoComplete="email"
            className={field}
          />
        </Field>
        <Field label="Password">
          <input
            name="password"
            type="password"
            placeholder="••••••••"
            autoComplete="current-password"
            className={field}
          />
        </Field>
        {err ? <ErrorBox error={err} /> : null}
        <Submit busy={busy}>Log in</Submit>
      </form>
    </Shell>
  );
}

export function Register() {
  const { err, busy, submit } = useSubmit("/auth/register", registerSchema);
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return (
    <Shell
      title="Register your gym"
      subtitle="Set up in a minute. No app to install."
      alt={
        <>
          Have an account?{" "}
          <Link
            className="font-medium text-emerald-700 hover:underline"
            to="/login"
          >
            Log in
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-6">
        <fieldset className="space-y-4">
          <legend className="mb-1 text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Gym
          </legend>
          <Field label="Gym name">
            <input
              name="gymName"
              placeholder="e.g. Iron Temple Fitness"
              className={field}
            />
          </Field>
          <Field
            label="Gym WhatsApp number"
            hint="With country code. Members will message this number."
          >
            <input
              name="whatsappNumber"
              placeholder="919876543210"
              inputMode="tel"
              className={field}
            />
          </Field>
          <div className="flex gap-3">
            <Field label="Code" className="w-24 shrink-0">
              <input name="countryCode" defaultValue="+91" className={field} />
            </Field>
            <Field label="Timezone" className="flex-1">
              <input name="timezone" defaultValue={tz} className={field} />
            </Field>
          </div>
        </fieldset>

        <fieldset className="space-y-4">
          <legend className="mb-1 text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Owner
          </legend>
          <Field label="Your name">
            <input
              name="ownerName"
              placeholder="Full name"
              autoComplete="name"
              className={field}
            />
          </Field>
          <Field
            label="Your WhatsApp phone"
            hint="Used for owner commands like TODAY and ABSENT."
          >
            <input
              name="phone"
              placeholder="Your number"
              inputMode="tel"
              autoComplete="tel"
              className={field}
            />
          </Field>
          <Field label="Email">
            <input
              name="email"
              type="email"
              placeholder="you@gym.com"
              autoComplete="email"
              className={field}
            />
          </Field>
          <Field label="Password" hint="Minimum 8 characters.">
            <input
              name="password"
              type="password"
              placeholder="••••••••"
              autoComplete="new-password"
              className={field}
            />
          </Field>
        </fieldset>

        {err ? <ErrorBox error={err} /> : null}
        <Submit busy={busy}>Create gym</Submit>
      </form>
    </Shell>
  );
}
