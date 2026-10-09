"use client";

import { FormEvent, Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { AlertCircle, ArrowRight } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { publicRegistrationApi } from "@/lib/api/public-registration";

export default function StudentLoginPage() {
  return <Suspense fallback={<main className="min-h-screen bg-slate-950" />}><StudentLoginForm /></Suspense>;
}

function StudentLoginForm() {
  const router = useRouter();
  const search = useSearchParams();
  const eventId = search.get("eventId") || undefined;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSending(true);
    setError("");
    try {
      const result = await publicRegistrationApi.studentLogin(email.trim(), password, eventId);
      router.replace(`/student/portal?token=${encodeURIComponent(result.token)}`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not sign in. Check your email and password.");
    } finally {
      setSending(false);
    }
  }

  return <main className="min-h-screen bg-slate-950 text-slate-100 p-5 grid place-items-center"><div className="w-full max-w-md"><header className="text-center mb-7"><div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600 font-bold">EO</div><h1 className="text-2xl font-bold mt-3">Student portal sign in</h1><p className="text-sm text-slate-400 mt-2">Use the email and password you created during team registration.</p></header><form onSubmit={submit} className="rounded-2xl border border-slate-800 bg-slate-900 p-6 space-y-4"><Input label="Team lead email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required /><Input label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />{error && <div role="alert" className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300"><AlertCircle className="inline w-4 h-4 mr-2" />{error}</div>}<Button type="submit" variant="primary" size="lg" className="w-full" isLoading={sending}>Sign in</Button><p className="text-center text-xs text-slate-500">Not registered yet? Ask the organizer for this event’s registration link.</p></form><div className="mt-4 text-center"><Link href="/login" className="inline-flex items-center gap-1 text-xs text-indigo-300 hover:text-indigo-200">Organizer and staff sign in <ArrowRight className="w-3 h-3" /></Link></div></div></main>;
}
