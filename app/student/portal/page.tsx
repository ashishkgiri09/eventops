"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useRouter } from "next/navigation";
import { AlertCircle, CalendarDays, MapPin, Scale, Trophy } from "lucide-react";
import { QRCard } from "@/components/ui/QRCard";
import { publicRegistrationApi, StudentPortalData } from "@/lib/api/public-registration";

export default function StudentPortalPage() {
  const router = useRouter();
  const search = useSearchParams();
  const token = search.get("token") || "";
  const [data, setData] = useState<StudentPortalData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    if (!token) { setError("This portal link is missing its private access token."); setLoading(false); return; }
    publicRegistrationApi.getStudentPortal(token).then((value) => { if (active) setData(value); })
      .catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : "Could not load your participant portal."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [token]);

  if (loading) return <main className="min-h-screen bg-slate-950 text-slate-300 grid place-items-center">Loading your private event portal…</main>;
  if (error || !data) return <main className="min-h-screen bg-slate-950 text-slate-100 grid place-items-center p-6"><div className="max-w-md rounded-2xl border border-rose-500/30 bg-rose-500/10 p-6 text-center"><AlertCircle className="w-8 h-8 text-rose-400 mx-auto" /><p className="mt-3">{error || "Registration not found."}</p></div></main>;
  const registration = data.registration;
  const judges = registration.assignedJudges || [];
  return <main className="min-h-screen bg-slate-950 text-slate-100 p-5 sm:p-10"><div className="max-w-5xl mx-auto space-y-6"><header className="flex items-start justify-between gap-4"><div><div className="text-xs text-indigo-300 font-mono uppercase">EVENTOPS · Participant Portal</div><h1 className="text-2xl sm:text-3xl font-bold mt-2">{data.event.name}</h1><p className="text-sm text-slate-400 mt-1">Private view for {registration.name} · {registration.id}</p></div><button type="button" onClick={() => router.replace("/student/login")} className="rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-300 hover:bg-slate-800">Sign out</button></header><div className="grid lg:grid-cols-[1fr_320px] gap-6 items-start"><section className="space-y-4"><div className="rounded-2xl border border-slate-800 bg-slate-900 p-5"><h2 className="font-semibold">Registration & event details</h2><div className="mt-4 grid sm:grid-cols-2 gap-3 text-sm"><Info icon={<CalendarDays />} label="Event date" value={data.event.startDate ? new Date(data.event.startDate).toLocaleString() : "To be announced"} /><Info icon={<MapPin />} label="Location" value={data.event.location || "To be announced"} /><Info icon={<Trophy />} label="Registration status" value={registration.registrationStatus || "Registered"} /><Info icon={<Scale />} label="Check-in" value={registration.checkInStatus || "Not checked in"} /></div>{registration.project?.title && <div className="mt-4 border-t border-slate-800 pt-4"><p className="text-xs text-slate-500">Project</p><p className="font-medium mt-1">{registration.project.title}</p><p className="text-sm text-slate-400 mt-1">{registration.project.abstract}</p></div>}</div><div className="rounded-2xl border border-indigo-500/20 bg-indigo-500/5 p-5"><h2 className="font-semibold">Judge allocation</h2>{judges.length ? <><p className="text-sm text-slate-400 mt-1">Your allocation is approved. Your assigned judges are:</p><ul className="mt-3 space-y-2">{judges.map((judge) => <li key={judge} className="rounded-lg bg-slate-900 px-3 py-2 text-sm">{judge}</li>)}</ul></> : <p className="text-sm text-slate-400 mt-2">Judges will appear here after the organizer approves the event allocation.</p>}{registration.assignedVenueName || registration.assignedVenue ? <p className="text-sm mt-3">Venue: {registration.assignedVenueName || registration.assignedVenue}{registration.assignedBench ? ` · ${registration.assignedBench}` : ""}</p> : null}{registration.totalScore !== undefined && <p className="text-sm mt-3">Current score: {registration.totalScore}{registration.rank ? ` · Rank ${registration.rank}` : ""}</p>}</div></section><QRCard teamId={registration.id} teamName={registration.name} tokenId={registration.qrCodeToken} venueName={registration.assignedVenueName || registration.assignedVenue} benchLabel={registration.assignedBench} /></div><p className="text-xs text-amber-300">Keep this URL private. Your access token is part of the link.</p></div></main>;
}

function Info({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) { return <div className="rounded-lg bg-slate-950 p-3"><span className="flex items-center gap-2 text-xs text-slate-500">{icon}{label}</span><p className="text-slate-200 mt-1">{value}</p></div>; }
