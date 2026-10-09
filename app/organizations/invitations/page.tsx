"use client";

import { FormEvent, useState } from "react";
import { Copy, MailPlus, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { organizationsApi } from "@/lib/api/organizations";
import { useAppStore } from "@/store";
import { UserRole } from "@/types";

const inviteRoles: { value: UserRole; label: string }[] = [
  { value: "PARTICIPANT", label: "Student / Participant" },
  { value: "JUDGE", label: "Judge / Evaluator" },
  { value: "COORDINATOR", label: "Faculty / Coordinator" },
  { value: "EVENT_ADMIN", label: "Event Admin" },
  { value: "VOLUNTEER", label: "Volunteer" },
  { value: "TECHNICAL_STAFF", label: "Technical Staff" },
  { value: "RESOURCE_MANAGER", label: "Resource Manager" },
];

export default function OrganizationInvitationsPage() {
  const { currentOrganization, currentRole } = useAppStore();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<UserRole>("PARTICIPANT");
  const [inviteUrl, setInviteUrl] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const createInvite = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(""); setMessage(""); setInviteUrl("");
    if (!currentOrganization?.id) { setError("Choose an organization workspace first."); return; }
    setBusy(true);
    try {
      const invite = await organizationsApi.createInvitation(currentOrganization.id, { email: email.trim(), role });
      const url = `${window.location.origin}/register?invite=${encodeURIComponent(invite.inviteCode)}&email=${encodeURIComponent(email.trim())}`;
      setInviteUrl(url);
      setMessage(`Invite link created for ${email.trim()}. It expires in 7 days.`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not create the invitation.");
    } finally { setBusy(false); }
  };

  const copyInvite = async () => {
    try { await navigator.clipboard.writeText(inviteUrl); setMessage("Invite link copied. Send it to the invited email address."); }
    catch { setError("Clipboard access failed. Select and copy the invite link below."); }
  };

  if (currentRole !== "ORGANIZATION_ADMIN" && currentRole !== "EVENT_ADMIN" && currentRole !== "SUPER_ADMIN") {
    return <div role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-300">Only organization admins can issue account invitations.</div>;
  }

  return <div className="mx-auto max-w-3xl space-y-6">
    <header><div className="flex items-center gap-2 text-indigo-300"><MailPlus className="h-5 w-5" /><span className="text-xs font-mono uppercase tracking-widest">Account access</span></div><h1 className="mt-2 text-2xl font-bold text-white">Invite students and staff</h1><p className="mt-1 text-sm text-slate-400">Create an email-bound setup link. Invitees set their own password, then use the same EVENTOPS sign-in page. Their assigned role controls their workspace.</p></header>
    <form onSubmit={createInvite} className="space-y-5 rounded-2xl border border-slate-800 bg-slate-900/80 p-6">
      <div className="flex items-start gap-3 rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-4 text-xs text-slate-300"><ShieldCheck className="h-4 w-4 shrink-0 text-indigo-300" /><span>Invitations are restricted to the selected organization and email. EVENTOPS has no outbound email provider configured, so copy the generated link and send it yourself.</span></div>
      {error && <p role="alert" className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300">{error}</p>}
      {message && <p role="status" className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-300">{message}</p>}
      <Input label="Invitee email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="student@school.edu" />
      <label className="block space-y-1.5 text-xs font-medium text-slate-300">Role<select value={role} onChange={(event) => setRole(event.target.value as UserRole)} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-100">{inviteRoles.map((item) => <option value={item.value} key={item.value}>{item.label}</option>)}</select></label>
      <Button type="submit" variant="primary" isLoading={busy} leftIcon={<MailPlus className="h-4 w-4" />}>Create invite link</Button>
      {inviteUrl && <div className="space-y-2 border-t border-slate-800 pt-4"><label className="block text-xs font-semibold text-slate-300">One-time account setup link</label><div className="flex gap-2"><input readOnly value={inviteUrl} onFocus={(event) => event.currentTarget.select()} className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-200" /><Button type="button" variant="outline" onClick={copyInvite} leftIcon={<Copy className="h-4 w-4" />}>Copy</Button></div><p className="text-[11px] text-slate-500">After signup, the invitee signs in at <code>/login</code> with the same email and password they created.</p></div>}
    </form>
  </div>;
}
