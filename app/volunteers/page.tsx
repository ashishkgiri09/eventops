"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, Clock, HeartHandshake, Play, Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { DataTable, Column } from "@/components/ui/DataTable";
import { KPICard } from "@/components/ui/KPICard";
import { StatusBadge } from "@/components/ui/Badge";
import { volunteersApi } from "@/lib/api";
import { useAppStore } from "@/store";
import { Volunteer, VolunteerTask, TaskStatus } from "@/types";

export default function VolunteersPage() {
  const router = useRouter();
  const { currentRole, currentEvent, currentUser } = useAppStore();
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [tasks, setTasks] = useState<VolunteerTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!currentEvent?.id) { setVolunteers([]); setTasks([]); return; }
    setLoading(true); setError("");
    try {
      const [roster, taskList] = await Promise.all([volunteersApi.getAll(currentEvent.id), volunteersApi.getTasks(currentEvent.id)]);
      setVolunteers(roster); setTasks(taskList);
    } catch (reason: unknown) { setError(String(reason)); }
    finally { setLoading(false); }
  }, [currentEvent?.id]);

  useEffect(() => { void load(); }, [load]);

  const myTasks = useMemo(() => tasks.filter((task) => task.assignedVolunteerId === currentUser?.id), [tasks, currentUser?.id]);
  const advanceTask = async (task: VolunteerTask) => {
    const next: Record<TaskStatus, TaskStatus> = { ASSIGNED: "ACCEPTED", ACCEPTED: "IN_PROGRESS", IN_PROGRESS: "COMPLETED", COMPLETED: "COMPLETED" };
    try { await volunteersApi.updateTaskStatus(task.id, next[task.status]); await load(); }
    catch (reason: unknown) { setError(String(reason)); }
  };

  const columns: Column<Volunteer>[] = [
    { key: "name", header: "Staff / Volunteer", sortable: true, render: (v) => <div><div className="font-semibold text-slate-100">{v.name}</div><div className="text-[11px] text-slate-500">{v.email}</div></div> },
    { key: "role", header: "Operations role", sortable: true, render: (v) => <span>{v.role}</span> },
    { key: "zone", header: "Assigned zone", render: (v) => <span>{v.zone || "—"}</span> },
    { key: "status", header: "Duty status", sortable: true, render: (v) => <StatusBadge status={v.status} /> },
    { key: "tasks", header: "Tasks completed", render: (v) => <span>{v.completedTasksCount} / {v.assignedTasksCount}</span> },
    { key: "actions", header: "Profile", render: (v) => <Button size="sm" variant="outline" onClick={() => router.push(`/volunteers/${v.id}`)}>View</Button> },
  ];

  if (currentRole === "VOLUNTEER") return <div className="space-y-6">
    <div><h2 className="text-xl font-bold text-white">My volunteer tasks</h2><p className="text-sm text-slate-400 mt-1">{currentEvent?.name || "Select an event to view assigned tasks."}</p></div>
    {error && <Error text={error} />}
    <div className="grid sm:grid-cols-3 gap-4"><KPICard title="My assigned tasks" value={loading ? "—" : myTasks.length} icon={<HeartHandshake className="w-4 h-4 text-teal-400" />} /><KPICard title="In progress" value={loading ? "—" : myTasks.filter((t) => t.status === "IN_PROGRESS").length} icon={<Clock className="w-4 h-4 text-amber-400" />} /><KPICard title="Completed" value={loading ? "—" : myTasks.filter((t) => t.status === "COMPLETED").length} icon={<CheckCircle className="w-4 h-4 text-emerald-400" />} /></div>
    {loading ? <p className="text-sm text-slate-400">Loading tasks…</p> : !currentEvent?.id ? <Empty text="Select an event to view volunteer tasks." /> : myTasks.length === 0 ? <Empty text="No tasks are assigned to this account for the selected event." /> : <div className="space-y-3">{myTasks.map((task) => <div key={task.id} className="p-4 rounded-xl border border-slate-800 bg-slate-900/80 flex flex-wrap items-center justify-between gap-4"><div><div className="font-semibold text-white">{task.title}</div><div className="text-xs text-slate-400 mt-1">{task.zone} · {task.priority} · Due {task.dueTime}</div><div className="mt-2"><StatusBadge status={task.status} /></div></div>{task.status !== "COMPLETED" && <Button size="sm" variant="primary" onClick={() => void advanceTask(task)} rightIcon={<Play className="w-3.5 h-3.5" />}>{task.status === "ASSIGNED" ? "Accept task" : task.status === "ACCEPTED" ? "Start task" : "Mark done"}</Button>}</div>)}</div>}
  </div>;

  const onDuty = volunteers.filter((v) => v.status === "ON_DUTY").length;
  return <div className="space-y-6">
    <div className="flex flex-wrap items-center justify-between gap-4"><div><h2 className="text-xl font-bold text-white">Volunteer & field staff</h2><p className="text-sm text-slate-400 mt-1">Roster and task records for {currentEvent?.name || "the selected event"}.</p></div><div className="flex gap-2"><Button variant="outline" onClick={() => router.push("/volunteers/tasks")}>Task board</Button><Button variant="primary" leftIcon={<Plus className="w-4 h-4" />} onClick={() => router.push("/volunteers/create")}>Enroll volunteer</Button></div></div>
    {error && <Error text={error} />}
    <div className="grid sm:grid-cols-3 gap-4"><KPICard title="Total roster" value={loading ? "—" : volunteers.length} subtitle="For this event" icon={<HeartHandshake className="w-4 h-4 text-indigo-400" />} /><KPICard title="On duty" value={loading ? "—" : onDuty} subtitle="Current duty status" accentColor="emerald" icon={<CheckCircle className="w-4 h-4 text-emerald-400" />} /><KPICard title="Event tasks" value={loading ? "—" : tasks.length} subtitle="Recorded in task board" accentColor="sky" icon={<Clock className="w-4 h-4 text-sky-400" />} /></div>
    {loading ? <p className="text-sm text-slate-400">Loading event roster…</p> : !currentEvent?.id ? <Empty text="Select an event to view its volunteer roster." /> : volunteers.length === 0 ? <Empty text="No volunteers have been enrolled for this event yet." /> : <DataTable data={volunteers} columns={columns} keyExtractor={(v) => v.id} searchPlaceholder="Search volunteers by name, zone, or role…" searchFilter={(v, q) => v.name.toLowerCase().includes(q) || v.role.toLowerCase().includes(q) || (v.zone || "").toLowerCase().includes(q)} />}
  </div>;
}

function Empty({ text }: { text: string }) { return <div className="p-8 text-center rounded-2xl border border-slate-800 bg-slate-900/70 text-sm text-slate-400">{text}</div>; }
function Error({ text }: { text: string }) { return <p role="alert" className="p-3 rounded-lg border border-rose-500/30 text-rose-300">Backend data could not be loaded: {text}</p>; }
