import { Volunteer, VolunteerTask, TaskStatus } from "@/types";
import { volunteersApi } from "./volunteers";
import { USE_MOCK_API } from "./client";
import { eventModuleApi, activeEventId } from "./module-records";

/**
 * Staff & Volunteers API Domain Service
 * 
 * TODO: Wire to FastAPI backend endpoints when implemented:
 * - GET /api/v1/events/{id}/staff
 * - POST /api/v1/events/{id}/staff
 * - GET /api/v1/events/{id}/staff/tasks
 * - POST /api/v1/events/{id}/staff/tasks
 * - PATCH /api/v1/events/{id}/staff/tasks/{task_id}
 */
export const staffApi = {
  ...volunteersApi,

  async getStaffDirectory(eventId?: string): Promise<Volunteer[]> {
    if (!USE_MOCK_API) return await eventModuleApi.list<Volunteer>("staff", activeEventId(eventId));
    return volunteersApi.getAll();
  },

  async getTasks(eventId?: string): Promise<VolunteerTask[]> {
    if (!USE_MOCK_API) return await eventModuleApi.list<VolunteerTask>("tasks", activeEventId(eventId));
    return volunteersApi.getTasks();
  },

  async updateTaskStatus(taskId: string, status: TaskStatus): Promise<VolunteerTask> {
    if (!USE_MOCK_API) return await eventModuleApi.update<VolunteerTask>("tasks", taskId, { status });
    return volunteersApi.updateTaskStatus(taskId, status);
  },
};
