"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { authApi } from "@/lib/api/auth";
import { useAppStore } from "@/store";
import { WorkspaceCategory } from "@/types";
import { ArrowRight, Eye, EyeOff, GraduationCap, BriefcaseBusiness, PartyPopper, AlertCircle } from "lucide-react";

const contexts: { id: WorkspaceCategory; title: string; description: string; icon: React.ReactNode; tone: string }[] = [
  { id: "INSTITUTIONAL", title: "College & School", description: "Fests, hackathons, competitions", icon: <GraduationCap className="h-5 w-5" />, tone: "indigo" },
  { id: "CORPORATE", title: "Corporate Events", description: "Conferences, summits, launches", icon: <BriefcaseBusiness className="h-5 w-5" />, tone: "sky" },
  { id: "PERSONAL", title: "Personal Events", description: "Celebrations, meetups, workshops", icon: <PartyPopper className="h-5 w-5" />, tone: "amber" },
];

export default function LoginPage() {
  const router = useRouter();
  const { setCurrentUser, setWorkspaceCategory } = useAppStore();
  const [category, setCategory] = useState<WorkspaceCategory>("INSTITUTIONAL");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Enter a valid email address.");
      return;
    }
    if (!password) {
      setError("Enter your password.");
      return;
    }
    setBusy(true);
    try {
      const response = await authApi.login(email.trim(), password);
      setWorkspaceCategory(category);
      setCurrentUser(response.user);
      if (["JUDGE", "PARTICIPANT", "TECHNICAL_STAFF", "RESOURCE_MANAGER", "VOLUNTEER"].includes(response.user.role)) {
        const homes: Record<string, string> = { JUDGE: "/judge", PARTICIPANT: "/participant", TECHNICAL_STAFF: "/technical-staff", RESOURCE_MANAGER: "/resource-manager", VOLUNTEER: "/volunteers" };
        router.push(homes[response.user.role]);
      } else {
        router.push("/workspace");
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Sign-in failed. Check your details and try again.");
    } finally {
      setBusy(false);
    }
  };

  const selected = contexts.find((item) => item.id === category)!;

  return (
    <div className="w-full max-w-2xl rounded-3xl border border-slate-800 bg-slate-900/95 p-6 sm:p-8 shadow-2xl space-y-6">
      <header className="text-center space-y-2">
        <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600 text-xl font-bold text-white shadow-lg shadow-indigo-500/25">EO</div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Welcome to EVENTOPS</h1>
        <p className="text-xs uppercase tracking-widest text-indigo-400">Run the event, not the paperwork.</p>
      </header>

      <section className="space-y-3" aria-labelledby="context-title">
        <div>
          <h2 id="context-title" className="text-sm font-semibold text-white">What kind of event are you managing?</h2>
          <p className="text-xs text-slate-400 mt-1">We’ll open the matching workspace after sign-in.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {contexts.map((item) => {
            const active = item.id === category;
            return (
              <button key={item.id} type="button" aria-pressed={active} onClick={() => { setCategory(item.id); setError(""); }}
                className={`rounded-2xl border p-3.5 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 ${active ? "border-indigo-400 bg-indigo-500/10 ring-1 ring-indigo-400/30" : "border-slate-800 bg-slate-950/60 hover:border-slate-600"}`}>
                <span className={`mb-2 inline-flex h-9 w-9 items-center justify-center rounded-xl ${active ? "bg-indigo-500/20 text-indigo-300" : "bg-slate-800 text-slate-400"}`}>{item.icon}</span>
                <span className="block text-xs font-semibold text-white">{item.title}</span>
                <span className="mt-1 block text-[11px] leading-4 text-slate-400">{item.description}</span>
              </button>
            );
          })}
        </div>
      </section>

      {error && <div role="alert" className="flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300"><AlertCircle className="h-4 w-4 shrink-0" />{error}</div>}

      <form onSubmit={submit} className="space-y-4">
        <Input label="Email" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required />
        <Input label="Password" type={showPassword ? "text" : "password"} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required
          rightIcon={<button type="button" aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword((value) => !value)} className="text-slate-400 hover:text-white">{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>} />
        <div className="flex justify-end text-xs"><Link href="/forgot-password" className="text-indigo-400 hover:text-indigo-300">Forgot password?</Link></div>
        <Button type="submit" variant="primary" size="lg" className="w-full" isLoading={busy} rightIcon={<ArrowRight className="h-4 w-4" />}>Continue to {selected.title}</Button>
      </form>

      <p className="text-center text-xs text-slate-400">New to EVENTOPS? <Link href="/register" className="font-semibold text-indigo-400 hover:text-indigo-300">Create account</Link></p>
    </div>
  );
}
