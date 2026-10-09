import { User } from "@/types";

const ACCESS_TOKEN_KEY = "eventops_access_token";
const REFRESH_TOKEN_KEY = "eventops_refresh_token";
const USER_KEY = "eventops_current_user";
const WORKSPACE_KEY = "eventops_active_workspace";

export const sessionService = {
  getAccessToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  },

  getRefreshToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  },

  getStoredUser(): User | null {
    if (typeof window === "undefined") return null;
    const userStr = localStorage.getItem(USER_KEY);
    if (!userStr) return null;
    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  },

  setSession(accessToken: string, refreshToken: string, user?: User): void {
    if (typeof window === "undefined") return;
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    if (user) {
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    }
  },

  updateStoredUser(user: User): void {
    if (typeof window === "undefined") return;
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },

  clearSession(): void {
    if (typeof window === "undefined") return;
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(WORKSPACE_KEY);
  },

  hasActiveSession(): boolean {
    if (typeof window === "undefined") return false;
    return Boolean(localStorage.getItem(ACCESS_TOKEN_KEY));
  },

  getStoredWorkspace(): { orgId?: string; eventId?: string; mode?: "ORGANIZATION" | "PERSONAL"; category?: "INSTITUTIONAL" | "CORPORATE" | "PERSONAL" } | null {
    if (typeof window === "undefined") return null;
    const data = localStorage.getItem(WORKSPACE_KEY);
    if (!data) return null;
    try {
      return JSON.parse(data);
    } catch {
      return null;
    }
  },

  setStoredWorkspace(workspace: { orgId?: string; eventId?: string; mode: "ORGANIZATION" | "PERSONAL"; category?: "INSTITUTIONAL" | "CORPORATE" | "PERSONAL" }): void {
    if (typeof window === "undefined") return;
    localStorage.setItem(WORKSPACE_KEY, JSON.stringify(workspace));
  },
};
