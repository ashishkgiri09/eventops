import { EvaluationItem } from "@/types";

export const mockEvaluations: EvaluationItem[] = [
  {
    id: "eval-01",
    eventId: "evt-01",
    roundId: "rnd-01",
    judgeId: "J001",
    teamId: "T001",
    scores: {
      "crt-01": 24, // max 25
      "crt-02": 23, // max 25
      "crt-03": 25, // max 25
      "crt-04": 24, // max 25
    },
    totalScore: 96,
    feedback: "Exceptional edge-inference optimization with quantised weights. Latency targets beat expectations.",
    strengths: "Quantization pipeline, sub-10ms response time on mobile CPU.",
    areasToImprove: "Consider telemetry logging under noisy Bluetooth dropouts.",
    status: "LOCKED",
    submittedAt: "2026-10-15T15:20:00Z",
  },
  {
    id: "eval-02",
    eventId: "evt-01",
    roundId: "rnd-01",
    judgeId: "J007",
    teamId: "T042",
    scores: {
      "crt-01": 24,
      "crt-02": 25,
      "crt-03": 24,
      "crt-04": 25,
    },
    totalScore: 98,
    feedback: "Remarkable biological signal calibration. The multi-spectral sensor approach is scientifically sound and novel.",
    strengths: "Patented algorithmic signal filter, robust against human motion artifacts.",
    areasToImprove: "Prepare compliance timeline for clinical CE/FDA pathway.",
    status: "SUBMITTED",
    submittedAt: "2026-10-15T16:45:00Z",
  },
  {
    id: "eval-03",
    eventId: "evt-01",
    roundId: "rnd-01",
    judgeId: "J003",
    teamId: "T005",
    scores: {
      "crt-01": 22,
      "crt-02": 23,
      "crt-03": 21,
      "crt-04": 22,
    },
    totalScore: 88,
    feedback: "Solid autonomous mesh logic. Good flight stability simulation.",
    strengths: "Decentralized consensus protocol between drone nodes.",
    areasToImprove: "Battery consumption profile needs real-world bench testing.",
    status: "SUBMITTED",
    submittedAt: "2026-10-15T17:10:00Z",
  },
];
