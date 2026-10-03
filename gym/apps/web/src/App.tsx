import { useQuery, useQueryClient } from "@tanstack/react-query";
import { NavLink, Navigate, Outlet, Route, Routes } from "react-router-dom";
import { api, send } from "./api";
import { Loading } from "./ui";
import { Login, Register } from "./pages/Auth";
import Today from "./pages/Today";
import Customers from "./pages/Customers";
import Detail from "./pages/Detail";
import GymPage from "./pages/Gym";
import Public from "./pages/Public";

const Icon = ({ d }: { d: string }) => (
  <svg
    className="h-5 w-5 shrink-0"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d={d} />
  </svg>
);

const ICONS = {
  today:
    "M8 2v4M16 2v4M3 9h18M5 4h14a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Zm4 11 2 2 4-4",
  customers:
    "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm13 10v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75",
  gym: "M3 3h7v7H3V3Zm11 0h7v7h-7V3ZM3 14h7v7H3v-7Zm11 3h3m4 0h0m-7 4h7m-3-7v3",
  logout: "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4m7 14 5-5-5-5m5 5H9",
};

function Layout() {
  const qc = useQueryClient();
  const me = useQuery({ queryKey: ["me"], queryFn: () => api("/auth/me") });
  if (me.isLoading) return <Loading />;
  if (me.isError || !me.data?.gym) return <Navigate to="/login" replace />;

  const link = ({ isActive }: { isActive: boolean }) =>
    `flex flex-col items-center gap-1 rounded-xl px-4 py-1.5 text-[11px] font-medium transition md:flex-row md:gap-3 md:px-3 md:py-2.5 md:text-sm ${
      isActive
        ? "text-emerald-700 md:bg-zinc-900 md:text-white md:shadow-sm"
        : "text-zinc-500 hover:text-zinc-900 md:hover:bg-zinc-100"
    }`;

  const nav: [string, string, keyof typeof ICONS][] = [
    ["/", "Today", "today"],
    ["/customers", "Customers", "customers"],
    ["/gym", "Gym & QR", "gym"],
  ];

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 md:flex">
      <aside className="fixed inset-x-0 bottom-0 z-10 flex justify-around border-t border-zinc-200 bg-white/90 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur md:sticky md:top-0 md:h-screen md:w-64 md:shrink-0 md:flex-col md:justify-start md:gap-1 md:border-r md:border-t-0 md:bg-white md:p-4 md:backdrop-blur-none">
        <div className="hidden items-center gap-3 px-2 pb-6 pt-1 md:flex">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm shadow-emerald-600/30">
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z" />
            </svg>
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold tracking-tight">
              {me.data.gym.name}
            </div>
            <div className="text-xs text-zinc-400">Fit Pulse</div>
          </div>
        </div>

        {nav.map(([to, label, icon]) => (
          <NavLink key={to} to={to} end={to === "/"} className={link}>
            <Icon d={ICONS[icon]} />
            {label}
          </NavLink>
        ))}

        <button
          className="mt-auto hidden items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-zinc-500 transition hover:bg-rose-50 hover:text-rose-600 md:flex"
          onClick={async () => {
            await send("POST", "/auth/logout");
            qc.clear();
            location.href = "/login";
          }}
        >
          <Icon d={ICONS.logout} />
          Log out
        </button>
      </aside>

      <main className="mx-auto w-full max-w-4xl flex-1 px-4 pb-28 pt-6 md:px-8 md:pb-10 md:pt-10">
        <Outlet />
      </main>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/p/:token" element={<Public />} />
      <Route element={<Layout />}>
        <Route index element={<Today />} />
        <Route path="customers" element={<Customers />} />
        <Route path="customers/:id" element={<Detail />} />
        <Route path="gym" element={<GymPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}
