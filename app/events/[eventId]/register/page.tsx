"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { AlertCircle, ArrowRight, CheckCircle2, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { QRCard } from "@/components/ui/QRCard";
import { publicRegistrationApi, PublicRegistrationInfo, PublicRegistrationResult } from "@/lib/api/public-registration";

export default function PublicEventRegistrationPage() {
  const params = useParams<{ eventId: string }>();
  const eventId = params.eventId;
  const [event, setEvent] = useState<PublicRegistrationInfo | null>(null);
  const [result, setResult] = useState<PublicRegistrationResult | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [teamName, setTeamName] = useState("");
  const [teammates, setTeammates] = useState("");
  const [projectTitle, setProjectTitle] = useState("");
  const [projectAbstract, setProjectAbstract] = useState("");
  const [domain, setDomain] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    let active = true;
    publicRegistrationApi.getInfo(eventId).then((data) => { if (active) setEvent(data); })
      .catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : "This registration link is unavailable."); })
      .finally(() => { if (active) setLoading(false); });
    setLoading(true);
    return () => { active = false; };
  }, [eventId]);

  const submit = async (formEvent: FormEvent) => {
    formEvent.preventDefault(); setSending(true); setError("");
    try {
      const isTeam = event?.registrationKind === "team";
      if (isTeam && password !== confirmPassword) throw new Error("Passwords do not match.");
      const registration = await publicRegistrationApi.register(eventId, isTeam
        ? { name: teamName.trim(), leadName: name.trim(), leadEmail: email.trim(), password, members: teammates.split("\n").map((line, index) => line.trim()).filter(Boolean).map((line, index) => { const [memberName, memberEmail = ""] = line.split(",").map((part) => part.trim()); return { id: `member-${index + 1}`, name: memberName, email: memberEmail, role: "MEMBER" }; }), project: { title: projectTitle.trim(), abstract: projectAbstract.trim(), domain: domain.trim(), techStack: [] } }
        : { name: name.trim(), email: email.trim() });
      setResult(registration);
    } catch (reason: unknown) { setError(reason instanceof Error ? reason.message : "Registration could not be completed."); }
    finally { setSending(false); }
  };

  if (result) return <main className="min-h-screen bg-slate-950 text-slate-100 p-5 sm:p-10"><div className="max-w-4xl mx-auto space-y-6"><div className="text-center"><CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" /><h1 className="text-2xl font-bold mt-3">Registration received</h1><p className="text-sm text-slate-400 mt-2">{result.kind === "team" ? "Use your registration email and password to sign in. Save your QR pass for event check-in." : "Save this pass for event check-in and keep the private portal link safe."}</p></div><div className="grid md:grid-cols-2 gap-6 items-start"><QRCard teamId={result.id} teamName={result.name} tokenId={result.qrCodeToken} /><section className="rounded-2xl border border-slate-800 bg-slate-900 p-6 space-y-4"><h2 className="font-semibold text-white">Your event portal</h2><p className="text-sm text-slate-400">After organizer allocation is approved, your assigned judges and event updates will appear here.</p>{result.kind === "team" ? <Link href={`/student/login?eventId=${encodeURIComponent(eventId)}`} className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white">Sign in with email and password <ArrowRight className="w-4 h-4" /></Link> : <Link href={`/student/portal?token=${encodeURIComponent(result.qrCodeToken)}`} className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white">Open attendee portal <ArrowRight className="w-4 h-4" /></Link>}<p className="text-xs text-amber-300">Keep private portal links safe. Anyone with a pass link can view that registration.</p></section></div></div></main>;

  return <main className="min-h-screen bg-slate-950 text-slate-100 p-5 sm:p-10"><div className="max-w-xl mx-auto"><header className="text-center mb-7"><div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600 font-bold">EO</div><h1 className="text-2xl font-bold mt-3">{event?.name || "Event registration"}</h1><p className="text-sm text-slate-400 mt-2">{event?.description || "Complete this form to register for the event."}</p>{event?.startDate && <p className="text-xs text-indigo-300 mt-2">{new Date(event.startDate).toLocaleString()}</p>}<p className="mt-3 text-xs text-slate-500">Already registered? <Link href={`/student/login?eventId=${encodeURIComponent(eventId)}`} className="text-indigo-300 hover:text-indigo-200 underline">Sign in to the student portal</Link></p></header>
    {loading && <p className="text-center text-sm text-slate-400">Loading event registration…</p>}
    {error && <div role="alert" className="mb-4 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300"><AlertCircle className="inline w-4 h-4 mr-2" />{error}</div>}
    {event && !event.registrationOpen && <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-5 text-center text-amber-200">{event.registrationMessage}</div>}
    {event?.registrationOpen && <form onSubmit={submit} className="rounded-2xl border border-slate-800 bg-slate-900 p-6 space-y-4"><h2 className="text-lg font-semibold">{event.registrationKind === "team" ? "Student / team registration" : "Attendee registration"}</h2><Input label={event.registrationKind === "team" ? "Team lead name" : "Full name"} value={name} onChange={(e) => setName(e.target.value)} required /><Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />{event.registrationKind === "team" && <><Input label="Team name" value={teamName} onChange={(e) => setTeamName(e.target.value)} required /><Textarea label="Teammates (one per line: full name, email)" value={teammates} onChange={(e) => setTeammates(e.target.value)} /><Input label="Project title" value={projectTitle} onChange={(e) => setProjectTitle(e.target.value)} required /><Input label="Project domain" value={domain} onChange={(e) => setDomain(e.target.value)} required /><Textarea label="Project summary" value={projectAbstract} onChange={(e) => setProjectAbstract(e.target.value)} /><Input label="Create password (minimum 10 characters)" type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={10} autoComplete="new-password" required /><Input label="Confirm password" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} minLength={10} autoComplete="new-password" required /></>}<Button type="submit" variant="primary" size="lg" className="w-full" isLoading={sending}>Submit registration</Button><p className="text-[11px] text-slate-500">{event.registrationKind === "team" ? "Use the team lead email and password later to sign in to the student portal." : "This registers you for the event and does not create an organizer account."}</p></form>}
  </div></main>;
}
