"use client";

import React, { useEffect, useState } from "react";
import { DataTable, Column } from "@/components/ui/DataTable";
import { Announcement } from "@/types";
import { communicationApi } from "@/lib/api/communication";
import { useAppStore } from "@/store";
import { ArrowLeft, Megaphone } from "lucide-react";
import Link from "next/link";

export default function CommunicationHistoryPage() {
  const eventId = useAppStore((state) => state.currentEvent.id);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!eventId) return;
    let active = true;
    communicationApi.getAll(eventId).then((items) => { if (active) setAnnouncements(items); })
      .catch((cause: unknown) => { if (active) setError(cause instanceof Error ? cause.message : "Could not load announcement history."); });
    return () => { active = false; };
  }, [eventId]);
  const columns: Column<Announcement>[] = [
    {
      key: "title",
      header: "Broadcast Title",
      sortable: true,
      render: (a) => (
        <div>
          <div className="font-semibold text-slate-100">{a.title}</div>
          <div className="text-[11px] text-slate-500">{a.message}</div>
        </div>
      ),
    },
    {
      key: "targetAudience",
      header: "Audience",
      render: (a) => <span className="font-mono text-xs text-indigo-400">{a.targetAudience}</span>,
    },
    {
      key: "sentBy",
      header: "Dispatched By",
      render: (a) => <span className="text-xs text-slate-300">{a.sentBy}</span>,
    },
    {
      key: "sentAt",
      header: "Timestamp",
      render: (a) => <span className="font-mono text-xs text-slate-400">{new Date(a.sentAt).toLocaleString()}</span>,
    },
  ];

  return (
    <div className="space-y-6">
      {error && <div role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-xs text-rose-300">{error}</div>}
      <div className="flex items-center gap-3">
        <Link
          href="/communication"
          className="p-2 rounded-lg border border-slate-800 bg-slate-900 text-slate-400 hover:text-white"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h2 className="text-xl font-bold font-mono text-white">Broadcast History & Audit Log</h2>
          <p className="text-xs text-slate-400">Archived dispatches sent to teams, juries, and marshals.</p>
        </div>
      </div>

      <DataTable
        data={announcements}
        columns={columns}
        keyExtractor={(a) => a.id}
        searchPlaceholder="Search history..."
      />
    </div>
  );
}
