import { FormEvent, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { customerSchema } from "@gym/shared";
import { api, send } from "../api";
import { ErrorBox } from "../ui";

const TINTS = [
  "bg-emerald-100 text-emerald-700",
  "bg-sky-100 text-sky-700",
  "bg-amber-100 text-amber-700",
  "bg-violet-100 text-violet-700",
  "bg-rose-100 text-rose-700",
  "bg-teal-100 text-teal-700",
];
const initials = (name: string) =>
  (name ?? "?")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("") || "?";
const tint = (name: string) => {
  let h = 0;
  for (const ch of name ?? "") h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return TINTS[h % TINTS.length];
};

const STATUSES = [
  { key: "", label: "All" },
  { key: "active", label: "Active" },
  { key: "inactive", label: "Inactive" },
];

const focus =
  "focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-50";
const field =
  "w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-sm text-zinc-900 shadow-sm outline-none transition placeholder:text-zinc-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10";

function AddModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const m = useMutation({
    mutationFn: (b: unknown) => send("POST", "/customers", b),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["customers"] });
      onClose();
    },
  });
  const [local, setLocal] = useState<string | null>(null);

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const v = customerSchema.safeParse(
      Object.fromEntries(new FormData(e.currentTarget)),
    );
    if (!v.success) return setLocal(v.error.issues[0].message);
    setLocal(null);
    m.mutate(v.data);
  };

  return (
    <div
      className="fixed inset-0 z-20 flex items-end justify-center bg-zinc-900/40 p-4 backdrop-blur-sm sm:items-center"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl shadow-zinc-900/10">
        <div className="mb-5 flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-zinc-900">
              Add customer
            </h2>
            <p className="text-sm text-zinc-500">
              They'll get a WhatsApp message on check-in.
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-full p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
          >
            <svg
              className="h-4 w-4"
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="m5 5 10 10M15 5 5 15" />
            </svg>
          </button>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-zinc-700">Name</span>
            <input
              name="name"
              placeholder="e.g. Rahul Sharma"
              autoFocus
              className={field}
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-zinc-700">Phone</span>
            <input
              name="phone"
              placeholder="WhatsApp number"
              inputMode="tel"
              className={field}
            />
          </label>

          {local ? <ErrorBox error={new Error(local)} /> : null}
          {m.isError ? <ErrorBox error={m.error} /> : null}

          <div className="flex gap-2 pt-1">
            <button
              disabled={m.isPending}
              className={`flex-1 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-60 ${focus}`}
            >
              {m.isPending ? "Saving…" : "Save customer"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className={`rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 ${focus}`}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Customers() {
  const [search, setSearch] = useState(""),
    [status, setStatus] = useState(""),
    [open, setOpen] = useState(false);
  const { data, isLoading, error } = useQuery({
    queryKey: ["customers", search, status],
    queryFn: () =>
      api<any[]>(
        `/customers?search=${encodeURIComponent(search)}&status=${status}`,
      ),
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-emerald-700">Members</p>
          <h1 className="mt-0.5 text-3xl font-semibold tracking-tight text-zinc-900">
            Customers
          </h1>
        </div>
        <button
          onClick={() => setOpen(true)}
          className={`flex items-center gap-1.5 rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-zinc-800 ${focus}`}
        >
          <svg
            className="h-4 w-4"
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <path d="M10 4v12M4 10h12" />
          </svg>
          Add customer
        </button>
      </header>

      {/* Search + status */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <svg
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400"
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <circle cx="9" cy="9" r="6" />
            <path d="m14 14 4 4" />
          </svg>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name or phone"
            aria-label="Search customers"
            className={`${field} pl-10`}
          />
        </div>
        <div
          className="flex gap-1 rounded-xl border border-zinc-200 bg-white p-1 shadow-sm"
          role="group"
          aria-label="Filter by status"
        >
          {STATUSES.map((s) => (
            <button
              key={s.key}
              onClick={() => setStatus(s.key)}
              aria-pressed={status === s.key}
              className={`flex-1 rounded-lg px-3.5 py-1.5 text-sm font-medium transition sm:flex-none ${focus} ${
                status === s.key
                  ? "bg-zinc-900 text-white"
                  : "text-zinc-500 hover:text-zinc-900"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <section className="overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-sm shadow-zinc-900/[0.03]">
        {isLoading ? (
          <div className="space-y-4 p-5">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="flex animate-pulse items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-zinc-100" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-1/3 rounded bg-zinc-100" />
                  <div className="h-3 w-1/4 rounded bg-zinc-100" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="p-5">
            <ErrorBox error={error} />
          </div>
        ) : !data?.length ? (
          <div className="px-5 py-14 text-center">
            <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-zinc-100 text-zinc-400">
              <svg
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
              </svg>
            </div>
            <p className="text-sm text-zinc-500">
              {search || status
                ? "No customers match your filters."
                : "No customers yet. Add your first one."}
            </p>
            {!search && !status && (
              <button
                onClick={() => setOpen(true)}
                className="mt-2 text-sm font-medium text-emerald-700 hover:underline"
              >
                Add customer
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between border-b border-zinc-100 bg-zinc-50/60 px-5 py-2.5 text-xs text-zinc-500">
              <span>
                {data.length} {data.length === 1 ? "customer" : "customers"}
              </span>
              <span className="hidden sm:block">
                Last visit · Days attended
              </span>
            </div>
            <ul className="divide-y divide-zinc-100">
              {data.map((c) => (
                <li key={c.id}>
                  <Link
                    to={`/customers/${c.id}`}
                    className="flex items-center gap-3 px-5 py-3.5 transition hover:bg-zinc-50/70"
                  >
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${tint(c.name)}`}
                    >
                      {initials(c.name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium text-zinc-900">
                        {c.name}
                      </div>
                      <div className="truncate text-sm text-zinc-500">
                        {c.phone}
                      </div>
                    </div>
                    <div className="hidden text-right text-sm text-zinc-500 sm:block">
                      <div>{c.last_visit ?? "–"}</div>
                      <div className="text-xs tabular-nums text-zinc-400">
                        {c.total} days
                      </div>
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ring-1 ring-inset ${
                        c.status === "active"
                          ? "bg-emerald-50 text-emerald-700 ring-emerald-600/15"
                          : "bg-zinc-100 text-zinc-500 ring-zinc-500/10"
                      }`}
                    >
                      {c.status}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      {open && <AddModal onClose={() => setOpen(false)} />}
    </div>
  );
}
