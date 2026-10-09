import { Team, CheckInStatus } from "@/types";
import { mockTeams } from "@/lib/mock-data/teams";
import { teamsApi } from "./teams";
import { apiClient, USE_MOCK_API } from "./client";
import { sessionService } from "@/lib/auth/session";
const activeEventId = (fallback = "evt-01") => sessionService.getStoredWorkspace()?.eventId || fallback;

export interface ScanResult {
  status: "SUCCESS" | "DUPLICATE" | "INVALID";
  team?: Team;
  message: string;
  scannedAt: string;
  previousCheckInTime?: string;
  stationName?: string;
}

export interface CheckInAuditRecord {
  id: string;
  teamId: string;
  teamName: string;
  status: "CHECKED_IN" | "REVERTED" | "MANUAL_OVERRIDE";
  timestamp: string;
  staffName: string;
  station: string;
  notes?: string;
}

const auditLog: CheckInAuditRecord[] = [
  {
    id: "aud-01",
    teamId: "T042",
    teamName: "BioSense",
    status: "CHECKED_IN",
    timestamp: "2026-10-15T08:14:22Z",
    staffName: "Volunteer Unit 4",
    station: "West Entrance Turnstile A",
  },
  {
    id: "aud-02",
    teamId: "T001",
    teamName: "NeuralPulse",
    status: "CHECKED_IN",
    timestamp: "2026-10-15T08:18:05Z",
    staffName: "Alex Sterling (Admin)",
    station: "VIP / Fast-Track Desk",
  },
  {
    id: "aud-03",
    teamId: "T018",
    teamName: "HyperLedger AI",
    status: "CHECKED_IN",
    timestamp: "2026-10-15T08:29:40Z",
    staffName: "Volunteer Unit 2",
    station: "Main Lobby Desk 1",
  },
];

/**
 * Attendance & Check-in API Domain Service
 * 
 * TODO: Wire to FastAPI backend endpoints when implemented:
 * - GET /api/v1/events/{id}/attendance/summary
 * - POST /api/v1/events/{id}/attendance/scan
 * - POST /api/v1/events/{id}/attendance/manual
 * - POST /api/v1/events/{id}/attendance/revert
 * - GET /api/v1/events/{id}/attendance/audit-log
 */
