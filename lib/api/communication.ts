import { Announcement } from "@/types";
import { USE_MOCK_API } from "./client";
import { eventModuleApi, activeEventId } from "./module-records";

export const mockAnnouncements: Announcement[] = [
  {
    id: "ann-01",
    eventId: "evt-01",
    title: "Round 1 Evaluation Protocol & Mentor Availability",
    message: "Jury panels are actively visiting benches B001 through B120. Please ensure a working build is deployed.",
    targetAudience: "PARTICIPANTS",
    channels: ["IN_APP", "EMAIL"],
    sentBy: "Alex Sterling (Event Admin)",
    sentAt: "2026-10-15T13:30:00Z",
    recipientCount: 480,
  },
  {
    id: "ann-02",
    eventId: "evt-01",
    title: "Jury Briefing & Rubric Calibration in Room 102",
    message: "All judges please report to Conference Room 102 at 01:15 PM for rubric alignment on Novelty and Execution metrics.",
    targetAudience: "JUDGES",
    channels: ["IN_APP", "EMAIL", "SMS"],
    sentBy: "Dr. Elena Rostova",
    sentAt: "2026-10-15T12:45:00Z",
    recipientCount: 20,
  },
  {
    id: "ann-03",
    eventId: "evt-01",
    title: "Lunch Batch A & B Distribution Schedule",
    message: "Catering Batch A (Halls 101-104) is now open at Main Cafeteria Hub. Batch B opens in 30 minutes.",
    targetAudience: "ALL",
    channels: ["IN_APP"],
    sentBy: "Operations Desk",
    sentAt: "2026-10-15T12:00:00Z",
    recipientCount: 520,
  },
];

/**
 * Communication & Announcements API Domain Service
 * 
 * Configurable delivery channels: In-App, Email, SMS, WhatsApp.
 * NOTE: In Mock Mode, delivery options are configured and validated; external gateways are simulated.
 * 
 * TODO: Wire to FastAPI backend endpoints when implemented:
 * - GET /api/v1/events/{id}/announcements
 * - POST /api/v1/events/{id}/announcements
 */
export const communicationApi = {
  async getAll(eventId?: string): Promise<Announcement[]> {
    if (!USE_MOCK_API) return await eventModuleApi.list<Announcement>("announcements", activeEventId(eventId));
    await new Promise((r) => setTimeout(r, 150));
    return [...mockAnnouncements];
  },

  async createAnnouncement(data: Partial<Announcement>): Promise<{
    announcement: Announcement;
    deliverySummary: string;
    isMockSimulation: boolean;
  }> {
    if (!USE_MOCK_API) {
      const announcement = await eventModuleApi.create<Announcement>("announcements", data, data.eventId || activeEventId());
      return { announcement, deliverySummary: "Announcement saved. External email/SMS delivery requires a configured provider.", isMockSimulation: true };
    }
    await new Promise((r) => setTimeout(r, 350));
    const newAnn: Announcement = {
      id: `ann-${Date.now().toString().slice(-4)}`,
      eventId: data.eventId || "evt-01",
      title: data.title || "Operations Announcement",
      message: data.message || "",
      targetAudience: data.targetAudience || "ALL",
      channels: data.channels || ["IN_APP"],
      sentBy: "Current Operator",
      sentAt: new Date().toISOString(),
      recipientCount: data.targetAudience === "ALL" ? 520 : 120,
    };
    mockAnnouncements.unshift(newAnn);

    const channelNames = newAnn.channels.join(", ");
    return {
      announcement: newAnn,
      deliverySummary: `Broadcast dispatched across channels: [${channelNames}]. (Simulated in Mock Mode)`,
      isMockSimulation: true,
    };
  },
};
