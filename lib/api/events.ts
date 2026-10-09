import { EventItem, EventStatus, EventDashboardResponse } from "@/types";
import { mockEvents } from "@/lib/mock-data/events";
import { apiClient, USE_MOCK_API } from "./client";

export const eventsApi = {
  /**
   * GET /api/v1/events
   */
  async getAll(): Promise<EventItem[]> {
    if (!USE_MOCK_API) {
      return await apiClient<EventItem[]>("/api/v1/events");
    }
    await new Promise((r) => setTimeout(r, 200));
    return [...mockEvents];
  },

  /**
   * GET /api/v1/events/{event_id}
   */
  async getById(id: string): Promise<EventItem | undefined> {
    if (!USE_MOCK_API) {
      return await apiClient<EventItem>(`/api/v1/events/${id}`);
    }
    await new Promise((r) => setTimeout(r, 150));
    return mockEvents.find((e) => e.id === id) || mockEvents[0];
  },

  /**
   * POST /api/v1/events
   */
  async create(data: Partial<EventItem>): Promise<EventItem> {
    if (!USE_MOCK_API) {
      return await apiClient<EventItem>("/api/v1/events", {
        method: "POST",
        body: JSON.stringify(data),
      });
    }

    await new Promise((r) => setTimeout(r, 350));
    const newEvent: EventItem = {
      id: `evt-${Date.now()}`,
      organizationId: data.isPersonalEvent || data.organizationId === null ? null : data.organizationId !== undefined ? data.organizationId : "org-01",
      isPersonalEvent: Boolean(data.isPersonalEvent || data.organizationId === null),
      name: data.name || "Untitled Event",
      type: data.type || "Hackathon",
      description: data.description || "Operations enabled by EventOps.",
      startDate: data.startDate || new Date().toISOString(),
      endDate: data.endDate || new Date(Date.now() + 86400000 * 2).toISOString(),
      registrationDeadline: data.registrationDeadline || new Date().toISOString(),
      status: (data.status as EventStatus) || "DRAFT",
      expectedParticipants: data.expectedParticipants || 200,
      registeredTeamsCount: 0,
      currentRound: 1,
      totalRounds: data.totalRounds || 2,
      venuesCount: data.venuesCount || 0,
      judgesCount: data.judgesCount || 0,
      modules: data.modules || ["TEAMS", "CHECK_IN", "VENUES", "JUDGES", "ROUNDS", "ANALYTICS"],
      rounds: data.rounds || [
        {
          id: `rnd-1`,
          name: "Round 1 — Initial Evaluation",
          order: 1,
          status: "UPCOMING",
          startTime: new Date().toISOString(),
          endTime: new Date(Date.now() + 3600000 * 4).toISOString(),
          qualifyingQuota: 20,
          criteria: [
            { id: "c1", name: "Technical Feasibility", maxScore: 25, weight: 0.25, description: "System design & execution" },
            { id: "c2", name: "Impact", maxScore: 25, weight: 0.25, description: "Market potential" },
          ],
        },
      ],
      timeSlots: data.timeSlots || [],
      rules: data.rules || [],
    };
    mockEvents.unshift(newEvent);
    return newEvent;
  },

  /**
   * PATCH /api/v1/events/{event_id}
   */
  async update(id: string, updates: Partial<EventItem>): Promise<EventItem> {
    if (!USE_MOCK_API) {
      return await apiClient<EventItem>(`/api/v1/events/${id}`, {
        method: "PATCH",
        body: JSON.stringify(updates),
      });
    }

    await new Promise((r) => setTimeout(r, 250));
    const idx = mockEvents.findIndex((e) => e.id === id);
    if (idx !== -1) {
      mockEvents[idx] = { ...mockEvents[idx], ...updates };
      return mockEvents[idx];
    }
    return { ...mockEvents[0], ...updates };
  },

  /**
   * GET /api/v1/events/{event_id}/dashboard
   */
  async getDashboard(id: string): Promise<EventDashboardResponse> {
    if (!USE_MOCK_API) {
      return await apiClient<EventDashboardResponse>(`/api/v1/events/${id}/dashboard`);
    }

    await new Promise((r) => setTimeout(r, 250));
    const event = mockEvents.find((e) => e.id === id) || mockEvents[0];
    const isPersonal = Boolean(event.isPersonalEvent || !event.organizationId);
    const isCorporate = event.type === "Conference" || event.type === "Corporate Event";

    let variant: "institutional" | "corporate" | "personal" = "institutional";
    if (isPersonal) variant = "personal";
    else if (isCorporate) variant = "corporate";

    return {
      event,
      context: {
        organizationId: event.organizationId,
        workspaceMode: isPersonal ? "PERSONAL" : "ORGANIZATION",
      },
      role: "EVENT_ADMIN",
      dashboardVariant: variant,
      enabledModules: event.modules || [
        "TEAMS",
        "CHECK_IN",
        "VENUES",
        "JUDGES",
        "ROUNDS",
        "STAFF",
        "RESOURCES",
        "INCIDENTS",
        "COMMUNICATION",
        "ANALYTICS",
        "AI_ASSISTANT",
      ],
      kpiIdentifiers: [
        "registered_count",
        "checked_in_count",
        "active_judges",
        "open_incidents",
      ],
    };
  },

  /**
   * State transitions with validation
   */
  async publish(id: string): Promise<EventItem> {
    return this.update(id, { status: "PUBLISHED" });
  },

  async closeRegistration(id: string): Promise<EventItem> {
    return this.update(id, { status: "REGISTRATION_CLOSED" });
  },

  async markInProgress(id: string): Promise<EventItem> {
    return this.update(id, { status: "IN_PROGRESS" });
  },

  async complete(id: string): Promise<EventItem> {
    return this.update(id, { status: "COMPLETED" });
  },

  async cancel(id: string): Promise<EventItem> {
    return this.update(id, { status: "CANCELLED" });
  },
};
