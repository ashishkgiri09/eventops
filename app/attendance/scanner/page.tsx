"use client";

import React, { useEffect, useState } from "react";
import { QRScanner } from "@/components/ui/QRCard";
import { KPICard } from "@/components/ui/KPICard";
import { StatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { attendanceApi, ScanResult } from "@/lib/api/attendance";
import { useAppStore } from "@/store";
import {
  CheckCircle2,
  Users,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  Scale,
  Utensils,
  ClipboardCheck,
  AlertTriangle,
  RotateCcw,
  XCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";

export default function AttendanceScannerPage() {
  const router = useRouter();
  const { currentRole, currentEvent } = useAppStore();

  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [scanLog, setScanLog] = useState<{ id: string; name: string; time: string; status: string }[]>([]);
  const [isReverting, setIsReverting] = useState(false);
  const [summary, setSummary] = useState<{ total: number; checkedIn: number; remaining: number; attendanceRatePct: number } | null>(null);
  const [summaryError, setSummaryError] = useState("");

  useEffect(() => {
    if (!currentEvent?.id) return;
    let active = true;
    attendanceApi.getSummary(currentEvent.id)
      .then((result) => { if (active) setSummary(result as typeof summary); })
      .catch((error: unknown) => { if (active) setSummaryError(error instanceof Error ? error.message : "Could not load attendance summary."); });
    return () => { active = false; };
  }, [currentEvent?.id]);

  const handleScan = async (token: string) => {
    try {
      const result = await attendanceApi.scanTicket(token);
      setScanResult(result);
      if (result.status === "SUCCESS" && currentEvent?.id) {
        const updatedSummary = await attendanceApi.getSummary(currentEvent.id);
        setSummary(updatedSummary as NonNullable<typeof summary>);
      }

      if (result.team) {
        setScanLog((prev) => [
          {
            id: result.team!.id,
            name: result.team!.name,
            time: new Date().toLocaleTimeString(),
            status: result.status,
          },
          ...prev.slice(0, 9),
        ]);
      }
    } catch (err: any) {
      setScanResult({
        status: "INVALID",
        message: err?.message || "Invalid ticket credential.",
        scannedAt: new Date().toISOString(),
      });
    }
  };

  const handleUndoCheckIn = async (teamId: string) => {
    setIsReverting(true);
    try {
      await attendanceApi.revertCheckIn(teamId, "Operator corrected erroneous check-in scan.");
      setScanResult(null);
      if (currentEvent?.id) {
        const updatedSummary = await attendanceApi.getSummary(currentEvent.id);
        setSummary(updatedSummary as NonNullable<typeof summary>);
      }
    } finally {
      setIsReverting(false);
    }
  };

  const getTerminalMeta = () => {
    switch (currentRole) {
      case "JUDGE":
        return {
          title: "Jury Terminal: On-Floor Assigned Team Verification",
          subtitle: "Scan team QR code to verify bench location and open scoring rubric",
          badge: "JUDGE TERMINAL",
          icon: <Scale className="w-4 h-4 text-amber-400" />,
        };
      case "RESOURCE_MANAGER":
        return {
          title: "Resource Manager: Meal & Swag Distribution Terminal",
          subtitle: "Scan attendee badge to verify and record meal or kit distribution",
          badge: "RESOURCE SCANNER",
          icon: <Utensils className="w-4 h-4 text-rose-400" />,
        };
      case "VOLUNTEER":
        return {
          title: "Volunteer Field Terminal: Attendance Check-In",
          subtitle: "Scan attendee badge to confirm entrance and mark checked-in",
          badge: "VOLUNTEER SCANNER",
          icon: <ClipboardCheck className="w-4 h-4 text-teal-400" />,
        };
      case "TECHNICAL_STAFF":
        return {
          title: "Technical Staff: Workstation & Hardware Verification",
          subtitle: "Scan workstation QR code to verify power and network telemetry",
          badge: "TECH TERMINAL",
          icon: <ShieldCheck className="w-4 h-4 text-orange-400" />,
        };
      default:
        return {
          title: "Operations High-Speed QR Check-in Terminal",
          subtitle: "Sub-second verification against central attendance registry with instant bench lookup",
          badge: "OPERATIONS DESK",
          icon: <ShieldCheck className="w-4 h-4 text-indigo-400" />,
        };
    }
  };

  const terminalMeta = getTerminalMeta();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-indigo-400 uppercase bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
              {terminalMeta.badge}
            </span>
            <StatusBadge status="ACTIVE" />
          </div>
          <h2 className="text-xl font-bold font-mono text-white mt-1">{terminalMeta.title}</h2>
          <p className="text-xs text-slate-400">{terminalMeta.subtitle}</p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/attendance/teams")}
            rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
          >
            Attendance Registry
          </Button>
        </div>
      </div>

      {summaryError && <div role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-xs text-rose-300">{summaryError}</div>}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KPICard title="Total Registered" value={summary?.total ?? "—"} subtitle="Live event registry" icon={<Users className="w-4 h-4 text-indigo-400" />} />
        <KPICard title="Verified Checked-In" value={summary?.checkedIn ?? "—"} accentColor="emerald" change={summary ? `${summary.attendanceRatePct}% present` : undefined} changeType="positive" icon={<CheckCircle2 className="w-4 h-4 text-emerald-400" />} />
        <KPICard title="Pending Arrival" value={summary?.remaining ?? "—"} accentColor="rose" subtitle="Awaiting entry scan" icon={<AlertCircle className="w-4 h-4 text-rose-400" />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Left: Viewfinder Camera Component */}
        <div className="space-y-4">
          <QRScanner onScanSuccess={handleScan} />

        </div>

        {/* Right: Last Scanned Confirmation & Audit Feed */}
        <div className="space-y-4">
          {/* 1. SUCCESS STATE */}
          {scanResult && scanResult.status === "SUCCESS" && scanResult.team && (
            <div className="p-6 rounded-3xl border border-emerald-500/30 bg-emerald-500/10 space-y-4 animate-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald-400 text-xs font-mono font-bold uppercase">
                  <CheckCircle2 className="w-5 h-5" />
                  <span>Verified Successfully</span>
                </div>
                <StatusBadge status="CHECKED_IN" />
              </div>

              <div>
                <span className="font-mono text-xs text-emerald-400 font-bold">{scanResult.team.id}</span>
                <h3 className="text-base font-bold text-white mt-0.5">{scanResult.team.name}</h3>
                <p className="text-xs text-slate-300 mt-1">{scanResult.team.project.title}</p>
              </div>

              <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-slate-950/70 border border-emerald-500/20 text-xs">
                <div>
                  <span className="text-slate-400 text-[11px]">Assigned Suite:</span>
                  <p className="font-semibold text-slate-200">{scanResult.team.assignedVenueName || scanResult.team.assignedVenue}</p>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px]">Assigned Bench:</span>
                  <p className="font-mono font-bold text-emerald-300">{scanResult.team.assignedBench}</p>
                </div>
              </div>

              {/* Staff Correction Flow: Undo Check-in */}
              <div className="pt-2 flex items-center justify-between border-t border-emerald-500/20">
                <button
                  onClick={() => handleUndoCheckIn(scanResult.team!.id)}
                  disabled={isReverting}
                  className="text-xs text-slate-400 hover:text-rose-300 flex items-center gap-1 cursor-pointer transition"
                >
                  <RotateCcw className="w-3 h-3" /> Revert Check-In (Correction)
                </button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => router.push(`/teams/${scanResult.team!.id}`)}
                >
                  Full Profile →
                </Button>
              </div>
            </div>
          )}

          {/* 2. DUPLICATE CHECK-IN STATE */}
          {scanResult && scanResult.status === "DUPLICATE" && (
            <div className="p-6 rounded-3xl border border-amber-500/40 bg-amber-500/10 space-y-4 animate-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-amber-400 text-xs font-mono font-bold uppercase">
                  <AlertTriangle className="w-5 h-5" />
                  <span>Duplicate Ticket Scan</span>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  FLAGGED
                </span>
              </div>

              <p className="text-xs text-amber-200 leading-relaxed font-mono">
                {scanResult.message}
              </p>

              {scanResult.team && (
                <div className="p-3 rounded-xl bg-slate-950/70 border border-amber-500/20 text-xs text-slate-300 space-y-1">
                  <div>Team: <span className="font-bold text-white">{scanResult.team.name} ({scanResult.team.id})</span></div>
                  <div>Prior Scan Time: <span className="font-mono text-amber-300">{scanResult.previousCheckInTime}</span></div>
                  <div>Station: <span className="text-slate-400">{scanResult.stationName}</span></div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-1">
                <Button size="sm" variant="outline" onClick={() => setScanResult(null)}>
                  Dismiss Warning
                </Button>
              </div>
            </div>
          )}

          {/* 3. INVALID TICKET STATE */}
          {scanResult && scanResult.status === "INVALID" && (
            <div className="p-6 rounded-3xl border border-rose-500/40 bg-rose-500/10 space-y-4 animate-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-rose-400 text-xs font-mono font-bold uppercase">
                  <XCircle className="w-5 h-5" />
                  <span>Invalid Ticket Credential</span>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  REJECTED
                </span>
              </div>

              <p className="text-xs text-rose-200 leading-relaxed">
                {scanResult.message}
              </p>

              <div className="flex justify-end gap-2 pt-1">
                <Button size="sm" variant="outline" onClick={() => setScanResult(null)}>
                  Retry Scan
                </Button>
                <Button size="sm" variant="primary" onClick={() => router.push("/attendance/teams")}>
                  Manual Registry Search
                </Button>
              </div>
            </div>
          )}

          {/* 4. IDLE STATE */}
          {!scanResult && (
            <div className="p-8 rounded-3xl border border-dashed border-slate-800 bg-slate-900/50 text-center space-y-2">
              <ShieldCheck className="w-10 h-10 text-slate-600 mx-auto" />
                <h4 className="text-sm font-semibold text-slate-200">Awaiting ticket token</h4>
                <p className="text-xs text-slate-400 max-w-xs mx-auto">
                  Enter a token from this event’s registration record to verify it against the live registry.
              </p>
            </div>
          )}

          {/* Real-time Scan Audit Stream */}
          <div className="p-5 rounded-3xl border border-slate-800 bg-slate-900/80 space-y-3">
            <h4 className="text-xs font-mono uppercase tracking-wider text-slate-400">
              Terminal Scan History (Live Buffer)
            </h4>
            {scanLog.length === 0 ? (
              <p className="text-xs text-slate-500">No scans recorded in this session yet.</p>
            ) : (
              <div className="divide-y divide-slate-800/80 text-xs">
                {scanLog.map((log, idx) => (
                  <div key={idx} className="py-2 flex items-center justify-between">
                    <div>
                      <span className="font-mono font-bold text-indigo-400 mr-2">{log.id}</span>
                      <span className="text-slate-200">{log.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${
                        log.status === "SUCCESS"
                          ? "bg-emerald-500/10 text-emerald-400"
                          : log.status === "DUPLICATE"
                          ? "bg-amber-500/10 text-amber-400"
                          : "bg-rose-500/10 text-rose-400"
                      }`}>
                        {log.status}
                      </span>
                      <span className="font-mono text-[11px] text-slate-500">{log.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