export const attendanceApi = {
  async getSummary(eventId: string) {
    if (!USE_MOCK_API) return await apiClient(`/api/v1/events/${activeEventId(eventId)}/attendance/summary`);
    await new Promise((r) => setTimeout(r, 150));
    const teams = mockTeams;
    const total = teams.length;
    const checkedIn = teams.filter((t) => t.checkInStatus === "CHECKED_IN").length;
    const absent = teams.filter((t) => t.checkInStatus === "ABSENT").length;
    const notCheckedIn = teams.filter((t) => t.checkInStatus === "NOT_CHECKED_IN").length;

    return {
      total,
      checkedIn,
      absent,
      remaining: total - checkedIn,
      attendanceRatePct: Math.round((checkedIn / (total || 1)) * 100),
    };
  },

  async scanTicket(token: string): Promise<ScanResult> {
    if (!USE_MOCK_API) return await apiClient<ScanResult>(`/api/v1/events/${activeEventId()}/attendance/scan`, { method: "POST", body: JSON.stringify({ token }) });
    await new Promise((r) => setTimeout(r, 350));
    const cleanToken = token.trim();

    if (cleanToken.toUpperCase().includes("INVALID") || cleanToken === "000000") {
      return {
        status: "INVALID",
        message: "Invalid ticket credential: QR token not found in event registry or cryptographic signature mismatch.",
        scannedAt: new Date().toISOString(),
      };
    }

    if (cleanToken.toUpperCase().includes("DUPLICATE") || cleanToken === "DUP-TEST") {
      const team = mockTeams.find((t) => t.checkInStatus === "CHECKED_IN") || mockTeams[0];
      return {
        status: "DUPLICATE",
        team,
        message: `DUPLICATE TICKET WARNING: ${team.name} (${team.id}) was already scanned and verified earlier!`,
        scannedAt: new Date().toISOString(),
        previousCheckInTime: team.checkedInTime || "08:14 AM",
        stationName: "Turnstile A - West Gate",
      };
    }

    // Lookup team by token or ID
    const team =
      mockTeams.find((t) => t.qrCodeToken === cleanToken) ||
      mockTeams.find((t) => t.id.toLowerCase() === cleanToken.toLowerCase()) ||
      mockTeams[0];

    if (team.checkInStatus === "CHECKED_IN") {
      return {
        status: "DUPLICATE",
        team,
        message: `ALREADY CHECKED IN: Team ${team.name} was scanned earlier at ${team.checkedInTime || "08:14 AM"}.`,
        scannedAt: new Date().toISOString(),
        previousCheckInTime: team.checkedInTime || "08:14 AM",
        stationName: "Station Desk 1",
      };
    }

    // Mark as checked in
    team.checkInStatus = "CHECKED_IN";
    team.checkedInTime = new Date().toLocaleTimeString();

    auditLog.unshift({
      id: `aud-${Date.now()}`,
      teamId: team.id,
      teamName: team.name,
      status: "CHECKED_IN",
      timestamp: new Date().toISOString(),
      staffName: "Current Staff",
      station: "QR Scanner Desk",
    });

    return {
      status: "SUCCESS",
      team,
      message: `Verified: ${team.name} successfully checked in. Allocated to ${team.assignedVenueName || team.assignedVenue} Bench ${team.assignedBench}.`,
      scannedAt: new Date().toISOString(),
    };
  },

  async manualLookup(query: string): Promise<Team[]> {
    if (!USE_MOCK_API) return await apiClient<Team[]>(`/api/v1/events/${activeEventId()}/attendance/search?q=${encodeURIComponent(query)}`);
    await new Promise((r) => setTimeout(r, 200));
    const q = query.trim().toLowerCase();
    if (!q) return mockTeams.slice(0, 10);
    return mockTeams.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.id.toLowerCase().includes(q) ||
        t.leadName.toLowerCase().includes(q) ||
        t.leadEmail.toLowerCase().includes(q)
    );
  },

  async manualCheckIn(teamId: string, notes?: string): Promise<Team> {
    if (!USE_MOCK_API) return await apiClient<Team>(`/api/v1/events/${activeEventId()}/attendance/${teamId}/manual`, { method: "POST", body: JSON.stringify({ notes }) });
    await new Promise((r) => setTimeout(r, 250));
    const team = mockTeams.find((t) => t.id === teamId);
    if (!team) throw new Error("Team not found");

    team.checkInStatus = "CHECKED_IN";
    team.checkedInTime = new Date().toLocaleTimeString();

    auditLog.unshift({
      id: `aud-${Date.now()}`,
      teamId: team.id,
      teamName: team.name,
      status: "MANUAL_OVERRIDE",
      timestamp: new Date().toISOString(),
      staffName: "Staff Lead",
      station: "Admin Helpdesk",
      notes: notes || "Manual verification override by desk lead",
    });

    return { ...team };
  },

  async revertCheckIn(teamId: string, reason: string): Promise<Team> {
    if (!USE_MOCK_API) return await apiClient<Team>(`/api/v1/events/${activeEventId()}/attendance/${teamId}/revert`, { method: "POST", body: JSON.stringify({ reason }) });
    await new Promise((r) => setTimeout(r, 250));
    const team = mockTeams.find((t) => t.id === teamId);
    if (!team) throw new Error("Team not found");

    team.checkInStatus = "ABSENT";
    team.checkedInTime = undefined;

    auditLog.unshift({
      id: `aud-${Date.now()}`,
      teamId: team.id,
      teamName: team.name,
      status: "REVERTED",
      timestamp: new Date().toISOString(),
      staffName: "Staff Lead",
      station: "Admin Helpdesk",
      notes: reason || "Corrective reversal: mistakenly scanned",
    });

    return { ...team };
  },

  async getAuditLog(): Promise<CheckInAuditRecord[]> {
    if (!USE_MOCK_API) return await apiClient<CheckInAuditRecord[]>(`/api/v1/events/${activeEventId()}/attendance/audit-log`);
    await new Promise((r) => setTimeout(r, 150));
    return [...auditLog];
  },
};


