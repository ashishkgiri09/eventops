import { Team, Guest, CheckInStatus } from "@/types";
import { mockTeams } from "@/lib/mock-data/teams";
import { teamsApi } from "./teams";
import { apiClient, USE_MOCK_API } from "./client";
import { sessionService } from "@/lib/auth/session";
const activeEventId = (fallback = "evt-personal-01") => sessionService.getStoredWorkspace()?.eventId || fallback;

// Mock guests for personal/corporate events
export const mockGuests: Guest[] = [
  {
    id: "gst-01",
    eventId: "evt-personal-01",
    name: "Dr. Rachel Green",
    email: "rachel.green@university.edu",
    phone: "+1 415-555-0192",
    rsvpStatus: "CONFIRMED",
    plusOnes: 1,
    dietaryNotes: "Vegetarian",
    tableOrSeat: "Table A - Row 1",
    invitationSent: true,
    checkedIn: true,
    checkedInAt: "2026-10-12T09:45:00Z",
    qrCodeToken: "EVENTOPS_GUEST_GST01_TOKEN",
  },
  {
    id: "gst-02",
    eventId: "evt-personal-01",
    name: "Marcus Vance",
    email: "marcus.vance@techcorp.io",
    phone: "+1 415-555-0188",
    rsvpStatus: "CONFIRMED",
    plusOnes: 0,
    dietaryNotes: "Gluten-Free",
    tableOrSeat: "Table A - Row 2",
    invitationSent: true,
    checkedIn: false,
    qrCodeToken: "EVENTOPS_GUEST_GST02_TOKEN",
  },
  {
    id: "gst-03",
    eventId: "evt-personal-01",
    name: "Sophia Rodriguez",
    email: "sophia.r@designfoundry.com",
    phone: "+1 415-555-0144",
    rsvpStatus: "TENTATIVE",
    plusOnes: 1,
    dietaryNotes: "None",
    tableOrSeat: "Table B - Row 1",
    invitationSent: true,
    checkedIn: false,
    qrCodeToken: "EVENTOPS_GUEST_GST03_TOKEN",
  },
  {
    id: "gst-04",
    eventId: "evt-personal-01",
    name: "Vikram Malhotra",
    email: "vikram@cloudworks.in",
    rsvpStatus: "DECLINED",
    plusOnes: 0,
    invitationSent: true,
    checkedIn: false,
    qrCodeToken: "EVENTOPS_GUEST_GST04_TOKEN",
  },
  {
    id: "gst-05",
    eventId: "evt-personal-01",
    name: "Emily Watson",
    email: "emily.w@startuplabs.io",
    rsvpStatus: "CONFIRMED",
    plusOnes: 2,
    dietaryNotes: "Vegan",
    tableOrSeat: "Table C - Row 1",
    invitationSent: true,
    checkedIn: true,
    checkedInAt: "2026-10-12T10:10:00Z",
    qrCodeToken: "EVENTOPS_GUEST_GST05_TOKEN",
  },
];

/**
 * Registrations API Domain Service
 * Handles Team Registrations (hackathons/competitions) and Guests / RSVPs (conferences/personal)
 * 
 * TODO: Wire to FastAPI backend endpoints when implemented:
 * - GET /api/v1/events/{id}/registrations
 * - POST /api/v1/events/{id}/registrations
 * - GET /api/v1/events/{id}/guests
 * - POST /api/v1/events/{id}/guests
 */
export const registrationsApi = {
  // Teams API
  ...teamsApi,

  // Guests & RSVPs API for Personal Celebrations & Conferences
  async getGuests(eventId: string): Promise<Guest[]> {
    if (!USE_MOCK_API) return await apiClient<Guest[]>(`/api/v1/events/${activeEventId(eventId)}/guests`);
    await new Promise((r) => setTimeout(r, 200));
    return mockGuests.filter((g) => g.eventId === eventId || true);
  },

  async createGuest(data: Partial<Guest>): Promise<Guest> {
    if (!USE_MOCK_API) {
      const eventId = data.eventId || activeEventId();
      return await apiClient<Guest>(`/api/v1/events/${eventId}/guests`, { method: "POST", body: JSON.stringify(data) });
    }
    await new Promise((r) => setTimeout(r, 300));
    const newGuest: Guest = {
      id: `gst-${Date.now().toString().slice(-4)}`,
      eventId: data.eventId || "evt-personal-01",
      name: data.name || "Guest Name",
      email: data.email || "",
      phone: data.phone,
      rsvpStatus: data.rsvpStatus || "CONFIRMED",
      plusOnes: data.plusOnes || 0,
      dietaryNotes: data.dietaryNotes || "None",
      tableOrSeat: data.tableOrSeat || "General Seating",
      invitationSent: true,
      checkedIn: false,
      qrCodeToken: `EVENTOPS_GUEST_${Date.now()}`,
    };
    mockGuests.unshift(newGuest);
    return newGuest;
  },

  async updateRsvp(guestId: string, status: Guest["rsvpStatus"]): Promise<Guest> {
    if (!USE_MOCK_API) return await apiClient<Guest>(`/api/v1/events/${activeEventId()}/guests/${guestId}/rsvp`, { method: "PATCH", body: JSON.stringify({ status }) });
    await new Promise((r) => setTimeout(r, 200));
    const guest = mockGuests.find((g) => g.id === guestId);
    if (guest) {
      guest.rsvpStatus = status;
      return { ...guest };
    }
    return mockGuests[0];
  },

  async checkInGuest(guestId: string): Promise<Guest> {
    if (!USE_MOCK_API) return await apiClient<Guest>(`/api/v1/events/${activeEventId()}/guests/${guestId}/check-in`, { method: "POST" });
    await new Promise((r) => setTimeout(r, 200));
    const guest = mockGuests.find((g) => g.id === guestId);
    if (guest) {
      guest.checkedIn = true;
      guest.checkedInAt = new Date().toISOString();
      return { ...guest };
    }
    return mockGuests[0];
  },
};


