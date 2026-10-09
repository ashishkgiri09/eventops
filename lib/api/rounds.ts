import { EventRound, Team } from "@/types";
import { mockEvents } from "@/lib/mock-data/events";
import { mockTeams } from "@/lib/mock-data/teams";
import { apiClient, USE_MOCK_API } from "./client";
import { sessionService } from "@/lib/auth/session";
const activeEventId = (fallback = "evt-01") => sessionService.getStoredWorkspace()?.eventId || fallback;

export const roundsApi = {
  async getRounds(eventId = "evt-01"): Promise<EventRound[]> {
    if (!USE_MOCK_API) return await apiClient<EventRound[]>(`/api/v1/events/${activeEventId(eventId)}/rounds`);
    await new Promise((r) => setTimeout(r, 150));
    const event = mockEvents.find((e) => e.id === eventId);
    return event ? event.rounds : [];
  },

  async advanceTeams(roundId: string, qualifyingCount = 48): Promise<{ advancedTeams: Team[]; nextRound: number }> {
    if (!USE_MOCK_API) return await apiClient(`/api/v1/events/${activeEventId()}/rounds/advance`, { method: "POST", body: JSON.stringify({ roundId, qualifyingCount }) });
    await new Promise((r) => setTimeout(r, 350));
    // Sort teams by totalScore desc
    const sorted = [...mockTeams].sort((a, b) => (b.totalScore || 0) - (a.totalScore || 0));
    const qualified = sorted.slice(0, qualifyingCount);

    qualified.forEach((t) => {
      t.currentRound = 2;
    });

    const event = mockEvents.find((e) => e.id === "evt-01");
    if (event) {
      event.currentRound = 2;
    }

    return {
      advancedTeams: qualified,
      nextRound: 2,
    };
  },

  async getLeaderboard(eventId = "evt-01", roundOrder = 1): Promise<Team[]> {
    if (!USE_MOCK_API) return await apiClient<Team[]>(`/api/v1/events/${activeEventId(eventId)}/rounds/leaderboard?roundOrder=${roundOrder}`);
    await new Promise((r) => setTimeout(r, 150));
    return [...mockTeams]
      .filter((t) => t.eventId === eventId)
      .sort((a, b) => (b.totalScore || 0) - (a.totalScore || 0))
      .map((t, idx) => ({ ...t, rank: idx + 1 }));
  },
};
