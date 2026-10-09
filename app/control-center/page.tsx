"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Building, CheckCircle2, HeartHandshake, Scale, Users } from "lucide-react";
import { KPICard } from "@/components/ui/KPICard";
import { Button } from "@/components/ui/Button";
import { attendanceApi, incidentsApi, judgesApi, resourcesApi, venuesApi, volunteersApi } from "@/lib/api";
import { useAppStore } from "@/store";

export default function RealTimeControlCenterPage() {
  const router = useRouter();
  const event = useAppStore((state) => state.currentEvent);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    if (!event?.id) { setData(null); return; }
    setLoading(true); setError("");
    Promise.all([
      attendanceApi.getSummary(event.id), judgesApi.getAll(event.id), venuesApi.getAll(event.id),
      incidentsApi.getAll(event.id), volunteersApi.getAll(event.id), volunteersApi.getTasks(event.id), resourcesApi.getAll(event.id),
    ]).then(([attendance, judges, venues, incidents, volunteers, tasks, resources]) => {
      if (active) setData({ attendance, judges, venues, incidents, volunteers, tasks, resources });
    }).catch((reason) => { if (active) setError(reason instanceof Error ? reason.message : "Could not load event operations."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [event?.id]);

  if (!event?.id) return <Empty title="Select an event" detail="Choose an event to see its operational summary." />;
  const incidents = data?.incidents || [];
  const openIncidents = incidents.filter((item: any) => item.status !== "RESOLVED" && item.status !== "CLOSED");
  const checkedIn = data?.attendance?.checkedIn ?? 0;
  const registered = data?.attendance?.total ?? 0;
  const cards = [
    ["Registered", registered, "Participants / teams", <Users className="w-4 h-4 text-indigo-400" />],
    ["Checked in", checkedIn, "Verified attendance", <CheckCircle2 className="w-4 h-4 text-emerald-400" />],
    ["Judges", data?.judges?.length ?? 0, "Registered for this event", <Scale className="w-4 h-4 text-amber-400" />],
    ["Venues", data?.venues?.length ?? 0, "Configured event spaces", <Building className="w-4 h-4 text-violet-400" />],
    ["Volunteers", data?.volunteers?.length ?? 0, "Event roster", <HeartHandshake className="w-4 h-4 text-sky-400" />],
    ["Open incidents", openIncidents.length, "Unresolved reports", <AlertTriangle className="w-4 h-4 text-rose-400" />],
  ] as const;

  return <div className="space-y-6">
    <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/80 flex flex-wrap items-center justify-between gap-4">
      <div><h2 className="text-2xl font-bold text-white">Event Operations</h2><p className="text-sm text-slate-400 mt-1">Live records for {event.name}</p></div>
      <div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => router.push("/allocation/results")}>Allocation</Button><Button size="sm" variant="primary" onClick={() => router.push("/incidents/create")}>Report incident</Button></div>
    </div>
    {error && <p role="alert" className="p-3 rounded-lg border border-rose-500/30 text-rose-300">Backend data could not be loaded: {error}</p>}
    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">{cards.map(([title, value, subtitle, icon]) => <KPICard key={title} title={title} value={loading ? "—" : value} subtitle={subtitle} icon={icon} />)}</div>
    <section className="p-5 rounded-2xl border border-slate-800 bg-slate-900/70">
      <h3 className="font-semibold text-white">Event records</h3>
      {loading ? <p className="text-sm text-slate-400 mt-3">Loading event records…</p> : <div className="mt-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm text-slate-300">
        <Record label="Attendance" value={`${checkedIn} / ${registered} checked in`} />
        <Record label="Volunteer tasks" value={data?.tasks?.length ?? 0} />
        <Record label="Resources" value={data?.resources?.length ?? 0} />
      </div>}
    </section>
    <section className="p-5 rounded-2xl border border-slate-800 bg-slate-900/70">
      <div className="flex justify-between items-center"><h3 className="font-semibold text-white">Open incidents</h3><button onClick={() => router.push("/incidents")} className="text-sm text-indigo-300">Incident register →</button></div>
      {loading ? <p className="text-sm text-slate-400 mt-3">Loading incidents…</p> : openIncidents.length ? <div className="mt-3 space-y-2">{openIncidents.map((item: any) => <div key={item.id} className="p-3 rounded-lg bg-slate-950 border border-slate-800"><b>{item.title}</b><div className="text-xs text-slate-400 mt-1">{item.location} · {item.status}</div></div>)}</div> : <p className="text-sm text-slate-400 mt-3">No open incidents recorded for this event.</p>}
    </section>
  </div>;
}

function Record({ label, value }: { label: string; value: string | number }) { return <div className="rounded-lg bg-slate-950 p-3"><span className="text-slate-500">{label}</span><div className="font-semibold text-white mt-1">{value}</div></div>; }
function Empty({ title, detail }: { title: string; detail: string }) { return <div className="p-10 text-center rounded-2xl border border-slate-800 bg-slate-900/70"><h2 className="text-xl font-semibold text-white">{title}</h2><p className="text-sm text-slate-400 mt-2">{detail}</p></div>; }
