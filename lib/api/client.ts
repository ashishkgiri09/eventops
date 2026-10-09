import { sessionService } from "@/lib/auth/session";

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
export const USE_MOCK_API = process.env.NEXT_PUBLIC_USE_MOCK_API === "true";

export class ApiError extends Error {
  status: number;
  details?: any;

  constructor(status: number, message: string, details?: any) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

interface RequestOptions extends RequestInit {
  timeoutMs?: number;
  skipAuth?: boolean;
}

let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

function subscribeTokenRefresh(cb: (token: string) => void) {
  refreshSubscribers.push(cb);
}

function onRefreshed(token: string) {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
}

export async function apiClient<T = any>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { timeoutMs = 15000, skipAuth = false, headers = {}, ...rest } = options;

  const url = endpoint.startsWith("http") ? endpoint : `${API_BASE_URL}${endpoint}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  const requestHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...(headers as Record<string, string>),
  };

  if (!skipAuth) {
    const accessToken = sessionService.getAccessToken();
    if (accessToken) {
      requestHeaders["Authorization"] = `Bearer ${accessToken}`;
    }
  }

  try {
    const response = await fetch(url, {
      ...rest,
      headers: requestHeaders,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    // Handle 401 Unauthorized (attempt single token refresh)
    if (response.status === 401 && !skipAuth && !endpoint.includes("/auth/")) {
      const refreshToken = sessionService.getRefreshToken();
      if (!refreshToken) {
        sessionService.clearSession();
        if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
          window.location.href = "/login?expired=1";
        }
        throw new ApiError(401, "Session expired. Please log in again.");
      }

      if (!isRefreshing) {
        isRefreshing = true;
        try {
          const refreshRes = await fetch(`${API_BASE_URL}/api/v1/auth/refresh`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ refresh_token: refreshToken }),
          });
          if (!refreshRes.ok) throw new Error("Refresh token expired or rejected");
          const refreshData = await refreshRes.json();
          sessionService.setSession(refreshData.access_token, refreshData.refresh_token || refreshToken);
          isRefreshing = false;
          onRefreshed(refreshData.access_token);
        } catch {
          isRefreshing = false;
          sessionService.clearSession();
          if (typeof window !== "undefined") window.location.href = "/login?expired=1";
          throw new ApiError(401, "Session refresh failed. Please log in again.");
        }
      } else {
        return new Promise<T>((resolve, reject) => {
          subscribeTokenRefresh(async (newToken: string) => {
            try {
              requestHeaders["Authorization"] = `Bearer ${newToken}`;
              const retryRes = await fetch(url, { ...rest, headers: requestHeaders });
              if (!retryRes.ok) throw new ApiError(retryRes.status, `HTTP Error ${retryRes.status}`);
              resolve(retryRes.status === 204 ? ({} as T) : (await retryRes.json()) as T);
            } catch (err) {
              reject(err);
            }
          });
        });
      }

      requestHeaders["Authorization"] = `Bearer ${sessionService.getAccessToken()}`;
      const retryRes = await fetch(url, { ...rest, headers: requestHeaders, signal: controller.signal });
      if (!retryRes.ok) {
        let retryMessage = `HTTP Error ${retryRes.status}`;
        try {
          const retryBody = await retryRes.json();
          retryMessage = retryBody.detail || retryBody.message || retryMessage;
        } catch {}
        throw new ApiError(retryRes.status, retryMessage);
      }
      return retryRes.status === 204 ? ({} as T) : (await retryRes.json()) as T;
    }

    if (!response.ok) {
      let errorMessage = `HTTP Error ${response.status}`;
      let errorDetails = null;
      try {
        const errorJson = await response.json();
        errorMessage = errorJson.detail || errorJson.message || errorMessage;
        errorDetails = errorJson;
      } catch {
        // Non-JSON error body
      }
      throw new ApiError(response.status, errorMessage, errorDetails);
    }

    if (response.status === 204) {
      return {} as T;
    }

    return await response.json();
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === "AbortError") {
      throw new ApiError(408, "Request timed out. Please verify your connection.");
    }
    if (err instanceof ApiError) {
      throw err;
    }
    throw new ApiError(500, err?.message || "Network request failed.");
  }
}
