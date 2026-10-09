import { Organization, UserRole } from "@/types";
import { mockOrganizations } from "@/lib/mock-data/organizations";
import { apiClient, USE_MOCK_API } from "./client";

export const organizationsApi = {
  /**
   * GET /api/v1/organizations
   */
  async getAll(): Promise<Organization[]> {
    if (!USE_MOCK_API) {
      return await apiClient<Organization[]>("/api/v1/organizations");
    }
    await new Promise((r) => setTimeout(r, 200));
    return [...mockOrganizations];
  },

  /**
   * GET /api/v1/organizations/{id}
   */
  async getById(id: string): Promise<Organization | undefined> {
    if (!USE_MOCK_API) {
      return await apiClient<Organization>(`/api/v1/organizations/${id}`);
    }
    await new Promise((r) => setTimeout(r, 150));
    return mockOrganizations.find((o) => o.id === id);
  },

  /**
   * POST /api/v1/organizations
   */
  async create(data: Partial<Organization>): Promise<Organization> {
    if (!USE_MOCK_API) {
      return await apiClient<Organization>("/api/v1/organizations", {
        method: "POST",
        body: JSON.stringify(data),
      });
    }

    await new Promise((r) => setTimeout(r, 350));
    const newOrg: Organization = {
      id: `org-${Date.now()}`,
      name: data.name || "New Organization",
      type: data.type || "Educational Institution",
      subtype: data.subtype || "Institution",
      country: data.country || "United States",
      city: data.city || "San Francisco",
      website: data.website || "https://example.org",
      size: data.size || "10-50",
      plan: "Starter",
      activeEventsCount: 1,
      membersCount: 1,
      createdAt: new Date().toISOString(),
    };
    mockOrganizations.push(newOrg);
    return newOrg;
  },

  /**
   * POST /api/v1/organizations/{organization_id}/invitations
   */
  async createInvitation(
    organizationId: string,
    data: { email: string; role: UserRole }
  ): Promise<{ inviteCode: string; expiresAt: string }> {
    if (!USE_MOCK_API) {
      return await apiClient<{ inviteCode: string; expiresAt: string }>(
        `/api/v1/organizations/${organizationId}/invitations`,
        {
          method: "POST",
          body: JSON.stringify(data),
        }
      );
    }

    await new Promise((r) => setTimeout(r, 300));
    return {
      inviteCode: `INV-${organizationId.slice(0, 4).toUpperCase()}-${Date.now().toString().slice(-4)}`,
      expiresAt: new Date(Date.now() + 86400000 * 7).toISOString(),
    };
  },

  /**
   * POST /api/v1/organizations/join
   */
  async joinWithCode(
    code: string
  ): Promise<{
    success: boolean;
    organization: Organization;
    role: UserRole;
    message: string;
    isExpired?: boolean;
    isInvalid?: boolean;
  }> {
    if (!USE_MOCK_API) {
      return await apiClient<{
        success: boolean;
        organization: Organization;
        role: UserRole;
        message: string;
      }>("/api/v1/organizations/join", {
        method: "POST",
        body: JSON.stringify({ code }),
      });
    }

    await new Promise((r) => setTimeout(r, 350));
    const cleanCode = code.trim().toUpperCase();

    if (cleanCode.includes("EXPIRED") || cleanCode === "EXP-2025-VISTRA") {
      return {
        success: false,
        organization: mockOrganizations[0],
        role: "COORDINATOR",
        isExpired: true,
        message: "This invitation code expired on Dec 31, 2025. Please request a new invite from your administrator.",
      };
    }

    if (cleanCode.length < 5 || cleanCode === "INVALID" || cleanCode === "0000") {
      return {
        success: false,
        organization: mockOrganizations[0],
        role: "VOLUNTEER",
        isInvalid: true,
        message: "Invalid invitation code. Check the format or character case.",
      };
    }

    return {
      success: true,
      organization: mockOrganizations[0],
      role: "COORDINATOR",
      message: `Successfully accepted invitation for ${mockOrganizations[0].name}!`,
    };
  },
};
