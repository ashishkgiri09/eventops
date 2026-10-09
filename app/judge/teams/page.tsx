"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, CheckCircle2, Clock, Scale } from "lucide-react";
import { KPICard } from "@/components/ui/KPICard";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/Badge";
import { evaluationApi, judgesApi } from "@/lib/api";
import { teamsApi } from "@/lib/api/teams";
import { useAppStore } from "@/store";
import { EvaluationItem, Judge, Team } from "@/types";

export default function JudgeAssignedTeamsPage() {
  const router = useRouter();
  const { currentEvent, currentUser } = useAppStore();
  const [judge, setJudge] = useState<Judge | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [evaluations, setEvaluations] = useState<EvaluationItem[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    if (!currentEvent?.id || !currentUser?.id) { setJudge(null); setTeams([]); setEvaluations([]); return; }
    setLoading(true); setError("");
    Promise.all([judgesApi.getAll(currentEvent.id), teamsApi.getAll(currentEvent.id)]).then(async ([judges, allTeams]) => {
      // Judge records are matched only by the authenticated account ID; never show another judge's queue.
      const match = judges.find((item) => item.id === currentUser.id) || null;
      if (!match) { if (active) { setJudge(null); setTeams([]); setEvaluations([]); } return; }
      const assignedIds = new Set([...(match.assignedTeams || []), ...allTeams.filter((team) => team.assignedJudges?.includes(match.id)).map((team) => team.id)]);
      const assigned = allTeams.filter((team) => assignedIds.has(team.id));
      const results = await evaluationApi.getByJudge(match.id);
      if (active) { setJudge(match); setTeams(assigned); setEvaluations(results); }
    }).catch((reason) => { if (active) setError(reason instanceof Error ? reason.message : "Could not load judge assignments."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [currentEvent?.id, currentUser?.id]);

  const completed = evaluations.filter((item) => item.status === "SUBMITTED" || item.status === "LOCKED");
  return <div className="space-y-6">
    <div className="flex flex-wrap justify-between items-start gap-4"><div>
      <div className="flex items-center gap-2"><span className="font-mono text-xs text-amber-400 font-bold uppercase">Judge evaluation queue</span>{judge && <StatusBadge status={judge.workloadStatus} />}</div>
      <h2 className="text-xl font-bold text-white mt-1">Assigned teams</h2>
      <p className="text-xs text-slate-400">{currentEvent?.name || "Select an event to view assignments."}{judge ? ` · ${judge.name}` : ""}</p>
    </div><Button variant="outline" size="sm" onClick={() => router.push("/judge/history")}>Evaluation History</Button></div>
    {error && <p role="alert" className="p-3 rounded-lg border border-rose-500/30 text-rose-300">Backend data could not be loaded: {error}</p>}
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <KPICard title="Assigned queue" value={loading ? "—" : teams.length} subtitle="Teams assigned to your judge account" icon={<Scale className="w-4 h-4 text-indigo-400" />} />
      <KPICard title="Completed" value={loading ? "—" : completed.length} subtitle="Submitted or locked evaluations" accentColor="emerald" icon={<CheckCircle2 className="w-4 h-4 text-emerald-400" />} />
      <KPICard title="Pending" value={loading ? "—" : Math.max(0, teams.length - completed.length)} subtitle="Awaiting evaluation" accentColor="amber" icon={<Clock className="w-4 h-4 text-amber-400" />} />
    </div>
    {loading ? <p className="text-sm text-slate-400">Loading assignments…</p> : !currentEvent?.id ? <Empty text="Select an event to view its judge queue." /> : !judge ? <Empty text="No judge profile is linked to this signed-in account for the selected event." /> : teams.length === 0 ? <Empty text="No teams have been assigned to you for this event yet." /> : <div className="space-y-3">{teams.map((team) => {
      const evaluation = evaluations.find((item) => item.teamId === team.id);
      const isCompleted = evaluation?.status === "SUBMITTED" || evaluation?.status === "LOCKED";
      return <div key={team.id} className="p-5 rounded-2xl border border-slate-800 bg-slate-900/80 flex flex-col sm:flex-row justify-between gap-4">
        <div><div className="flex items-center gap-2"><span className="font-mono text-xs font-bold text-indigo-400">{team.id}</span><span className="font-semibold text-slate-100">{team.name}</span><StatusBadge status={isCompleted ? "SUBMITTED" : "PENDING"} /></div><p className="text-xs text-slate-400 mt-1">{team.project?.title || "No project title provided"}</p><p className="text-[11px] text-slate-500 mt-1">Round {team.currentRound}{team.assignedVenueName || team.assignedVenue ? ` · ${team.assignedVenueName || team.assignedVenue}` : ""}{team.assignedBench ? ` · ${team.assignedBench}` : ""}</p></div>
        <div className="flex items-center gap-3">{isCompleted && <div className="text-right"><span className="text-[10px] text-slate-500 block">Recorded score</span><span className="font-bold text-emerald-400">{evaluation?.totalScore}</span></div>}<Button size="sm" variant={isCompleted ? "outline" : "primary"} onClick={() => router.push(`/judge/evaluation/${team.id}`)} rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>{isCompleted ? "Review rubric" : "Start evaluation"}</Button></div>
      </div>;
    })}</div>}
  </div>;
}

function Empty({ text }: { text: string }) { return <div className="p-8 text-center rounded-2xl border border-slate-800 bg-slate-900/70 text-sm text-slate-400">{text}</div>; }
