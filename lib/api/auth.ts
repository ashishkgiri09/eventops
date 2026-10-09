import { User, UserRole, AuthTokenResponse } from "@/types";
import { mockUsers } from "@/lib/mock-data/users";
import { sessionService } from "@/lib/auth/session";
import { apiClient, USE_MOCK_API } from "./client";

const mockPasswords = new Map(mockUsers.map((user) => [user.email.toLowerCase(), "Password@123"]));

export const authApi = {
  /**
   * POST /api/v1/auth/login
   */
  async login(email: string, password?: string): Promise<AuthTokenResponse> {
    if (!USE_MOCK_API) {
      const res = await apiClient<AuthTokenResponse>("/api/v1/auth/login", {
        method: "POST",
        skipAuth: true,
        body: JSON.stringify({ email, password }),
      });
      sessionService.setSession(res.access_token, res.refresh_token, res.user);
      return res;
    }

    // Mock mode simulation
    await new Promise((r) => setTimeout(r, 400));

    const user = mockUsers.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (!user || !password || mockPasswords.get(email.toLowerCase()) !== password) {
      throw new Error("Email or password is incorrect. Use a listed demo account and its demo password.");
    }

    const response: AuthTokenResponse = {
      access_token: `mock-jwt-access-${Date.now()}`,
      refresh_token: `mock-jwt-refresh-${Date.now()}`,
      token_type: "bearer",
      user,
    };

    sessionService.setSession(response.access_token, response.refresh_token, response.user);
    return response;
  },

  /**
   * POST /api/v1/auth/register
   */
  async register(data: {
    name: string;
    email: string;
    password?: string;
    role?: UserRole;
    invitationCode?: string;
  }): Promise<AuthTokenResponse> {
    if (!USE_MOCK_API) {
      const res = await apiClient<AuthTokenResponse>("/api/v1/auth/register", {
        method: "POST",
        skipAuth: true,
        body: JSON.stringify(data),
      });
      sessionService.setSession(res.access_token, res.refresh_token, res.user);
      return res;
    }

    await new Promise((r) => setTimeout(r, 450));

    if (mockUsers.some((user) => user.email.toLowerCase() === data.email.toLowerCase())) {
      throw new Error("An account with this email already exists.");
    }

    const newUser: User = {
      id: `usr-${Date.now()}`,
      name: data.name,
      email: data.email,
      role: data.role || "ORGANIZATION_ADMIN",
      organizationId: "org-01",
      createdAt: new Date().toISOString(),
    };
    mockUsers.push(newUser);
    mockPasswords.set(data.email.toLowerCase(), data.password || "Password@123");

    const response: AuthTokenResponse = {
      access_token: `mock-jwt-access-${Date.now()}`,
      refresh_token: `mock-jwt-refresh-${Date.now()}`,
      token_type: "bearer",
      user: newUser,
    };

    sessionService.setSession(response.access_token, response.refresh_token, response.user);
    return response;
  },

  /**
   * POST /api/v1/auth/refresh
   */
  async refreshToken(refreshToken: string): Promise<{ access_token: string; refresh_token?: string }> {
    if (!USE_MOCK_API) {
      const res = await apiClient<{ access_token: string; refresh_token?: string }>(
        "/api/v1/auth/refresh",
        {
          method: "POST",
          skipAuth: true,
          body: JSON.stringify({ refresh_token: refreshToken }),
        }
      );
      sessionService.setSession(res.access_token, res.refresh_token || refreshToken);
      return res;
    }

    await new Promise((r) => setTimeout(r, 200));
    const newAccessToken = `mock-refreshed-jwt-${Date.now()}`;
    sessionService.setSession(newAccessToken, refreshToken);
    return { access_token: newAccessToken, refresh_token: refreshToken };
  },

  /**
   * GET /api/v1/auth/me
   */
  async getMe(): Promise<User> {
    if (!USE_MOCK_API) {
      return await apiClient<User>("/api/v1/auth/me");
    }

    await new Promise((r) => setTimeout(r, 150));
    return sessionService.getStoredUser() || mockUsers[0];
  },

  /**
   * POST /api/v1/auth/logout
   */
  async logout(): Promise<void> {
    try {
      if (!USE_MOCK_API) {
        const refreshToken = sessionService.getRefreshToken();
        await apiClient("/api/v1/auth/logout", {
          method: "POST",
          body: JSON.stringify({ refresh_token: refreshToken }),
        });
      } else {
        await new Promise((r) => setTimeout(r, 150));
      }
    } catch {
      // Clear session even if network call fails
    } finally {
      sessionService.clearSession();
    }
  },

  /**
   * OTP verification simulation
   * TODO: Wire to backend endpoint when implemented in FastAPI
   */
  async verifyOtp(email: string, otp: string): Promise<boolean> {
    if (!USE_MOCK_API) {
      await apiClient("/api/v1/auth/verify-reset-code", {
        method: "POST", skipAuth: true, body: JSON.stringify({ email, code: otp }),
      });
      return true;
    }
    await new Promise((r) => setTimeout(r, 300));
    if (otp === "000000") {
      throw new Error("Invalid or expired OTP code.");
    }
    return true;
  },

  /**
   * Password reset request - Note: Do not reveal if email is registered
   * TODO: Wire to backend endpoint when implemented in FastAPI
   */
  async forgotPassword(email: string): Promise<{ success: boolean; message: string; debugCode?: string }> {
    if (!USE_MOCK_API) {
      return apiClient("/api/v1/auth/forgot-password", {
        method: "POST", skipAuth: true, body: JSON.stringify({ email }),
      });
    }
    // The response intentionally does not vary based on whether the email exists.
    void email;
    await new Promise((r) => setTimeout(r, 350));
    return {
      success: true,
      message:
        "If an account matches this email, instructions to reset your password have been dispatched.",
    };
  },

  /**
   * Complete password reset
   * TODO: Wire to backend endpoint when implemented in FastAPI
   */
  async resetPassword(token: string, newPassword: string, email: string): Promise<{ success: boolean }> {
    if (!USE_MOCK_API) {
      const code = token.startsWith("EVT-OTP-") ? token.slice("EVT-OTP-".length) : token;
      return apiClient("/api/v1/auth/reset-password", {
        method: "POST", skipAuth: true, body: JSON.stringify({ email, code, newPassword }),
      });
    }
    await new Promise((r) => setTimeout(r, 350));
    if (newPassword.length < 8) {
      throw new Error("Password must be at least 8 characters with complexity.");
    }
    return { success: true };
  },
};
