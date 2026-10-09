import { Incident, IncidentStatus, IncidentPriority } from "@/types";
import { mockIncidents } from "@/lib/mock-data/incidents";
import { USE_MOCK_API } from "./client";
import { eventModuleApi, activeEventId } from "./module-records";

export const incidentsApi = {
  async getAll(eventId = "evt-01"): Promise<Incident[]> {
    if (!USE_MOCK_API) return await eventModuleApi.list<Incident>("incidents", eventId);
    await new Promise((r) => setTimeout(r, 150));
    return mockIncidents.filter((inc) => !eventId || inc.eventId === eventId);
  },

  async getById(id: string): Promise<Incident | undefined> {
    if (!USE_MOCK_API) return (await eventModuleApi.list<Incident>("incidents", activeEventId())).find((item) => item.id === id);
    await new Promise((r) => setTimeout(r, 100));
    return mockIncidents.find((inc) => inc.id === id);
  },

  async create(data: Partial<Incident>): Promise<Incident> {
    if (!USE_MOCK_API) return await eventModuleApi.create<Incident>("incidents", data, data.eventId || activeEventId());
    await new Promise((r) => setTimeout(r, 250));
    const newInc: Incident = {
      id: `INC-${2044 + Math.floor(Math.random() * 100)}`,
      eventId: data.eventId || "evt-01",
      title: data.title || "Unclassified Incident",
      category: data.category || "OTHER",
      priority: data.priority || "MEDIUM",
      status: "OPEN",
      reportedBy: data.reportedBy || "Control Center",
      location: data.location || "General Venue",
      assignedTo: data.assignedTo,
      description: data.description || "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    mockIncidents.unshift(newInc);
    return newInc;
  },

  async updateStatus(id: string, status: IncidentStatus, notes?: string): Promise<Incident> {
    if (!USE_MOCK_API) return await eventModuleApi.update<Incident>("incidents", id, { status, resolutionNotes: notes, resolvedAt: status === "RESOLVED" ? new Date().toISOString() : undefined });
    await new Promise((r) => setTimeout(r, 200));
    const inc = mockIncidents.find((i) => i.id === id);
    if (inc) {
      inc.status = status;
      inc.updatedAt = new Date().toISOString();
      if (status === "RESOLVED") {
        inc.resolvedAt = new Date().toISOString();
        if (notes) inc.resolutionNotes = notes;
      }
      return { ...inc };
    }
    throw new Error("Incident not found");
  },
};
