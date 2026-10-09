import {
  HardConstraint,
  SoftConstraint,
  OptimizationConfig,
  OptimizationResults,
} from "@/types";
import {
  defaultHardConstraints,
  defaultSoftConstraints,
  defaultOptimizationConfig,
  mockOptimizationResults,
  mockAllocationMatrix,
} from "@/lib/mock-data/allocations";
import { mockTeams } from "@/lib/mock-data/teams";
import { apiClient, USE_MOCK_API } from "./client";
import { sessionService } from "@/lib/auth/session";
import { teamsApi } from "./teams";
import { judgesApi } from "./judges";
import { eventsApi } from "./events";

const activeEventId = () => sessionService.getStoredWorkspace()?.eventId || "evt-01";
let latestRunId: string | null = null;

function mapAllocationRun(run: any, teams: any[]): OptimizationResults {
  const grouped = new Map<string, any[]>();
  for (const assignment of run.assignments || []) {
    const key = assignment.targetId;
    grouped.set(key, [...(grouped.get(key) || []), assignment]);
  }
  const matrix = [...grouped.entries()].map(([targetId, rows]) => {
    const first = rows[0];
    const team = teams.find((item) => item.id === first.externalId);
    return {
      id: targetId,
      teamId: first.externalId || targetId,
      teamName: team?.name || first.targetName,
      domain: first.domain || team?.project?.domain || "",
      venueId: team?.assignedVenue || "",
      venueName: team?.assignedVenueName || first.venue || "",
      benchId: team?.assignedBench || "",
      benchLabel: team?.assignedBench || "Not assigned",
      judgeIds: rows.map((item) => item.judgeId),
      judgeNames: rows.map((item) => item.judgeName),
      timeSlot: first.slot,
      round: first.round,
      status: run.solverStatus === "optimal" ? "OPTIMAL" : "CONFLICT_RESOLVED",
      score: Math.round(rows.reduce((sum, item) => sum + item.matchScore, 0) / rows.length),
      satisfactionNotes: `Average expertise match: ${Math.round(rows.reduce((sum, item) => sum + item.matchScore, 0) / rows.length)}%.`
    };
  });
  const loads = new Map<string, number>();
  for (const assignment of run.assignments || []) loads.set(assignment.judgeId, (loads.get(assignment.judgeId) || 0) + 1);
  const values = [...loads.values()];
  const mean = values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
  const deviation = values.length ? Math.sqrt(values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length) : 0;
  const score = matrix.length ? Math.round(matrix.reduce((sum, row) => sum + row.score, 0) / matrix.length) : 0;
  return {
    totalTeamsAllocated: matrix.length,
    unallocatedTeamsCount: Math.max(0, teams.length - matrix.length),
    hardConstraintViolations: run.solverStatus === "optimal" || run.solverStatus === "feasible" ? 0 : 1,
    softConstraintSatisfactionPct: score,
    overallScorePct: score,
    judgeWorkloadStandardDeviation: deviation,
    venueUtilizationPct: 0,
    runtimeMs: 0,
    matrix,
    conflicts: run.solverStatus === "infeasible" ? [run.summary?.reason || "Constraints are infeasible."] : [],
    aiInsights: ["Judge expertise fit was ranked with local TF-IDF text similarity and optimized with workload and availability constraints."]
  } as OptimizationResults;
}

let currentHardConstraints = [...defaultHardConstraints];
let currentSoftConstraints = [...defaultSoftConstraints];
let currentConfig = { ...defaultOptimizationConfig };
let currentResults = { ...mockOptimizationResults };

