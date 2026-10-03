import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BASE, api } from "../api";
import { ErrorBox, Loading } from "../ui";

const focus =
  "focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-50";
const card =
  "rounded-2xl border border-zinc-200/80 bg-white shadow-sm shadow-zinc-900/[0.03]";

export default function GymPage() {
  const {
    data: g,
    isLoading,
    error,
  } = useQuery({ queryKey: ["gym"], queryFn: () => api("/gym") });
  const [copied, setCopied] = useState(false);

  if (isLoading) return <Loading />;
  if (error) return <ErrorBox error={error} />;

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(g.gym_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  };

  const details: {
    label: string;
    value: string;
    mono?: boolean;
    copy?: boolean;
  }[] = [
    { label: "Name", value: g.name },
    { label: "Gym code", value: g.gym_code, mono: true, copy: true },
    { label: "WhatsApp number", value: g.whatsapp_number },
    { label: "Timezone", value: g.timezone },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="print:hidden">
        <p className="text-sm font-medium text-emerald-700">Check-in setup</p>
        <h1 className="mt-0.5 text-3xl font-semibold tracking-tight text-zinc-900">
          Gym &amp; QR
        </h1>
      </header>

      <div className="grid gap-6 md:grid-cols-5">
        {/* QR card */}
        <section
          className={`${card} flex flex-col items-center gap-5 p-6 md:col-span-3`}
        >
          <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
            <img
              src={`${BASE}/gym/qr`}
              alt="Check-in QR code"
              className="h-64 w-64"
            />
          </div>
          <div className="text-center">
            <h2 className="font-semibold text-zinc-900">Scan to check in</h2>
            <p className="mt-1 max-w-xs text-sm text-zinc-500">
              Print and display this at the gym. Members scan it to check in on
              WhatsApp.
            </p>
          </div>
          <div className="flex gap-2 print:hidden">
            <a
              href={`${BASE}/gym/qr`}
              download="gym-qr.png"
              className={`flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-emerald-700 ${focus}`}
            >
              <svg
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
              </svg>
              Download
            </a>
            <button
              onClick={() => window.print()}
              className={`flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 shadow-sm transition hover:bg-zinc-50 ${focus}`}
            >
              <svg
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v8H6v-8Z" />
              </svg>
              Print
            </button>
          </div>
        </section>

        {/* Details card */}
        <section
          className={`${card} self-start p-2 md:col-span-2 print:hidden`}
        >
          <h2 className="px-4 pb-1 pt-3 text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Gym details
          </h2>
          <dl className="divide-y divide-zinc-100">
            {details.map((d) => (
              <div
                key={d.label}
                className="flex items-center justify-between gap-3 px-4 py-3"
              >
                <div className="min-w-0">
                  <dt className="text-xs text-zinc-500">{d.label}</dt>
                  <dd
                    className={`truncate text-sm font-medium text-zinc-900 ${d.mono ? "font-mono" : ""}`}
                  >
                    {d.value}
                  </dd>
                </div>
                {d.copy && (
                  <button
                    onClick={copyCode}
                    aria-label="Copy gym code"
                    className={`shrink-0 rounded-lg border border-zinc-200 px-2.5 py-1 text-xs font-medium transition ${focus} ${
                      copied
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : "text-zinc-600 hover:bg-zinc-50"
                    }`}
                  >
                    {copied ? "Copied" : "Copy"}
                  </button>
                )}
              </div>
            ))}
          </dl>
        </section>
      </div>
    </div>
  );
}
