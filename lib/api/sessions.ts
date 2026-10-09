import { EventSession } from "@/types";
import { USE_MOCK_API } from "./client";
import { eventModuleApi, activeEventId } from "./module-records";

export const mockSessions: EventSession[] = [
  {
    id: "ses-01",
    eventId: "evt-02",
    title: "Keynote: Autonomous Agents & Constraint-Based Operations",
    speaker: "Dr. Maya Lin",
    speakerRole: "VP AI Research, Turing Intelligence",
    venueId: "R001",
    venueName: "Hall A - Grand Turing Auditorium",
    startTime: "2026-11-05T09:30:00Z",
    endTime: "2026-11-05T10:45:00Z",
    capacity: 250,
    enrolledCount: 245,
    track: "Keynote & Plenary",
  },
  {
    id: "ses-02",
    eventId: "evt-02",
    title: "Breakout: Zero-Trust Multi-Tenant Architecture in Healthcare",
    speaker: "David Thorne",
    speakerRole: "Chief Security Architect, Nexus Shield",
    venueId: "R002",
    venueName: "Hall B - Lovelace Innovation Suite",
    startTime: "2026-11-05T11:00:00Z",
    endTime: "2026-11-05T12:15:00Z",
    capacity: 80,
    enrolledCount: 78,
    track: "Cloud & Security",
  },
  {
    id: "ses-03",
    eventId: "evt-02",
    title: "Hands-on Workshop: CP-SAT Constraint Programming in Practice",
    speaker: "Alex Sterling & Team",
    speakerRole: "Operations Lead, EventOps",
    venueId: "R003",
    venueName: "Lab 101 - Von Neumann Suite",
    startTime: "2026-11-05T11:00:00Z",
    endTime: "2026-11-05T12:30:00Z",
    capacity: 40,
    enrolledCount: 45,
    track: "Developer Deep-Dive",
    hasConflict: true,
    conflictReason: "Capacity Overrun: 45 enrolled exceeds room capacity of 40",
  },
  {
    id: "ses-04",
    eventId: "evt-02",
    title: "Panel: Scaling Generative AI from Prototype to Production",
    speaker: "Panel of 4 Enterprise CTOs",
    speakerRole: "Industry Leaders",
    venueId: "R001",
    venueName: "Hall A - Grand Turing Auditorium",
    startTime: "2026-11-05T14:00:00Z",
    endTime: "2026-11-05T15:30:00Z",
    capacity: 250,
    enrolledCount: 190,
    track: "Executive Strategy",
  },
  {
    id: "ses-05",
    eventId: "evt-02",
    title: "Sponsor Tech Talk: Next-Gen Vector Storage & RAG Pipelines",
    speaker: "Elena Rostova",
    speakerRole: "Lead Evangelist, PineDB",
    venueId: "R002",
    venueName: "Hall B - Lovelace Innovation Suite",
    startTime: "2026-11-05T14:00:00Z",
    endTime: "2026-11-05T15:00:00Z",
    capacity: 80,
    enrolledCount: 65,
    track: "Data & Storage",
  },
];

/**
 * Sessions & Schedule API Domain Service
 * 
 * TODO: Wire to FastAPI backend endpoints when implemented:
 * - GET /api/v1/events/{id}/sessions
 * - POST /api/v1/events/{id}/sessions
 * - PATCH /api/v1/events/{id}/sessions/{session_id}
 * - GET /api/v1/events/{id}/sessions/conflicts
 */
export const sessionsApi = {
  async getSessions(eventId?: string): Promise<EventSession[]> {
    if (!USE_MOCK_API) return await eventModuleApi.list<EventSession>("sessions", activeEventId(eventId));
    await new Promise((r) => setTimeout(r, 200));
    return [...mockSessions];
  },

  async createSession(data: Partial<EventSession>): Promise<EventSession> {
    if (!USE_MOCK_API) return await eventModuleApi.create<EventSession>("sessions", data, data.eventId || activeEventId());
    await new Promise((r) => setTimeout(r, 300));
    const newSession: EventSession = {
      id: `ses-${Date.now().toString().slice(-4)}`,
      eventId: data.eventId || "evt-02",
      title: data.title || "Untitled Session",
      speaker: data.speaker || "Guest Speaker",
      speakerRole: data.speakerRole || "Speaker",
      venueId: data.venueId || "R001",
      venueName: data.venueName || "Hall A",
      startTime: data.startTime || new Date().toISOString(),
      endTime: data.endTime || new Date(Date.now() + 3600000).toISOString(),
      capacity: data.capacity || 50,
      enrolledCount: 0,
      track: data.track || "General Track",
    };
    mockSessions.push(newSession);
    return newSession;
  },

  async updateSession(id: string, updates: Partial<EventSession>): Promise<EventSession> {
    if (!USE_MOCK_API) return await eventModuleApi.update<EventSession>("sessions", id, updates);
    await new Promise((r) => setTimeout(r, 200));
    const idx = mockSessions.findIndex((s) => s.id === id);
    if (idx !== -1) {
      mockSessions[idx] = { ...mockSessions[idx], ...updates };
      return mockSessions[idx];
    }
    return mockSessions[0];
  },

  async checkConflicts(): Promise<{ count: number; conflicts: string[] }> {
    if (!USE_MOCK_API) {
      const sessions = await eventModuleApi.list<EventSession>("sessions", activeEventId());
      const conflicts: string[] = [];
      for (let i = 0; i < sessions.length; i++) for (let j = i + 1; j < sessions.length; j++) {
        const a = sessions[i], b = sessions[j];
        if (a.venueId === b.venueId && new Date(a.startTime) < new Date(b.endTime) && new Date(b.startTime) < new Date(a.endTime)) conflicts.push(`${a.title} overlaps ${b.title} at ${a.venueName}`);
      }
      return { count: conflicts.length, conflicts };
    }
    await new Promise((r) => setTimeout(r, 150));
    const conflicts = mockSessions
      .filter((s) => s.hasConflict)
      .map((s) => `${s.title}: ${s.conflictReason}`);
    return {
      count: conflicts.length,
      conflicts,
    };
  },
};
