import { apiClient } from "./client";
import { sessionService } from "@/lib/auth/session";

export const activeEventId = (fallback = "") => {
  const eventId = fallback || sessionService.getStoredWorkspace()?.eventId;
  if (!eventId || eventId === "evt-01") {
    throw new Error("Select a real event in Workspace before managing its records.");
  }
  return eventId;
};

export function eventModulePath(eventId: string, module: string, recordId?: string) {
  const base = `/api/v1/events/${eventId}/modules/${module}`;
  return recordId ? `${base}/${recordId}` : base;
}

export const eventModuleApi = {
  list<T>(module: string, eventId = activeEventId(), query = "") {
    const suffix = query ? `?q=${encodeURIComponent(query)}` : "";
    return apiClient<T[]>(`${eventModulePath(eventId, module)}${suffix}`);
  },
  create<T>(module: string, data: unknown, eventId = activeEventId()) {
    return apiClient<T>(eventModulePath(eventId, module), { method: "POST", body: JSON.stringify(data) });
  },
  update<T>(module: string, id: string, data: unknown, eventId = activeEventId()) {
    return apiClient<T>(eventModulePath(eventId, module, id), { method: "PATCH", body: JSON.stringify(data) });
  },
  remove(module: string, id: string, eventId = activeEventId()) {
    return apiClient(eventModulePath(eventId, module, id), { method: "DELETE" });
  },
};