export const allocationApi = {
  async getRequirements() {
    if (!USE_MOCK_API) {
      const eventId = activeEventId();
      const [teams, judges, event, targets] = await Promise.all([teamsApi.getAll(eventId), judgesApi.getAll(eventId), eventsApi.getById(eventId), apiClient<any[]>(`/api/v1/events/${eventId}/judging/targets`)]);
      const domainBreakdown: Record<string, number> = {};
      for (const team of teams) {
        const domain = team.project?.domain || "Unspecified";
        domainBreakdown[domain] = (domainBreakdown[domain] || 0) + 1;
      }
      return { totalEligibleTeams: teams.length, activeVenues: event?.venuesCount || 0, totalBenches: 0, availableJudges: judges.filter((judge) => judge.workloadStatus !== "UNAVAILABLE").length, timeSlotsCount: event?.timeSlots?.length || new Set(targets.map((target) => target.slot)).size, domainBreakdown, hardwareDemands: { dedicatedHighPower: 0, isolatedRfSubnet: 0, dualMonitorPulpit: 0 } };
    }
    await new Promise((r) => setTimeout(r, 150));
    return {
      totalEligibleTeams: 120,
      activeVenues: 24,
      totalBenches: 120,
      availableJudges: 20,
      timeSlotsCount: 4,
      domainBreakdown: {
        "AI / Machine Learning": 28,
        "Distributed Systems / Web3": 20,
        "FinTech & Payments": 18,
        "HealthTech & Bio": 16,
        "IoT & Robotics": 14,
        "CleanTech & Green Energy": 12,
        "CyberSecurity": 12,
      },
      hardwareDemands: {
        dedicatedHighPower: 18,
        isolatedRfSubnet: 8,
        dualMonitorPulpit: 24,
      },
    };
  },

  async getConstraints(): Promise<{ hard: HardConstraint[]; soft: SoftConstraint[] }> {
    await new Promise((r) => setTimeout(r, 150));
    return {
      hard: currentHardConstraints,
      soft: currentSoftConstraints,
    };
  },

  async updateHardConstraint(id: string, enabled: boolean): Promise<HardConstraint[]> {
    currentHardConstraints = currentHardConstraints.map((c) =>
      c.id === id ? { ...c, enabled } : c
    );
    return currentHardConstraints;
  },

  async updateSoftConstraint(id: string, weight: number, enabled?: boolean): Promise<SoftConstraint[]> {
    currentSoftConstraints = currentSoftConstraints.map((c) =>
      c.id === id ? { ...c, weight, enabled: enabled ?? c.enabled } : c
    );
    return currentSoftConstraints;
  },

  async getConfig(): Promise<OptimizationConfig> {
    await new Promise((r) => setTimeout(r, 100));
    return { ...currentConfig };
  },

  async updateConfig(cfg: Partial<OptimizationConfig>): Promise<OptimizationConfig> {
    currentConfig = { ...currentConfig, ...cfg };
    return { ...currentConfig };
  },

  async runOptimization(): Promise<OptimizationResults> {
    if (!USE_MOCK_API) {
      const eventId = activeEventId();
      const [teams, judges, event, targets] = await Promise.all([teamsApi.getAll(eventId), judgesApi.getAll(eventId), eventsApi.getById(eventId), apiClient<any[]>(`/api/v1/events/${eventId}/judging/targets`)]);
      const existing = new Set(targets.map((target) => target.externalId).filter(Boolean));
      const slots = event?.timeSlots?.length ? event.timeSlots : [{ label: "Slot A" }];
      for (let index = 0; index < teams.length; index++) {
        const team = teams[index];
        if (existing.has(team.id)) continue;
        const slot = slots[index % slots.length];
        await apiClient(`/api/v1/events/${eventId}/judging/targets`, { method: "POST", body: JSON.stringify({ name: team.name, externalId: team.id, domain: team.project?.domain || "", slot: slot.label || ("id" in slot ? slot.id : undefined) || `Slot ${index + 1}`, roundNumber: team.currentRound || 1, judgesRequired: 2, venue: team.assignedVenueName || "" }) });
      }
      const cfg = currentConfig;
      const run = await apiClient<any>(`/api/v1/events/${eventId}/judging/optimize`, { method: "POST", body: JSON.stringify({ maxRuntimeSeconds: cfg.maxRuntimeSeconds, domainMatchWeight: cfg.domainMatchWeight, balanceWorkloadWeight: cfg.balanceJudgeWorkloadWeight }) });
      latestRunId = run.id;
      currentResults = mapAllocationRun(run, teams);
      return currentResults;
    }
    // Simulate CP-SAT execution delay
    await new Promise((r) => setTimeout(r, 1200));

    const simulatedResults: OptimizationResults = {
      ...mockOptimizationResults,
      runtimeMs: 1350 + Math.floor(Math.random() * 200),
      softConstraintSatisfactionPct: 97.4,
      overallScorePct: 98.6,
      matrix: [...mockAllocationMatrix],
    };
    currentResults = simulatedResults;
    return simulatedResults;
  },

  async getLatestResults(): Promise<OptimizationResults> {
    if (!USE_MOCK_API) {
      const eventId = activeEventId();
      const [run, teams] = await Promise.all([apiClient<any>(`/api/v1/events/${eventId}/judging/results/latest`), teamsApi.getAll(eventId)]);
      latestRunId = run.id;
      currentResults = mapAllocationRun(run, teams);
      return currentResults;
    }
    await new Promise((r) => setTimeout(r, 150));
    return currentResults;
  },

  async applyAllocation(): Promise<{ success: boolean; appliedCount: number }> {
    if (!USE_MOCK_API) {
      const eventId = activeEventId();
      const run = latestRunId ? { id: latestRunId } : await apiClient<any>(`/api/v1/events/${eventId}/judging/results/latest`);
      await apiClient(`/api/v1/events/${eventId}/judging/runs/accept`, { method: "POST", body: JSON.stringify({ runId: run.id }) });
      return { success: true, appliedCount: currentResults.matrix.length };
    }
    await new Promise((r) => setTimeout(r, 400));
    // Apply simulated allocations to mock teams
    currentResults.matrix.forEach((row) => {
      const team = mockTeams.find((t) => t.id === row.teamId);
      if (team) {
        team.assignedVenue = row.venueId;
        team.assignedVenueName = row.venueName;
        team.assignedBench = row.benchId;
        team.assignedJudges = row.judgeIds;
      }
    });
    return { success: true, appliedCount: currentResults.matrix.length };
  },

  async simulateWhatIf(scenario: "JUDGE_DROPOUT" | "VENUE_POWER_OUTAGE" | "EXTRA_TEAMS"): Promise<{
    impactSummary: string;
    affectedTeams: number;
    recommendedActions: string[];
    reOptimizationScore: number;
  }> {
    await new Promise((r) => setTimeout(r, 500));
    if (scenario === "JUDGE_DROPOUT") {
      return {
        impactSummary: "Judge J007 unavailable for Slot B: 6 teams affected across Room 204.",
        affectedTeams: 6,
        recommendedActions: [
          "Auto-reassign J010 (Standby Judge, BioGenomics background)",
          "Shift 2 evaluations to Slot C buffer window",
        ],
        reOptimizationScore: 96.2,
      };
    } else if (scenario === "VENUE_POWER_OUTAGE") {
      return {
        impactSummary: "Room R002 breaker trip: 5 benches unpowered.",
        affectedTeams: 5,
        recommendedActions: [
          "Evacuate teams to standby Room R024 (Ada Lovelace Floor 4)",
          "Sync digital judges to new room location via notification",
        ],
        reOptimizationScore: 94.8,
      };
    }
    return {
      impactSummary: "Adding 10 wildcard waitlisted teams exceeds current bench capacity.",
      affectedTeams: 10,
      recommendedActions: ["Activate standby Room R023 & R024", "Extend evaluation rounds by 1 time slot"],
      reOptimizationScore: 95.1,
    };
  },
};

