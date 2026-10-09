"use client";

import React, { useState, useEffect } from "react";
import { sessionsApi } from "@/lib/api/sessions";
import { EventSession } from "@/types";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";
import { KPICard } from "@/components/ui/KPICard";
import {
  Calendar,
  Clock,
  MapPin,
  User,
  Plus,
  AlertTriangle,
  CheckCircle,
  Search,
  Filter,
  Layers,
  Sparkles,
  ArrowRight,
  ShieldAlert,
} from "lucide-react";

export default function SessionsSchedulePage() {
  const [sessions, setSessions] = useState<EventSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [trackFilter, setTrackFilter] = useState("ALL");
  const [viewMode, setViewMode] = useState<"TIMELINE" | "ROOMS">("TIMELINE");

  // Create Session Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    speaker: "",
    speakerRole: "",
    venueId: "R001",
    venueName: "Hall A - Grand Turing Auditorium",
    startTime: "2026-11-05T11:00:00Z",
    endTime: "2026-11-05T12:00:00Z",
    capacity: 100,
    track: "Developer Deep-Dive",
  });
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const data = await sessionsApi.getSessions();
      setSessions(data);
      setLoading(false);
    }
    load();
  }, []);

  const tracks = ["ALL", ...Array.from(new Set(sessions.map((s) => s.track)))];

  const filteredSessions = sessions.filter((s) => {
    const matchesSearch =
      s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.speaker.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.venueName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTrack = trackFilter === "ALL" || s.track === trackFilter;
    return matchesSearch && matchesTrack;
  });

  const conflicts = sessions.filter((s) => s.hasConflict);

  const handleResolveConflict = (sessionId: string) => {
    setSessions((prev) =>
      prev.map((s) =>
        s.id === sessionId
          ? {
              ...s,
              hasConflict: false,
              conflictReason: undefined,
              capacity: s.enrolledCount + 10,
            }
          : s
      )
    );
  };

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      setFormError("Session title is required.");
      return;
    }
    if (!formData.speaker.trim()) {
      setFormError("Speaker name is required.");
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await sessionsApi.createSession({
        ...formData,
        capacity: Number(formData.capacity),
      });
      setSessions((prev) => [created, ...prev]);
      setIsAddModalOpen(false);
      setFormData({
        title: "",
        speaker: "",
        speakerRole: "",
        venueId: "R001",
        venueName: "Hall A - Grand Turing Auditorium",
        startTime: "2026-11-05T11:00:00Z",
        endTime: "2026-11-05T12:00:00Z",
        capacity: 100,
        track: "Developer Deep-Dive",
      });
      setFormError("");
    } catch {
      setFormError("Failed to save session. Try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Group by room for Room Matrix view
  const rooms = Array.from(new Set(sessions.map((s) => s.venueName)));

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-mono text-white flex items-center gap-2">
            <Calendar className="w-6 h-6 text-indigo-400" />
            Sessions & Schedule Management
          </h1>
          <p className="text-sm text-slate-400">
            Multi-track schedule coordinator, room capacity enforcement, and live conflict detection.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5 font-mono text-xs">
            <button
              onClick={() => setViewMode("TIMELINE")}
              className={`px-3 py-1.5 rounded-md transition ${
                viewMode === "TIMELINE"
                  ? "bg-indigo-600 text-white shadow-sm font-semibold"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Timeline List
            </button>
            <button
              onClick={() => setViewMode("ROOMS")}
              className={`px-3 py-1.5 rounded-md transition ${
                viewMode === "ROOMS"
                  ? "bg-indigo-600 text-white shadow-sm font-semibold"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Room Matrix
            </button>
          </div>
          <Button
            variant="primary"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => setIsAddModalOpen(true)}
          >
            Add Session
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <KPICard
          title="Total Sessions"
          value={sessions.length}
          subtitle="Scheduled Across 3 Tracks"
          icon={<Layers className="w-4 h-4 text-indigo-400" />}
        />
        <KPICard
          title="Total Attendees Enrolled"
          value={sessions.reduce((acc, s) => acc + s.enrolledCount, 0)}
          subtitle="Registered Session Seats"
          accentColor="sky"
          icon={<User className="w-4 h-4 text-sky-400" />}
        />
        <KPICard
          title="Room Occupancy"
          value={`${Math.round(
            (sessions.reduce((acc, s) => acc + s.enrolledCount, 0) /
              (sessions.reduce((acc, s) => acc + s.capacity, 0) || 1)) *
              100
          )}%`}
          subtitle="Average Hall Utilization"
          accentColor="emerald"
          icon={<CheckCircle className="w-4 h-4 text-emerald-400" />}
        />
        <KPICard
          title="Schedule Conflicts"
          value={conflicts.length}
          subtitle={conflicts.length > 0 ? "Requires Resolution" : "Zero Collisions"}
          accentColor={conflicts.length > 0 ? "rose" : "emerald"}
          icon={<AlertTriangle className="w-4 h-4 text-rose-400" />}
        />
      </div>

      {/* Conflict Alert Banner if any */}
      {conflicts.length > 0 && (
        <div className="p-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-semibold text-rose-200">
                {conflicts.length} Capacity or Schedule Conflict Detected
              </h4>
              <p className="text-xs text-rose-300/80">
                {conflicts[0].title}: {conflicts[0].conflictReason}
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant="danger"
            onClick={() => handleResolveConflict(conflicts[0].id)}
          >
            Auto-Expand Room Allocation
          </Button>
        </div>
      )}

      {/* Filter and Search Controls */}
      <div className="p-4 rounded-2xl border border-slate-800 bg-slate-900/60 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search sessions, speakers, rooms..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <span className="text-xs text-slate-400 font-mono flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5" /> Track:
          </span>
          {tracks.map((t) => (
            <button
              key={t}
              onClick={() => setTrackFilter(t)}
              className={`px-3 py-1 rounded-lg text-xs font-mono transition ${
                trackFilter === t
                  ? "bg-indigo-600/20 text-indigo-300 border border-indigo-500/40 font-semibold"
                  : "bg-slate-950 text-slate-400 border border-slate-800 hover:text-white"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Main Sessions Content */}
      {loading ? (
        <div className="p-12 text-center text-slate-500 font-mono text-sm">
          Loading sessions & conflict graph...
        </div>
      ) : filteredSessions.length === 0 ? (
        <div className="p-12 text-center rounded-2xl border border-slate-800 bg-slate-900/40 space-y-2">
          <Calendar className="w-8 h-8 text-slate-600 mx-auto" />
          <h3 className="text-sm font-semibold text-slate-300">No sessions found</h3>
          <p className="text-xs text-slate-500">Try adjusting your search query or track filter.</p>
        </div>
      ) : viewMode === "TIMELINE" ? (
        <div className="space-y-3">
          {filteredSessions.map((session) => {
            const isFull = session.enrolledCount >= session.capacity;
            const startHour = new Date(session.startTime).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            });
            const endHour = new Date(session.endTime).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            });

            return (
              <div
                key={session.id}
                className={`p-5 rounded-2xl border transition ${
                  session.hasConflict
                    ? "border-rose-500/50 bg-rose-950/20"
                    : "border-slate-800 bg-slate-900/70 hover:border-slate-700"
                }`}
              >
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-semibold">
                        {session.track}
                      </span>
                      <span className="font-mono text-xs text-slate-400 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-500" />
                        {startHour} - {endHour}
                      </span>
                      {session.hasConflict && (
                        <span className="font-mono text-xs px-2 py-0.5 rounded bg-rose-500/20 text-rose-400 border border-rose-500/40 flex items-center gap-1 font-semibold">
                          <AlertTriangle className="w-3 h-3" /> Conflict
                        </span>
                      )}
                    </div>
                    <h3 className="text-base font-semibold text-slate-100">{session.title}</h3>
                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400">
                      <span className="flex items-center gap-1 text-slate-300 font-medium">
                        <User className="w-3.5 h-3.5 text-indigo-400" />
                        {session.speaker}
                        {session.speakerRole && (
                          <span className="text-slate-500">({session.speakerRole})</span>
                        )}
                      </span>
                      <span className="flex items-center gap-1 font-mono text-slate-400">
                        <MapPin className="w-3.5 h-3.5 text-sky-400" />
                        {session.venueName}
                      </span>
                    </div>

                    {session.hasConflict && (
                      <p className="text-xs text-rose-400 font-mono mt-1">
                        Constraint Collision: {session.conflictReason}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col md:items-end gap-2 shrink-0">
                    <div className="text-right">
                      <div className="text-xs font-mono text-slate-300">
                        Enrolled:{" "}
                        <span
                          className={`font-bold ${
                            isFull ? "text-amber-400" : "text-emerald-400"
                          }`}
                        >
                          {session.enrolledCount}
                        </span>{" "}
                        / {session.capacity}
                      </div>
                      <div className="w-32 bg-slate-800 h-1.5 rounded-full overflow-hidden mt-1">
                        <div
                          className={`h-full rounded-full ${
                            isFull ? "bg-amber-500" : "bg-emerald-500"
                          }`}
                          style={{
                            width: `${Math.min(
                              100,
                              Math.round((session.enrolledCount / session.capacity) * 100)
                            )}%`,
                          }}
                        />
                      </div>
                    </div>

                    {session.hasConflict && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleResolveConflict(session.id)}
                      >
                        Resolve Constraint
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Room Matrix View */
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {rooms.map((roomName) => {
            const roomSessions = filteredSessions.filter((s) => s.venueName === roomName);
            return (
              <div
                key={roomName}
                className="p-5 rounded-2xl border border-slate-800 bg-slate-900/60 flex flex-col space-y-4"
              >
                <div className="border-b border-slate-800 pb-3">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-sky-400" />
                    {roomName}
                  </h3>
                  <span className="text-xs text-slate-400 font-mono">
                    {roomSessions.length} Scheduled Sessions
                  </span>
                </div>

                <div className="space-y-3 flex-1">
                  {roomSessions.map((s) => (
                    <div
                      key={s.id}
                      className={`p-3.5 rounded-xl border text-xs space-y-2 ${
                        s.hasConflict
                          ? "border-rose-500/40 bg-rose-950/20"
                          : "border-slate-800 bg-slate-950/70"
                      }`}
                    >
                      <div className="flex items-center justify-between text-slate-400 font-mono text-[11px]">
                        <span>
                          {new Date(s.startTime).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                        <span className="text-indigo-400">{s.track}</span>
                      </div>
                      <h4 className="font-semibold text-slate-200 line-clamp-2">{s.title}</h4>
                      <p className="text-[11px] text-slate-400">{s.speaker}</p>
                      <div className="flex items-center justify-between pt-1 border-t border-slate-800/80 font-mono text-[10px] text-slate-400">
                        <span>Capacity: {s.capacity}</span>
                        <span className={s.enrolledCount >= s.capacity ? "text-amber-400" : "text-emerald-400"}>
                          {s.enrolledCount} Enrolled
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Session Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Schedule New Session"
      >
        <form onSubmit={handleCreateSession} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400 font-mono">
              {formError}
            </div>
          )}

          <div>
            <label className="block text-xs font-mono text-slate-300 mb-1">Session Title *</label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g. Modern Constraint Solving at Scale"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-mono text-slate-300 mb-1">Speaker Name *</label>
              <Input
                value={formData.speaker}
                onChange={(e) => setFormData({ ...formData, speaker: e.target.value })}
                placeholder="Dr. Maya Lin"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-mono text-slate-300 mb-1">Speaker Title / Role</label>
              <Input
                value={formData.speakerRole}
                onChange={(e) => setFormData({ ...formData, speakerRole: e.target.value })}
                placeholder="Lead Researcher"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-mono text-slate-300 mb-1">Assigned Hall / Venue</label>
              <Select
                value={formData.venueName}
                onChange={(e) => {
                  const name = e.target.value;
                  const id = name.includes("Hall A") ? "R001" : name.includes("Hall B") ? "R002" : "R003";
                  setFormData({ ...formData, venueName: name, venueId: id });
                }}
                options={[
                  { value: "Hall A - Grand Turing Auditorium", label: "Hall A (Grand Turing Auditorium)" },
                  { value: "Hall B - Lovelace Innovation Suite", label: "Hall B (Lovelace Suite)" },
                  { value: "Lab 101 - Von Neumann Suite", label: "Lab 101 (Von Neumann)" },
                ]}
              />
            </div>
            <div>
              <label className="block text-xs font-mono text-slate-300 mb-1">Program Track</label>
              <Select
                value={formData.track}
                onChange={(e) => setFormData({ ...formData, track: e.target.value })}
                options={[
                  { value: "Keynote & Plenary", label: "Keynote & Plenary" },
                  { value: "Cloud & Security", label: "Cloud & Security" },
                  { value: "Developer Deep-Dive", label: "Developer Deep-Dive" },
                  { value: "Executive Strategy", label: "Executive Strategy" },
                  { value: "Data & Storage", label: "Data & Storage" },
                ]}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-mono text-slate-300 mb-1">Seat Capacity</label>
              <Input
                type="number"
                value={formData.capacity}
                onChange={(e) => setFormData({ ...formData, capacity: Number(e.target.value) })}
                min={10}
                max={1000}
              />
            </div>
            <div>
              <label className="block text-xs font-mono text-slate-300 mb-1">Time Slot Window</label>
              <Select
                value={formData.startTime}
                onChange={(e) => {
                  const start = e.target.value;
                  const end = start.replace("11:00", "12:00").replace("14:00", "15:00").replace("16:00", "17:00");
                  setFormData({ ...formData, startTime: start, endTime: end });
                }}
                options={[
                  { value: "2026-11-05T11:00:00Z", label: "11:00 AM - 12:00 PM" },
                  { value: "2026-11-05T14:00:00Z", label: "02:00 PM - 03:00 PM" },
                  { value: "2026-11-05T16:00:00Z", label: "04:00 PM - 05:00 PM" },
                ]}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsAddModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              Schedule Session
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
