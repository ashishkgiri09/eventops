"use client";

import React, { useEffect, useState } from "react";
import { DataTable, Column } from "@/components/ui/DataTable";
import { Button } from "@/components/ui/Button";
import { KPICard } from "@/components/ui/KPICard";
import { Announcement } from "@/types";
import { communicationApi } from "@/lib/api/communication";
import { useAppStore } from "@/store";
import { Megaphone, Plus, Mail, MessageSquare, Send, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";

export default function CommunicationOverviewPage() {
  const router = useRouter();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loadError, setLoadError] = useState("");
  const eventId = useAppStore((state) => state.currentEvent.id);

  useEffect(() => {
    if (!eventId) return;
    let active = true;
    communicationApi.getAll(eventId).then((items) => { if (active) setAnnouncements(items); })
      .catch((error: unknown) => { if (active) setLoadError(error instanceof Error ? error.message : "Could not load announcements."); });
    return () => { active = false; };
  }, [eventId]);

  const columns: Column<Announcement>[] = [
    {
      key: "title",
      header: "Announcement Title",
      sortable: true,
      render: (a) => (
        <div>
          <div className="font-semibold text-slate-100">{a.title}</div>
          <div className="text-[11px] text-slate-500 line-clamp-1">{a.message}</div>
        </div>
      ),
    },
    {
      key: "targetAudience",
      header: "Target Cohort",
      sortable: true,
      render: (a) => (
        <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
          {a.targetAudience}
        </span>
      ),
    },
    {
      key: "channels",
      header: "Channels Dispatched",
      render: (a) => (
        <div className="flex gap-1">
          {a.channels.map((ch) => (
            <span key={ch} className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-slate-800 text-slate-300">
              {ch}
            </span>
          ))}
        </div>
      ),
    },
    {
      key: "recipientCount",
      header: "Delivered To",
      sortable: true,
      render: (a) => <span className="font-mono text-xs">{a.recipientCount} Recipients</span>,
    },
    {
      key: "sentAt",
      header: "Broadcast Time",
      render: (a) => (
        <span className="font-mono text-xs text-slate-400">
          {new Date(a.sentAt).toLocaleTimeString()}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {loadError && <div role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-xs text-rose-300">{loadError}</div>}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold font-mono text-white">Broadcast & Multi-Channel Communications</h2>
          <p className="text-xs text-slate-400">
            Real-time push notifications, urgent SMS, WhatsApp blasts, and email bulletins.
          </p>
        </div>

        <Button
          variant="primary"
          size="md"
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={() => router.push("/communication/create")}
        >
          Compose Broadcast
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KPICard title="Total Broadcasts" value={announcements.length} subtitle="Live announcement records" icon={<Megaphone className="w-4 h-4 text-indigo-400" />} />
        <KPICard title="Total Reached" value={announcements.reduce((sum, item) => sum + (item.recipientCount || 0), 0)} subtitle="Reported recipients" accentColor="emerald" icon={<Send className="w-4 h-4 text-emerald-400" />} />
        <KPICard title="Active Channels" value={new Set(announcements.flatMap((item) => item.channels || [])).size} subtitle="Configured in announcements" accentColor="sky" icon={<MessageSquare className="w-4 h-4 text-sky-400" />} />
      </div>

      <DataTable
        data={announcements}
        columns={columns}
        keyExtractor={(a) => a.id}
        searchPlaceholder="Search broadcasts..."
      />
    </div>
  );
}
