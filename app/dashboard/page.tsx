"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useAppStore } from "@/store";
import { attendanceApi } from "@/lib/api/attendance";
import { judgesApi } from "@/lib/api/judges";
import { incidentsApi } from "@/lib/api/incidents";
import { sessionsApi } from "@/lib/api/sessions";
import { resourcesApi } from "@/lib/api/resources";
import { registrationsApi } from "@/lib/api/registrations";
import { CalendarDays, Users, CheckCircle2, Scale, AlertTriangle, Clock3, DollarSign, BriefcaseBusiness, PartyPopper, GraduationCap, ArrowRight } from "lucide-react";

type DashboardMetrics = {
  registered: number;
  checkedIn: number;
  judges: number;
  openIncidents: number;
  sessions: number;
  guests: number;
  confirmedGuests: number;
  budgetPlanned: number;
  budgetActual: number;
};

const emptyMetrics: DashboardMetrics = {
  registered: 0,
  checkedIn: 0,
  judges: 0,
  openIncidents: 0,
  sessions: 0,
  guests: 0,
  confirmedGuests: 0,
  budgetPlanned: 0,
  budgetActual: 0,
};

export default function DashboardPage() {
  const { currentEvent, currentRole, workspaceCategory } = useAppStore();
  const [metrics, setMetrics] = useState(emptyMetrics);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!currentEvent?.id) {
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    setError("");

    Promise.allSettled([
      attendanceApi.getSummary(currentEvent.id),
      judgesApi.getAll(currentEvent.id),
      incidentsApi.getAll(currentEvent.id),
      sessionsApi.getSessions(currentEvent.id),
      resourcesApi.getBudgetSummary(currentEvent.id),
      registrationsApi.getGuests(currentEvent.id),
    ]).then(([attendance, judges, incidents, sessions, budget, guests]) => {
      if (!active) return;
      setMetrics({
        registered: attendance.status === "fulfilled" ? Number(attendance.value.total || 0) : 0,
        checkedIn: attendance.status === "fulfilled" ? Number(attendance.value.checkedIn || 0) : 0,
        judges: judges.status === "fulfilled" ? judges.value.length : 0,
        openIncidents: incidents.status === "fulfilled" ? incidents.value.filter((item) => item.status !== "RESOLVED").length : 0,
        sessions: sessions.status === "fulfilled" ? sessions.value.length : 0,
        guests: guests.status === "fulfilled" ? guests.value.length : 0,
        confirmedGuests: guests.status === "fulfilled" ? guests.value.filter((item) => item.rsvpStatus === "CONFIRMED").length : 0,
        budgetPlanned: budget.status === "fulfilled" ? budget.value.plannedTotal : 0,
        budgetActual: budget.status === "fulfilled" ? budget.value.actualTotal : 0,
      });
      if (attendance.status === "rejected") setError(attendance.reason instanceof Error ? attendance.reason.message : "Could not load attendance data.");
      setLoading(false);
    });

    return () => { active = false; };
  }, [currentEvent?.id]);

  if (!currentEvent?.id) {
    return (
      <div className="mx-auto max-w-2xl rounded-3xl border border-slate-800 bg-slate-900/60 p-8 text-center">
        <CalendarDays className="mx-auto h-9 w-9 text-indigo-400" />
        <h1 className="mt-4 text-xl font-semibold text-white">Choose an event to view its dashboard</h1>
        <p className="mt-2 text-sm text-slate-400">Dashboard metrics are loaded from the selected event in your live account.</p>
        <Link href="/workspace" className="mt-5 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white">Open workspaces <ArrowRight className="h-4 w-4" /></Link>
      </div>
    );
  }

  const category = workspaceCategory || "INSTITUTIONAL";
  const isPersonal = category === "PERSONAL";
  const isCorporate = category === "CORPORATE";
  const headingIcon = isPersonal ? <PartyPopper className="h-5 w-5 text-amber-400" /> : isCorporate ? <BriefcaseBusiness className="h-5 w-5 text-sky-400" /> : <GraduationCap className="h-5 w-5 text-indigo-400" />;
  const heading = isPersonal ? "Personal event overview" : isCorporate ? "Corporate event overview" : "Institution event overview";
  const attendanceRate = metrics.registered ? Math.round((metrics.checkedIn / metrics.registered) * 100) : 0;

  const cards = isPersonal
    ? [
        { label: "Guests", value: metrics.guests, detail: "Live guest list", icon: <Users className="h-4 w-4 text-amber-400" /> },
        { label: "Confirmed RSVPs", value: metrics.confirmedGuests, detail: "From guest responses", icon: <CheckCircle2 className="h-4 w-4 text-emerald-400" /> },
        { label: "Planned Budget", value: metrics.budgetPlanned.toLocaleString(), detail: "Live budget records", icon: <DollarSign className="h-4 w-4 text-teal-400" /> },
        { label: "Actual Spend", value: metrics.budgetActual.toLocaleString(), detail: "Live budget records", icon: <DollarSign className="h-4 w-4 text-rose-400" /> },
      ]
    : isCorporate
      ? [
          { label: "Registrations", value: metrics.registered, detail: "Live event registry", icon: <Users className="h-4 w-4 text-sky-400" /> },
          { label: "Checked In", value: metrics.checkedIn, detail: `${attendanceRate}% of registrations`, icon: <CheckCircle2 className="h-4 w-4 text-emerald-400" /> },
          { label: "Sessions", value: metrics.sessions, detail: "Live agenda records", icon: <Clock3 className="h-4 w-4 text-violet-400" /> },
          { label: "Planned Budget", value: metrics.budgetPlanned.toLocaleString(), detail: "Live budget records", icon: <DollarSign className="h-4 w-4 text-teal-400" /> },
        ]
      : [
          { label: "Registrations", value: metrics.registered, detail: "Live team registry", icon: <Users className="h-4 w-4 text-indigo-400" /> },
          { label: "Checked In", value: metrics.checkedIn, detail: `${attendanceRate}% of registrations`, icon: <CheckCircle2 className="h-4 w-4 text-emerald-400" /> },
          { label: "Judges", value: metrics.judges, detail: "Live judge roster", icon: <Scale className="h-4 w-4 text-amber-400" /> },
          { label: "Open Incidents", value: metrics.openIncidents, detail: "Unresolved reports", icon: <AlertTriangle className="h-4 w-4 text-rose-400" /> },
        ];

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 rounded-3xl border border-slate-800 bg-slate-900/70 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">{headingIcon}{heading}</div>
          <h1 className="mt-2 text-2xl font-bold text-white">{currentEvent.name || "Selected event"}</h1>
          <p className="mt-1 text-sm text-slate-400">{currentEvent.type || "Event"} · {currentEvent.status || "Draft"} · Role: {currentRole}</p>
        </div>
        <Link href="/events" className="inline-flex items-center gap-2 self-start rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-200 hover:bg-slate-800 sm:self-auto">All events <ArrowRight className="h-4 w-4" /></Link>
      </section>

      {error && <div role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">{error}</div>}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <div key={card.label} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
            <div className="flex items-center justify-between"><span className="text-xs font-medium text-slate-400">{card.label}</span>{card.icon}</div>
            <div className="mt-3 text-2xl font-bold text-white">{loading ? "…" : card.value}</div>
            <p className="mt-1 text-xs text-slate-500">{card.detail}</p>
          </div>
        ))}
      </section>

      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
        <h2 className="text-sm font-semibold text-white">Event operations</h2>
        <p className="mt-1 text-xs text-slate-400">Records shown here come from the backend. New events start with empty registrations and operations data.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href="/attendance/scanner" className="rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-200 hover:bg-slate-800">Attendance scanner</Link>
          <Link href={isPersonal ? "/guests" : "/teams"} className="rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-200 hover:bg-slate-800">{isPersonal || isCorporate ? "Registrations & guests" : "Teams"}</Link>
          {isCorporate ? <Link href="/schedule" className="rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-200 hover:bg-slate-800">Sessions</Link> : null}
          {!isPersonal ? <Link href="/judges" className="rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-200 hover:bg-slate-800">Judges</Link> : null}
          <Link href="/events" className="rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-200 hover:bg-slate-800">Manage events</Link>
        </div>
      </section>
    </div>
  );
}
