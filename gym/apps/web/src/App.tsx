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

function Layout() {
  const qc = useQueryClient();
  const me = useQuery({ queryKey: ["me"], queryFn: () => api("/auth/me") });
  if (me.isLoading) return <Loading />;
  if (me.isError) return <Navigate to="/login" replace />;
  const link = ({ isActive }: { isActive: boolean }) => `block rounded-lg px-3 py-2 text-center md:text-left ${isActive ? "bg-emerald-100 font-semibold text-emerald-800" : "text-slate-600"}`;
  const nav = [["/", "Today"], ["/customers", "Customers"], ["/gym", "Gym & QR"]];
  return (
    <div className="min-h-screen md:flex">
      <aside className="fixed inset-x-0 bottom-0 z-10 flex justify-around border-t bg-white p-2 md:static md:block md:w-56 md:border-r md:border-t-0 md:p-4">
        <div className="hidden pb-4 font-bold md:block">{me.data.gym.name}</div>
        {nav.map(([to, l]) => <NavLink key={to} to={to} end={to === "/"} className={link}>{l}</NavLink>)}
        <button className="hidden w-full px-3 py-2 text-left text-slate-500 md:block" onClick={async () => { await send("POST", "/auth/logout"); qc.clear(); location.href = "/login"; }}>Log out</button>
      </aside>
      <main className="mx-auto w-full max-w-4xl flex-1 p-4 pb-24 md:pb-4"><Outlet /></main>
    </div>
  );
}
export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} /><Route path="/register" element={<Register />} /><Route path="/p/:token" element={<Public />} />
      <Route element={<Layout />}><Route index element={<Today />} /><Route path="customers" element={<Customers />} /><Route path="customers/:id" element={<Detail />} /><Route path="gym" element={<GymPage />} /></Route>
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}
