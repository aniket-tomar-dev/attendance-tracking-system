import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api } from "../api";

type Tab = "present" | "absent";
type Slot = "all" | "morning" | "afternoon" | "evening";
type Sort = "latest" | "earliest" | "name";

const SLOTS: { key: Slot; label: string }[] = [
  { key: "all", label: "All day" },
  { key: "morning", label: "Morning" },
  { key: "afternoon", label: "Afternoon" },
  { key: "evening", label: "Evening" },
];

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

/** Accepts "05:24 PM", "5:24 pm" or "17:24". Returns minutes since midnight, or null. */
function toMinutes(t?: string): number | null {
  const m = /(\d{1,2}):(\d{2})\s*(am|pm)?/i.exec(t ?? "");
  if (!m) return null;
  let h = Number(m[1]);
  const mins = Number(m[2]);
  const ap = m[3]?.toLowerCase();
  if (ap === "pm" && h < 12) h += 12;
  if (ap === "am" && h === 12) h = 0;
  return h * 60 + mins;
}

function slotOf(t?: string): Exclude<Slot, "all"> | null {
  const m = toMinutes(t);
  if (m === null) return null;
  if (m < 12 * 60) return "morning";
  if (m < 17 * 60) return "afternoon";
  return "evening";
}

const cap = (s: string) => s[0].toUpperCase() + s.slice(1);
const waLink = (phone?: string) =>
  `https://wa.me/${(phone ?? "").replace(/\D/g, "")}`;

const focus =
  "focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-50";
const card =
  "rounded-2xl border border-zinc-200/80 bg-white shadow-sm shadow-zinc-900/[0.03]";

const RING_R = 42;
const RING_C = 2 * Math.PI * RING_R;

