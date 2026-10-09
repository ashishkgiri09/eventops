"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { QRCard } from "@/components/ui/QRCard";
import { teamsApi } from "@/lib/api/teams";
import { Team } from "@/types";

export default function TeamQrPage() {
  const params = useParams<{ teamId: string }>();
  const [team, setTeam] = useState<Team | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    teamsApi.getById(params.teamId).then((value) => { if (active) setTeam(value || null); })
      .catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : "Could not load this registration."); });
    return () => { active = false; };
  }, [params.teamId]);

  return <div className="max-w-md mx-auto space-y-6">
    <div className="flex items-center gap-3"><Link href={`/teams/${params.teamId}`} className="p-2 rounded-lg border border-slate-800 bg-slate-900 text-slate-400 hover:text-white"><ArrowLeft className="w-4 h-4" /></Link><div><h2 className="text-xl font-bold text-white">Digital EventPass</h2><p className="text-xs text-slate-400">Live registration token for event check-in.</p></div></div>
    {error && <p role="alert" className="text-sm text-rose-300">{error}</p>}
    {team?.qrCodeToken ? <QRCard teamId={team.id} teamName={team.name} tokenId={team.qrCodeToken} venueName={team.assignedVenueName || team.assignedVenue} benchLabel={team.assignedBench} /> : !error && <p className="text-sm text-slate-400 text-center">Loading registration pass…</p>}
  </div>;
}
