"use client";

import React, { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { organizationsApi } from "@/lib/api/organizations";
import { useAppStore } from "@/store";
import { AlertCircle, ArrowLeft, ArrowRight, Building2, CheckCircle2, KeyRound } from "lucide-react";

function JoinOrganizationForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [code, setCode] = useState(searchParams.get("code") || "");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [joinedName, setJoinedName] = useState("");
  const { setCurrentOrganization, setCurrentRole } = useAppStore();

  const handleJoin = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!code.trim()) return;
    setBusy(true);
    setError("");
    try {
      const result = await organizationsApi.joinWithCode(code.trim());
      if (!result.success) throw new Error(result.message || "This invitation could not be accepted.");
      setCurrentOrganization(result.organization);
      setCurrentRole(result.role);
      setJoinedName(result.organization.name);
      router.push("/workspace");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not accept this invitation.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={handleJoin} className="mx-auto w-full max-w-lg space-y-5 rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl sm:p-8">
      <Link href="/workspace" className="inline-flex items-center gap-2 text-xs text-indigo-400 hover:text-indigo-300"><ArrowLeft className="h-3.5 w-3.5" /> Back to workspace</Link>
      <div className="space-y-2">
        <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/20 bg-indigo-500/10 px-3 py-1 text-xs text-indigo-300"><Building2 className="h-3.5 w-3.5" /> Organization membership</div>
        <h1 className="text-2xl font-bold text-white">Join an organization</h1>
        <p className="text-sm text-slate-400">Enter the invitation code provided by your organization administrator.</p>
      </div>
      {error && <div role="alert" className="flex items-start gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{error}</div>}
      {joinedName && <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-300"><CheckCircle2 className="h-4 w-4" />Joined {joinedName}. Opening your workspace…</div>}
      <label className="block space-y-2 text-xs font-semibold text-slate-300">
        Invitation code
        <span className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5">
          <KeyRound className="h-4 w-4 text-slate-500" />
          <input value={code} onChange={(event) => setCode(event.target.value)} required autoComplete="off" placeholder="Enter invitation code" className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-600" />
        </span>
      </label>
      <div className="flex items-center justify-between border-t border-slate-800 pt-4">
        <Link href="/workspace" className="rounded-lg border border-slate-700 px-4 py-2 text-xs text-slate-300 hover:bg-slate-800">Cancel</Link>
        <button type="submit" disabled={busy || !code.trim()} className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50">
          {busy ? "Checking code…" : "Join organization"} <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </form>
  );
}

export default function JoinOrganizationPage() {
  return <main className="min-h-screen bg-slate-950 px-4 py-10 text-slate-100"><Suspense fallback={<div className="text-center text-sm text-slate-400">Loading invitation form…</div>}><JoinOrganizationForm /></Suspense></main>;
}
