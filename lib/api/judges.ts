import { Judge, JudgeWorkloadStatus } from "@/types";
import { mockJudges } from "@/lib/mock-data/judges";
import { apiClient, USE_MOCK_API } from "./client";
import { sessionService } from "@/lib/auth/session";
const activeEventId = (fallback = "") => {
  const eventId = fallback || sessionService.getStoredWorkspace()?.eventId;
  if (!eventId || eventId === "evt-01") throw new Error("Select a real event in Workspace before managing judges.");
  return eventId;
};

const normalizeJudge = (judge: Judge): Judge => ({
  ...judge,
  expertise: Array.isArray(judge.expertise) ? judge.expertise : [],
  domains: Array.isArray(judge.domains) ? judge.domains : [],
  assignedTeams: Array.isArray(judge.assignedTeams) ? judge.assignedTeams : [],
  conflicts: Array.isArray(judge.conflicts) ? judge.conflicts : [],
  workload: Number.isFinite(judge.workload) ? judge.workload : 0,
  maxTeamCapacity: Number.isFinite(judge.maxTeamCapacity) ? judge.maxTeamCapacity : 0,
});

export const judgesApi = {
  async getAll(eventId = ""): Promise<Judge[]> {
    if (!USE_MOCK_API) return (await apiClient<Judge[]>(`/api/v1/events/${activeEventId(eventId)}/judging/judges`)).map(normalizeJudge);
    await new Promise((r) => setTimeout(r, 200));
    return mockJudges.filter((j) => !eventId || j.eventId === eventId);
  },

  async getById(id: string): Promise<Judge | undefined> {
    if (!USE_MOCK_API) {
      const judge = (await apiClient<Judge[]>(`/api/v1/events/${activeEventId()}/judging/judges`)).find((item) => item.id === id);
      return judge ? normalizeJudge(judge) : undefined;
    }
    await new Promise((r) => setTimeout(r, 150));
    return mockJudges.find((j) => j.id === id);
  },

  async create(data: Partial<Judge>): Promise<Judge> {
    if (!USE_MOCK_API) {
      const eventId = data.eventId || activeEventId();
      const judge = await apiClient<Judge>(`/api/v1/events/${eventId}/judging/judges`, { method: "POST", body: JSON.stringify({ ...data, eventId }) });
      return normalizeJudge(judge);
    }
    await new Promise((r) => setTimeout(r, 300));
    const newId = `J${(mockJudges.length + 1).toString().padStart(3, "0")}`;
    const newJudge: Judge = {
      id: newId,
      eventId: data.eventId || "evt-01",
      name: data.name || "Dr. Guest Evaluator",
      organization: data.organization || "Independent Tech Council",
      designation: data.designation || "Senior Technical Advisor",
      expertise: data.expertise || ["AI / Machine Learning"],
      domains: data.domains || ["AI / Machine Learning"],
      assignedTeams: [],
      maxTeamCapacity: data.maxTeamCapacity || 8,
      availability: data.availability || "FULL_TIME",
      availableSlots: ["Slot A", "Slot B"],
      workload: 0,
      workloadStatus: "AVAILABLE",
      conflicts: [],
    };
    mockJudges.push(newJudge);
    return newJudge;
  },

  async updateStatus(judgeId: string, status: JudgeWorkloadStatus): Promise<Judge> {
    if (!USE_MOCK_API) return await apiClient<Judge>(`/api/v1/events/${activeEventId()}/judging/judges/${judgeId}`, { method: "PATCH", body: JSON.stringify({ isActive: status !== "UNAVAILABLE" }) });
    await new Promise((r) => setTimeout(r, 150));
    const judge = mockJudges.find((j) => j.id === judgeId);
    if (judge) {
      judge.workloadStatus = status;
      return { ...judge };
    }
    throw new Error("Judge not found");
  },
};



