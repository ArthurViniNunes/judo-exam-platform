import { getDeviceIdentity } from "./device-identity";

const DEFAULT_API_URL = "http://127.0.0.1:8787";

const API_URL = (
  process.env.NEXT_PUBLIC_API_URL || DEFAULT_API_URL
).replace(/\/$/, "");

const AUTH_TOKEN_KEY = "ajrc-auth-token";
const AUTH_USER_KEY = "ajrc-auth-user";

export function getAuthToken() {
  return typeof window === "undefined"
    ? null
    : window.localStorage.getItem(AUTH_TOKEN_KEY);
}

export function setAuthToken(token: string | null) {
  if (typeof window === "undefined") return;
  if (token) window.localStorage.setItem(AUTH_TOKEN_KEY, token);
  else window.localStorage.removeItem(AUTH_TOKEN_KEY);
}

export function getCachedAuthUser<T>() {
  if (typeof window === "undefined") return null;
  const stored = window.localStorage.getItem(AUTH_USER_KEY);
  if (!stored) return null;
  try {
    return JSON.parse(stored) as T;
  } catch {
    window.localStorage.removeItem(AUTH_USER_KEY);
    return null;
  }
}

export function setCachedAuthUser(user: unknown | null) {
  if (typeof window === "undefined") return;
  if (user) window.localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
  else window.localStorage.removeItem(AUTH_USER_KEY);
}

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly details: string[] = [],
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getAuthToken();
  const device = getDeviceIdentity();
  const headers = {
    ...(init?.body ? { "Content-Type": "application/json" } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(device ? {
      "X-Device-Id": device.id,
      "X-Device-Label": device.label,
    } : {}),
    ...init?.headers,
  };

  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers,
  });

  if (!response.ok) {
    let message = `A API respondeu com o status ${response.status}.`;
    let details: string[] = [];
    try {
      const body = (await response.json()) as { error?: string; details?: string[] };
      if (body.error) message = body.error;
      if (Array.isArray(body.details)) details = body.details;
    } catch {
      // Keep the status-based message when the body is not JSON.
    }
    if (
      response.status === 401 &&
      path !== "/api/auth/login" &&
      path !== "/api/student-auth/login"
    ) {
      setAuthToken(null);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("ajrc:session-expired"));
      }
    }
    throw new ApiError(message, response.status, details);
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}
