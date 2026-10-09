import { Team, CheckInStatus } from "@/types";
import { mockTeams } from "@/lib/mock-data/teams";
import { apiClient, USE_MOCK_API } from "./client";
import { sessionService } from "@/lib/auth/session";

function activeEventId(fallback = "") {
  const eventId = fallback || sessionService.getStoredWorkspace()?.eventId;
  if (!eventId || eventId === "evt-01") throw new Error("Select a real event in Workspace first.");
  return eventId;
}

export const teamsApi = {
  async getAll(eventId = ""): Promise<Team[]> {
    if (!USE_MOCK_API) return await apiClient<Team[]>(`/api/v1/events/${activeEventId(eventId)}/registrations`);
    await new Promise((r) => setTimeout(r, 200));
    return mockTeams.filter((t) => !eventId || t.eventId === eventId);
  },

  async getById(id: string): Promise<Team | undefined> {
    if (!USE_MOCK_API) return await apiClient<Team>(`/api/v1/events/${activeEventId()}/registrations/${id}`);
    await new Promise((r) => setTimeout(r, 150));
    return mockTeams.find((t) => t.id === id);
  },

  async register(data: Partial<Team>): Promise<Team> {
    if (!USE_MOCK_API) {
      const eventId = data.eventId || activeEventId();
      return await apiClient<Team>(`/api/v1/events/${eventId}/registrations`, { method: "POST", body: JSON.stringify(data) });
    }
    await new Promise((r) => setTimeout(r, 350));
    const newId = `T${(mockTeams.length + 1).toString().padStart(3, "0")}`;
    const newTeam: Team = {
      id: newId,
      eventId: data.eventId || "evt-01",
      name: data.name || `Team ${newId}`,
      leadName: data.leadName || "Lead Developer",
      leadEmail: data.leadEmail || `lead.${newId.toLowerCase()}@innovate.dev`,
      members: data.members || [],
      project: data.project || {
        title: "Enterprise AI Platform",
        abstract: "AI-powered edge computing orchestration system.",
        domain: "AI / Machine Learning",
        techStack: ["React", "Python"],
      },
      registrationStatus: "APPROVED",
      checkInStatus: "NOT_CHECKED_IN",
      assignedJudges: [],
      currentRound: 1,
      qrCodeToken: `EVENTOPS_QR_EVT01_${newId}_SECURE_TOKEN_2026`,
    };
    mockTeams.unshift(newTeam);
    return newTeam;
  },

  async updateCheckIn(teamId: string, status: CheckInStatus): Promise<Team> {
    if (!USE_MOCK_API) {
      const eventId = activeEventId();
      if (status === "CHECKED_IN") return await apiClient<Team>(`/api/v1/events/${eventId}/attendance/${teamId}/manual`, { method: "POST", body: JSON.stringify({ notes: "Updated from team roster" }) });
      return await apiClient<Team>(`/api/v1/events/${eventId}/attendance/${teamId}/revert`, { method: "POST", body: JSON.stringify({ reason: `Status changed to ${status}` }) });
    }
    await new Promise((r) => setTimeout(r, 200));
    const team = mockTeams.find((t) => t.id === teamId);
    if (team) {
      team.checkInStatus = status;
      team.checkedInTime = status === "CHECKED_IN" ? new Date().toISOString() : undefined;
      team.members.forEach((m) => {
        m.checkInStatus = status === "CHECKED_IN" ? "CHECKED_IN" : "ABSENT";
        m.checkedInAt = team.checkedInTime;
      });
      return { ...team };
    }
    throw new Error("Team not found");
  },

  async scanQrToken(token: string): Promise<{ success: boolean; team: Team; message: string }> {
    if (!USE_MOCK_API) {
      const result = await apiClient<{ status: string; team?: Team; message: string }>(`/api/v1/events/${activeEventId()}/attendance/scan`, { method: "POST", body: JSON.stringify({ token }) });
      if (!result.team) throw new Error(result.message);
      return { success: result.status === "SUCCESS", team: result.team, message: result.message };
    }
    await new Promise((r) => setTimeout(r, 300));
    // Find team by token or match ID
    const match = mockTeams.find((t) => t.qrCodeToken === token || token.includes(t.id));
    if (match) {
      match.checkInStatus = "CHECKED_IN";
      match.checkedInTime = new Date().toISOString();
      match.members.forEach((m) => {
        m.checkInStatus = "CHECKED_IN";
        m.checkedInAt = match.checkedInTime;
      });
      return {
        success: true,
        team: { ...match },
        message: `Successfully checked in ${match.name} (${match.id}).`,
      };
    }
    // Fallback: check in first team if test string
    const fallback = mockTeams[0];
    fallback.checkInStatus = "CHECKED_IN";
    fallback.checkedInTime = new Date().toISOString();
    return {
      success: true,
      team: { ...fallback },
      message: `Verified and checked in ${fallback.name} (${fallback.id}).`,
    };
  },
};

export const attendanceApi = {
  async getMetrics(eventId = "evt-01") {
    if (!USE_MOCK_API) {
      const event = activeEventId(eventId);
      const [summary, teams] = await Promise.all([apiClient<any>(`/api/v1/events/${event}/attendance/summary`), teamsApi.getAll(event)]);
      return { total: summary.total, checkedIn: summary.checkedIn, partial: 0, absent: summary.absent, checkInRatePct: summary.attendanceRatePct, recentCheckIns: teams.filter((team) => team.checkedInTime).slice(0, 10) };
    }
    await new Promise((r) => setTimeout(r, 200));
    const teams = mockTeams.filter((t) => !eventId || t.eventId === eventId);
    const total = teams.length;
    const checkedIn = teams.filter((t) => t.checkInStatus === "CHECKED_IN").length;
    const partial = teams.filter((t) => t.checkInStatus === "PARTIAL").length;
    const absent = teams.filter((t) => t.checkInStatus === "ABSENT" || t.checkInStatus === "NOT_CHECKED_IN").length;
    return {
      total,
      checkedIn,
      partial,
      absent,
      checkInRatePct: Math.round(((checkedIn + partial * 0.5) / total) * 100),
      recentCheckIns: teams.filter((t) => t.checkedInTime).slice(0, 10),
    };
  },
};


