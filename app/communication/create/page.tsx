"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { ArrowLeft, ArrowRight, Send, Check } from "lucide-react";
import Link from "next/link";
import { communicationApi } from "@/lib/api/communication";
import { useAppStore } from "@/store";
import { Announcement } from "@/types";

export default function CreateBroadcastPage() {
  const router = useRouter();
  const eventId = useAppStore((state) => state.currentEvent.id);
  const [title, setTitle] = useState("");
  const [audience, setAudience] = useState("ALL");
  const [message, setMessage] = useState("");
  const [channels, setChannels] = useState({ inApp: true, email: false, sms: false, whatsapp: false });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventId) { setError("Select an event before creating an announcement."); return; }
    setIsLoading(true);
    setError("");
    try {
      await communicationApi.createAnnouncement({ eventId, title, message, targetAudience: audience as Announcement["targetAudience"], channels: [
        ...(channels.inApp ? ["IN_APP" as const] : []),
        ...(channels.email ? ["EMAIL" as const] : []),
        ...(channels.sms ? ["SMS" as const] : []),
        ...(channels.whatsapp ? ["WHATSAPP" as const] : []),
      ] });
      router.push("/communication");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save the announcement.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/communication"
          className="p-2 rounded-lg border border-slate-800 bg-slate-900 text-slate-400 hover:text-white"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h2 className="text-xl font-bold font-mono text-white">Compose Multi-Channel Broadcast</h2>
          <p className="text-xs text-slate-400">Dispatch immediate notifications to teams, judges, or field volunteers.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-6 rounded-2xl border border-slate-800 bg-slate-900/80 space-y-4">
        {error && <div role="alert" className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">{error}</div>}
        <Input label="Broadcast Headline" required value={title} onChange={(e) => setTitle(e.target.value)} />

        <Select
          label="Target Audience"
          value={audience}
          onChange={(e) => setAudience(e.target.value)}
          options={[
            { value: "ALL", label: "Everyone (All Participants, Judges & Staff)" },
            { value: "PARTICIPANTS", label: "Team Participants Only" },
            { value: "JUDGES", label: "Jury Evaluators Only" },
            { value: "VOLUNTEERS", label: "Volunteers & Floor Marshals" },
            { value: "COORDINATORS", label: "Event Coordinators & Track Leads" },
            { value: "TECHNICAL_STAFF", label: "Technical & Power Infra Staff" },
            { value: "RESOURCE_MANAGERS", label: "Food & Resource Managers" },
          ]}
        />

        <Textarea label="Broadcast Message Body" required value={message} onChange={(e) => setMessage(e.target.value)} />

        <div className="pt-2">
          <label className="block text-xs font-medium text-slate-300 mb-2">Delivery Channels</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <label className="flex items-center gap-2 p-2.5 rounded-lg border border-slate-800 bg-slate-950/60 cursor-pointer">
              <input type="checkbox" checked={channels.inApp} onChange={(e) => setChannels({ ...channels, inApp: e.target.checked })} />
              <span>In-App Banner</span>
            </label>
            <label className="flex items-center gap-2 p-2.5 rounded-lg border border-slate-800 bg-slate-950/60 cursor-pointer">
              <input type="checkbox" checked={channels.email} onChange={(e) => setChannels({ ...channels, email: e.target.checked })} />
              <span>Email Digest</span>
            </label>
            <label className="flex items-center gap-2 p-2.5 rounded-lg border border-slate-800 bg-slate-950/60 cursor-pointer">
              <input type="checkbox" checked={channels.sms} onChange={(e) => setChannels({ ...channels, sms: e.target.checked })} />
              <span>Urgent SMS</span>
            </label>
            <label className="flex items-center gap-2 p-2.5 rounded-lg border border-slate-800 bg-slate-950/60 cursor-pointer">
              <input type="checkbox" checked={channels.whatsapp} onChange={(e) => setChannels({ ...channels, whatsapp: e.target.checked })} />
              <span>WhatsApp API</span>
            </label>
          </div>
          <p className="text-[11px] text-slate-400 mt-2 font-mono">
            Note: This records the announcement. External email and SMS delivery require a configured provider.
          </p>
        </div>

        <div className="pt-4 flex justify-between border-t border-slate-800">
          <Button type="button" variant="outline" onClick={() => router.push("/communication")}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={isLoading} rightIcon={<Send className="w-4 h-4" />}>
            Broadcast Announcement
          </Button>
        </div>
      </form>
    </div>
  );
}
