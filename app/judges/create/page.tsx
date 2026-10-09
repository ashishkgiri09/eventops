"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { judgesApi } from "@/lib/api/judges";
import { Scale, ArrowLeft, ArrowRight, Mail, Phone, ShieldCheck, Send } from "lucide-react";
import Link from "next/link";
import { activeEventId } from "@/lib/api/module-records";
import { sessionService } from "@/lib/auth/session";
import { useAppStore } from "@/store";
import { organizationsApi } from "@/lib/api/organizations";

export default function CreateJudgePage() {
  const router = useRouter();
  const { currentEvent, currentOrganization } = useAppStore();
  const [name, setName] = useState("Dr. Marcus Vance");
  const [email, setEmail] = useState("marcus.vance@mit.edu");
  const [phone, setPhone] = useState("+1 617-555-0142");
  const [organization, setOrganization] = useState("MIT CSAIL");
  const [designation, setDesignation] = useState("Professor of Computer Science & AI");
  const [expertise, setExpertise] = useState("AI / Machine Learning, Distributed Systems, Computer Vision");
  const [domains, setDomains] = useState("AI / Machine Learning, HealthTech");
  const [capacity, setCapacity] = useState("8");
  const [availability, setAvailability] = useState<"FULL_TIME" | "PART_TIME">("FULL_TIME");
  const [assignedEvent, setAssignedEvent] = useState("");
  const [conflicts, setConflicts] = useState("Cannot evaluate Team T003: Alumni affiliation");
  const [isLoading, setIsLoading] = useState(false);
  const [inviteSent, setInviteSent] = useState(false);
  const [inviteUrl, setInviteUrl] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setAssignedEvent(sessionService.getStoredWorkspace()?.eventId || currentEvent?.id || "");
  }, [currentEvent?.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      const eventId = activeEventId(assignedEvent);
      const newJudge = await judgesApi.create({
        eventId,
        name,
        email,
        organization,
        designation,
        expertise: expertise.split(",").map((s) => s.trim()),
        domains: domains.split(",").map((s) => s.trim()),
        maxTeamCapacity: parseInt(capacity, 10) || 8,
        availability,
        conflicts: conflicts ? [conflicts] : [],
      });
      if (!currentOrganization?.id) throw new Error("Judge profile was saved, but no organization is selected to issue the login invitation.");
      const invitation = await organizationsApi.createInvitation(currentOrganization.id, { email: email.trim(), role: "JUDGE" });
      setInviteUrl(`${window.location.origin}/register?invite=${encodeURIComponent(invitation.inviteCode)}&email=${encodeURIComponent(email.trim())}`);
      setInviteSent(true);
      void newJudge;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not add this judge to the selected event.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/judges"
          className="p-2 rounded-lg border border-slate-800 bg-slate-900 text-slate-400 hover:text-white"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h2 className="text-xl font-bold font-mono text-white">Invite & Assign Judge</h2>
          <p className="text-xs text-slate-400">
            Invite domain evaluators, assign event, and provision scoped JUDGE role access.
          </p>
        </div>
      </div>

      {error && <div role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300">{error} <Link className="underline" href="/workspace">Choose an event</Link></div>}
      {inviteSent && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300 flex items-center gap-3">
          <Send className="w-4 h-4 text-emerald-400" />
          <div className="min-w-0"><span>Judge account invitation created for {email}. Copy and send this link; the invitee sets a password and then signs in at the shared login page.</span><input readOnly value={inviteUrl} onFocus={(event) => event.currentTarget.select()} className="mt-2 w-full rounded border border-emerald-500/30 bg-slate-950 px-2 py-1.5 text-[11px] text-slate-200" /><button type="button" onClick={() => void navigator.clipboard.writeText(inviteUrl)} className="mt-2 underline">Copy invitation link</button></div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="p-6 rounded-3xl border border-slate-800 bg-slate-900/80 space-y-5">
        {/* Role & Event Assignment Banner */}
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-amber-400" />
            <div>
              <span className="text-xs font-bold text-white block">Assigned Role: JUDGE</span>
              <span className="text-[11px] text-slate-300">
                Authorized for assigned evaluation rubrics and verification QR scan only.
              </span>
            </div>
          </div>
          <span className="text-[10px] font-mono uppercase bg-amber-500/20 text-amber-300 px-2.5 py-1 rounded-full font-bold border border-amber-500/40">
            ROLE = JUDGE
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Full Name & Academic Title" required value={name} onChange={(e) => setName(e.target.value)} />
          <Input
            label="Evaluator Corporate / Academic Email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            leftIcon={<Mail className="w-4 h-4 text-slate-500" />}
          />
          <Input
            label="Mobile Phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            leftIcon={<Phone className="w-4 h-4 text-slate-500" />}
          />
          <Input label="Affiliated University or Firm" required value={organization} onChange={(e) => setOrganization(e.target.value)} />
          <Input label="Professional Designation" required value={designation} onChange={(e) => setDesignation(e.target.value)} />

          <div className="space-y-1"><span className="block text-xs font-semibold text-slate-300">Assign Event</span><div className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-200">{currentEvent?.name || (assignedEvent ? `Selected event · ${assignedEvent}` : "No event selected")}</div><p className="text-[11px] text-slate-500">Uses the event selected in your workspace.</p></div>

          <Input label="Domain Expertise" value={expertise} onChange={(e) => setExpertise(e.target.value)} hint="Comma-separated" />
          <Input label="Evaluator Domains" value={domains} onChange={(e) => setDomains(e.target.value)} hint="Match against team tracks" />
          <Input label="Max Team Capacity" type="number" value={capacity} onChange={(e) => setCapacity(e.target.value)} />
          <Select
            label="Availability Commitment"
            value={availability}
            onChange={(e) => setAvailability(e.target.value as any)}
            options={[
              { value: "FULL_TIME", label: "Full-Time (All Rounds & Finals)" },
              { value: "PART_TIME", label: "Part-Time (Designated Slots Only)" },
            ]}
          />
        </div>

        <div className="pt-2 border-t border-slate-800">
          <Input
            label="Declared Conflicts of Interest"
            value={conflicts}
            onChange={(e) => setConflicts(e.target.value)}
            hint="OR-Tools solver mathematically prohibits assigning teams declared here."
          />
        </div>

        <div className="pt-4 flex items-center justify-between border-t border-slate-800">
          <Button type="button" variant="outline" onClick={() => router.push("/judges")}>
            Cancel
          </Button>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            isLoading={isLoading}
            disabled={!assignedEvent}
            leftIcon={<Send className="w-4 h-4" />}
          >
            Send Judge Invitation
          </Button>
        </div>
      </form>
    </div>
  );
}
