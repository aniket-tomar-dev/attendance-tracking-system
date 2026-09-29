import { useQuery } from "@tanstack/react-query";
import { BASE, api } from "../api";
import { Btn, Card, ErrorBox, Loading } from "../ui";

export default function GymPage() {
  const { data: g, isLoading, error } = useQuery({ queryKey: ["gym"], queryFn: () => api("/gym") });
  if (isLoading) return <Loading />; if (error) return <ErrorBox error={error} />;
  return <div className="space-y-4">
    <h1 className="text-2xl font-bold">Gym & QR</h1>
    <Card><dl className="grid grid-cols-2 gap-2 text-sm"><dt className="text-slate-500">Name</dt><dd>{g.name}</dd><dt className="text-slate-500">Gym code</dt><dd className="font-mono">{g.gym_code}</dd>
      <dt className="text-slate-500">WhatsApp number</dt><dd>{g.whatsapp_number}</dd><dt className="text-slate-500">Timezone</dt><dd>{g.timezone}</dd></dl></Card>
    <Card className="flex flex-col items-center gap-3">
      <img src={`${BASE}/gym/qr`} alt="Check-in QR code" className="h-64 w-64" />
      <p className="text-center text-sm text-slate-500">Print and display this at the gym. Members scan it to check in on WhatsApp.</p>
      <div className="flex gap-2 print:hidden"><a href={`${BASE}/gym/qr`} download="gym-qr.png"><Btn>Download</Btn></a><Btn className="!bg-slate-700" onClick={() => window.print()}>Print</Btn></div>
    </Card>
  </div>;
}