export default function Today() {
  const [tab, setTab] = useState<Tab>("present");
  const [search, setSearch] = useState("");
  const [slot, setSlot] = useState<Slot>("all");
  const [sort, setSort] = useState<Sort>("latest");

  const present = useQuery({
    queryKey: ["today"],
    queryFn: () => api<any[]>("/attendance/today"),
    refetchInterval: 30_000,
  });
  const absent = useQuery({
    queryKey: ["absent"],
    queryFn: () => api<any[]>("/attendance/absent"),
    refetchInterval: 30_000,
  });
  const cur = tab === "present" ? present : absent;

  const presentCount = present.data?.length ?? 0;
  const absentCount = absent.data?.length ?? 0;
  const total = presentCount + absentCount;
  const rate = total ? Math.round((presentCount / total) * 100) : 0;

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = [...(cur.data ?? [])];
    if (q)
      list = list.filter((r) =>
        `${r.name ?? ""} ${r.phone ?? ""}`.toLowerCase().includes(q),
      );
    if (tab === "present") {
      if (slot !== "all") list = list.filter((r) => slotOf(r.time) === slot);
      if (sort === "name")
        list.sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""));
      else {
        const dir = sort === "latest" ? -1 : 1;
        list.sort(
          (a, b) => dir * ((toMinutes(a.time) ?? 0) - (toMinutes(b.time) ?? 0)),
        );
      }
    } else {
      list.sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""));
    }
    return list;
  }, [cur.data, search, slot, sort, tab]);

  const filtersActive =
    search.trim() !== "" || (tab === "present" && slot !== "all");
  const clearFilters = () => {
    setSearch("");
    setSlot("all");
  };

  const dateLabel = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const updated = Math.max(
    present.dataUpdatedAt || 0,
    absent.dataUpdatedAt || 0,
  );
  const refreshing = present.isFetching || absent.isFetching;

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-emerald-700">{dateLabel}</p>
          <h1 className="mt-0.5 text-3xl font-semibold tracking-tight text-zinc-900">
            Today
          </h1>
        </div>
        <button
          onClick={() => {
            present.refetch();
            absent.refetch();
          }}
          className={`flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3.5 py-1.5 text-sm text-zinc-600 shadow-sm transition hover:border-zinc-300 hover:text-zinc-900 ${focus}`}
        >
          <span className="relative flex h-2 w-2">
            {refreshing && (
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
            )}
            <span
              className={`relative inline-flex h-2 w-2 rounded-full ${refreshing ? "bg-amber-500" : "bg-emerald-500"}`}
            />
          </span>
          {refreshing
            ? "Updating…"
            : updated
              ? `Updated ${new Date(updated).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}`
              : "Refresh"}
        </button>
      </header>

      {/* Overview */}
      <section
        className={`${card} flex items-center gap-5 p-5 sm:gap-8 sm:p-6`}
      >
        <div className="relative h-28 w-28 shrink-0 sm:h-32 sm:w-32">
          <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
            <circle
              cx="50"
              cy="50"
              r={RING_R}
              fill="none"
              strokeWidth="9"
              className="stroke-zinc-100"
            />
            <circle
              cx="50"
              cy="50"
              r={RING_R}
              fill="none"
              strokeWidth="9"
              strokeLinecap="round"
              className="stroke-emerald-500 transition-all duration-700"
              strokeDasharray={`${(rate / 100) * RING_C} ${RING_C}`}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-semibold tabular-nums text-zinc-900 sm:text-3xl">
              {total ? `${rate}%` : "–"}
            </span>
            <span className="text-[11px] font-medium uppercase tracking-wider text-zinc-400">
              Attendance
            </span>
          </div>
        </div>

        <div className="min-w-0 flex-1 space-y-3">
          <p className="text-sm text-zinc-500">
            {total > 0 ? (
              <>
                <span className="font-semibold text-zinc-900 tabular-nums">
                  {presentCount}
                </span>{" "}
                of <span className="tabular-nums">{total}</span> active members
                have checked in today.
              </>
            ) : (
              "No active members yet."
            )}
          </p>
          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            {(["present", "absent"] as const).map((t) => {
              const active = tab === t;
              const count = t === "present" ? presentCount : absentCount;
              const loaded = (t === "present" ? present : absent).data;
              const isP = t === "present";
              return (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  aria-pressed={active}
                  className={`rounded-xl border px-3.5 py-2.5 text-left transition ${focus} ${
                    active
                      ? isP
                        ? "border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500"
                        : "border-rose-500 bg-rose-50 ring-1 ring-rose-500"
                      : "border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50"
                  }`}
                >
                  <div
                    className={`text-2xl font-semibold tabular-nums ${active ? (isP ? "text-emerald-700" : "text-rose-700") : "text-zinc-900"}`}
                  >
                    {loaded ? count : "–"}
                  </div>
                  <div className="text-xs font-medium text-zinc-500">
                    {isP ? "Checked in" : "Absent"}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Search + filters */}
      <section className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row">
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
              placeholder="Search by name or phone"
              aria-label="Search members"
              className="w-full rounded-xl border border-zinc-200 bg-white py-2.5 pl-10 pr-9 text-sm text-zinc-900 shadow-sm outline-none transition placeholder:text-zinc-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                aria-label="Clear search"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
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
            )}
          </div>
          {tab === "present" && (
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as Sort)}
              aria-label="Sort check-ins"
              className="rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-700 shadow-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
            >
              <option value="latest">Latest first</option>
              <option value="earliest">Earliest first</option>
              <option value="name">Name A–Z</option>
            </select>
          )}
        </div>

        {tab === "present" && (
          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 py-1">
            {SLOTS.map((s) => (
              <button
                key={s.key}
                onClick={() => setSlot(s.key)}
                aria-pressed={slot === s.key}
                className={`whitespace-nowrap rounded-full border px-4 py-1.5 text-sm font-medium transition ${focus} ${
                  slot === s.key
                    ? "border-zinc-900 bg-zinc-900 text-white"
                    : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 hover:text-zinc-900"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        )}
      </section>

      {/* List */}
      <section className={`${card} overflow-hidden`}>
        {cur.isLoading ? (
          <div className="space-y-4 p-5">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex animate-pulse items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-zinc-100" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-1/3 rounded bg-zinc-100" />
                  <div className="h-3 w-1/5 rounded bg-zinc-100" />
                </div>
              </div>
            ))}
          </div>
        ) : cur.isError ? (
          <p className="px-5 py-12 text-center text-sm text-rose-600">
            Couldn't load data. {(cur.error as Error)?.message}
          </p>
        ) : !cur.data?.length ? (
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
                <path d="M20 6 9 17l-5-5" />
              </svg>
            </div>
            <p className="text-sm text-zinc-500">
              {tab === "present"
                ? "No check-ins yet today."
                : "Everyone active has checked in."}
            </p>
          </div>
        ) : !rows.length ? (
          <div className="px-5 py-12 text-center">
            <p className="text-sm text-zinc-500">
              No members match your filters.
            </p>
            <button
              onClick={clearFilters}
              className="mt-2 text-sm font-medium text-emerald-700 hover:underline"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between border-b border-zinc-100 bg-zinc-50/60 px-5 py-2.5 text-xs text-zinc-500">
              <span>
                Showing {rows.length} of {cur.data.length}
              </span>
              {filtersActive && (
                <button
                  onClick={clearFilters}
                  className="font-medium text-emerald-700 hover:underline"
                >
                  Clear filters
                </button>
              )}
            </div>
            <ul className="divide-y divide-zinc-100">
              {rows.map((r: any) => {
                const s = slotOf(r.time);
                return (
                  <li
                    key={r.attendance_id ?? r.id}
                    className="flex items-center gap-3 px-5 py-3.5 transition hover:bg-zinc-50/70"
                  >
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${tint(r.name)}`}
                    >
                      {initials(r.name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <Link
                        className="block truncate font-medium text-zinc-900 hover:text-emerald-700"
                        to={`/customers/${r.customer_id ?? r.id}`}
                      >
                        {r.name}
                      </Link>
                      <div className="truncate text-sm text-zinc-500">
                        {tab === "present"
                          ? s
                            ? cap(s)
                            : "Checked in"
                          : r.phone}
                      </div>
                    </div>
                    {tab === "present" ? (
                      <span className="rounded-lg bg-emerald-50 px-3 py-1 text-sm font-medium tabular-nums text-emerald-700 ring-1 ring-inset ring-emerald-600/15">
                        {r.time}
                      </span>
                    ) : (
                      <div className="flex gap-2">
                        <a
                          href={waLink(r.phone)}
                          target="_blank"
                          rel="noreferrer"
                          aria-label={`WhatsApp ${r.name}`}
                          className="rounded-lg bg-emerald-600 px-3.5 py-1.5 text-sm font-medium text-white shadow-sm transition hover:bg-emerald-700"
                        >
                          WhatsApp
                        </a>
                        <a
                          href={`tel:${r.phone}`}
                          aria-label={`Call ${r.name}`}
                          className="rounded-lg border border-zinc-200 bg-white px-3.5 py-1.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
                        >
                          Call
                        </a>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </section>
    </div>
  );
}
