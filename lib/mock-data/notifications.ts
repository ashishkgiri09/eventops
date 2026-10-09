import { Announcement } from "@/types";

export const mockAnnouncements: Announcement[] = [
  {
    id: "ann-01",
    eventId: "evt-01",
    title: "Round 1 Evaluation Schedule & Bench Lock Active",
    message: "All teams must be stationed at their assigned benches by 01:45 PM. Evaluator assignments are now synced on your mobile dashboard.",
    targetAudience: "ALL",
    channels: ["IN_APP", "SMS", "WHATSAPP"],
    sentBy: "Alex Sterling (Director of Ops)",
    sentAt: "2026-10-15T13:00:00Z",
    recipientCount: 520,
  },
  {
    id: "ann-02",
    eventId: "evt-01",
    title: "Jury Protocol: 12-Minute Strict Rubric Cap",
    message: "Judges are requested to complete rubric submissions in real-time. Standby buffer between teams is 3 minutes.",
    targetAudience: "JUDGES",
    channels: ["IN_APP", "EMAIL"],
    sentBy: "Dr. Marcus Vance (Chief Judge)",
    sentAt: "2026-10-15T13:30:00Z",
    recipientCount: 20,
  },
  {
    id: "ann-03",
    eventId: "evt-01",
    title: "Midnight Snack Delivery & Red Bull Stations Open",
    message: "Snack stations 1 through 3 are stocked with energy drinks, cold brew, and protein snacks.",
    targetAudience: "PARTICIPANTS",
    channels: ["IN_APP"],
    sentBy: "David Kim (Resource Lead)",
    sentAt: "2026-10-15T23:45:00Z",
    recipientCount: 450,
  },
];
