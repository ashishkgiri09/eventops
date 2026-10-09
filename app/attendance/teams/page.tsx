"use client";

import React, { useEffect, useState } from "react";
import { DataTable, Column } from "@/components/ui/DataTable";
import { StatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { KPICard } from "@/components/ui/KPICard";
import { Team, CheckInStatus } from "@/types";
import { teamsApi } from "@/lib/api/teams";
import { QrCode, CheckCircle, XCircle, ArrowLeft, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";

export default function AttendanceTeamsPage() {
  const router = useRouter();
  const [teams, setTeams] = useState<Team[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let active = true;
    teamsApi.getAll().then((items) => { if (active) setTeams(items); })
      .catch((error: unknown) => { if (active) setLoadError(error instanceof Error ? error.message : "Could not load attendance records."); });
    return () => { active = false; };
  }, []);

  const filtered = statusFilter === "ALL"
    ? teams
    : teams.filter((t) => t.checkInStatus === statusFilter);

  const toggleCheckIn = async (team: Team) => {
    const nextStatus: CheckInStatus = team.checkInStatus === "CHECKED_IN" ? "ABSENT" : "CHECKED_IN";
    setLoadError("");
    try {
      const updated = await teamsApi.updateCheckIn(team.id, nextStatus);
      setTeams((prev) => prev.map((item) => item.id === updated.id ? updated : item));
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Could not update check-in status.");
    }
  };

  const columns: Column<Team>[] = [
    {
      key: "id",
      header: "Team ID",
      sortable: true,
      className: "w-24 font-mono font-bold text-indigo-400",
    },
    {
      key: "name",
      header: "Team Name & Project",
      sortable: true,
      render: (t) => (
        <div>
          <div className="font-semibold text-slate-100">{t.name}</div>
          <div className="text-[11px] text-slate-500">{t.leadName} • {t.project.domain}</div>
        </div>
      ),
    },
    {
      key: "checkInStatus",
      header: "Check-in Status",
      sortable: true,
      render: (t) => <StatusBadge status={t.checkInStatus} />,
    },
    {
      key: "checkedInTime",
      header: "Timestamp",
      sortable: true,
      render: (t) => (
        <span className="font-mono text-xs text-slate-400">
          {t.checkedInTime ? new Date(t.checkedInTime).toLocaleTimeString() : "—"}
        </span>
      ),
    },
    {
      key: "assignedBench",
      header: "Allocated Bench",
      render: (t) => (
        <span className="font-mono text-xs text-slate-300">
          {t.assignedVenueName || t.assignedVenue} ({t.assignedBench})
        </span>
      ),
    },
    {
      key: "actions",
      header: "Override",
      render: (t) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            void toggleCheckIn(t);
          }}
          className="text-xs px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition cursor-pointer"
        >
          {t.checkInStatus === "CHECKED_IN" ? "Set Absent" : "Check In ✓"}
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold font-mono text-white">Live Attendance Registry</h2>
          <p className="text-xs text-slate-400">
            Live registration and check-in records for the selected event.
          </p>
        </div>
        <Button
          variant="primary"
          size="md"
          leftIcon={<QrCode className="w-4 h-4" />}
          onClick={() => router.push("/attendance/scanner")}
        >
          Open Scanner Viewfinder
        </Button>
      </div>

      {loadError && <div role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-xs text-rose-300">{loadError}</div>}

      {/* Filter Tabs */}
      <div className="flex items-center gap-2">
        {["ALL", "CHECKED_IN", "ABSENT", "PARTIAL"].map((st) => (
          <button
            key={st}
            onClick={() => setStatusFilter(st)}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono transition cursor-pointer ${
              statusFilter === st
                ? "bg-indigo-600 text-white font-bold"
                : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
            }`}
          >
            {st} ({st === "ALL" ? teams.length : teams.filter((t) => t.checkInStatus === st).length})
          </button>
        ))}
      </div>

      <DataTable
        data={filtered}
        columns={columns}
        keyExtractor={(t) => t.id}
        searchPlaceholder="Search team attendance..."
        searchFilter={(t, q) =>
          t.id.toLowerCase().includes(q) ||
          t.name.toLowerCase().includes(q) ||
          t.leadName.toLowerCase().includes(q)
        }
        onRowClick={(t) => router.push(`/teams/${t.id}`)}
      />
    </div>
  );
}
