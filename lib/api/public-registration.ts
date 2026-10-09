import { apiClient } from "./client";

export interface PublicRegistrationInfo {
  id: string;
  name: string;
  type: string;
  description: string;
  startDate: string | null;
  registrationKind: "team" | "guest";
  registrationOpen: boolean;
  registrationMessage: string;
}

export interface PublicRegistrationResult {
  id: string;
  eventId: string;
  eventName: string;
  kind: "team" | "guest";
  name: string;
  email?: string;
  leadName?: string;
  leadEmail?: string;
  project?: { title: string; abstract?: string; domain?: string };
  qrCodeToken: string;
  registrationStatus: string;
  assignedJudges?: string[];
}

export interface StudentPortalData {
  event: { id: string; name: string; type: string; startDate: string | null; location: string };
  registration: PublicRegistrationResult & {
    checkInStatus: string;
    assignedVenue?: string;
    assignedVenueName?: string;
    assignedBench?: string;
    currentRound?: number;
    totalScore?: number;
    rank?: number;
  };
}

export const publicRegistrationApi = {
  getInfo(eventId: string) {
    return apiClient<PublicRegistrationInfo>(`/api/v1/public/events/${eventId}/registration`, { skipAuth: true });
  },
  register(eventId: string, data: Record<string, unknown>) {
    return apiClient<PublicRegistrationResult>(`/api/v1/public/events/${eventId}/registrations`, { method: "POST", skipAuth: true, body: JSON.stringify(data) });
  },
  studentLogin(email: string, password: string, eventId?: string) {
    return apiClient<{ token: string; eventId: string }>("/api/v1/public/student-login", {
      method: "POST", skipAuth: true, body: JSON.stringify({ email, password, eventId }),
    });
  },
  getStudentPortal(token: string) {
    return apiClient<StudentPortalData>(`/api/v1/public/registrations/${encodeURIComponent(token)}`, { skipAuth: true });
  },
};
