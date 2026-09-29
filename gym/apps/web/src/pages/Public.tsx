import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { api } from "../api";
import { Card, ErrorBox, Loading, Stats, Strip } from "../ui";

export default function Public() {
  const { token } = useParams();
  const { data, isLoading, error } = useQuery({ queryKey: ["public", token], queryFn: () => api(`/public/progress/${token}`) });
  if (isLoading) return <Loading />; if (error) return <div className="p-4"><ErrorBox error={error} /></div>;
  const left = data.nextMilestone - data.progress.total;
  return <div className="mx-auto max-w-2xl space-y-4 p-4">
    <div><h1 className="text-2xl font-bold">{data.name}</h1><p className="text-slate-500">{data.gym}</p></div>
    <Stats p={data.progress} />
    <Card><p className="font-medium">{left} more day{left === 1 ? "" : "s"} to your {data.nextMilestone}-day milestone</p></Card>
    <Card><h2 className="mb-2 font-semibold">Last 30 days</h2><Strip days={data.days} /></Card>
  </div>;
}
