/**
 * Centralized API client for BookAI frontend.
 *
 * Design decisions:
 *  - API_BASE points to the Express server root (e.g. http://localhost:5000)
 *  - Every path starts with /api/... to match the Express router prefix
 *  - Token is read from localStorage via storage.get() so it works in
 *    both hook-based and non-hook contexts (e.g. useEffect callbacks)
 *  - All HTTP error codes are mapped to user-readable messages
 *  - 401 clears auth and redirects to /login via a custom event
 *  - Never puts MISTRAL_API_KEY or JWT_SECRET in any env variable here
 */

import type {
  ApiResponse,
  AuthResult,
  User,
  Appointment,
  ChatSession,
  ChatMessage,
  SendMessageResult,
} from "@/types";
import { storage } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────
// Base URL — set NEXT_PUBLIC_API_URL in .env.local
// Default: http://localhost:5000
// NEVER include a trailing /api here — paths handle that.
// ─────────────────────────────────────────────────────────────
const API_BASE =
  (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000").replace(/\/$/, "");

// ─────────────────────────────────────────────────────────────
// Known HTTP status → user message map
// ─────────────────────────────────────────────────────────────
const STATUS_MESSAGES: Record<number, string> = {
  400: "Invalid request. Please check your input.",
  401: "Your session has expired. Please sign in again.",
  403: "You don't have permission to do that.",
  404: "The requested resource was not found.",
  409: "A conflict occurred — this slot may already be booked.",
  429: "Too many requests. Please slow down and try again shortly.",
  500: "Server error. Please try again later.",
  503: "Service unavailable. Please try again later.",
};

// ─────────────────────────────────────────────────────────────
// Core fetch wrapper
// ─────────────────────────────────────────────────────────────
async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  token?: string
): Promise<ApiResponse<T>> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  // Use provided token or fall back to localStorage
  const authToken = token ?? storage.get("token");
  if (authToken) {
    headers["Authorization"] = `Bearer ${authToken}`;
  }

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  } catch {
    // Network unreachable / CORS failure
    return {
      success: false,
      message: "Cannot reach the server. Make sure the backend is running.",
    };
  }

  // ── 401: clear auth and signal redirect ───────────────────
  if (res.status === 401) {
    storage.remove("token");
    storage.remove("user");
    // Dispatch a custom event so any component can react to expired sessions
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("auth:expired"));
    }
    return {
      success: false,
      message: STATUS_MESSAGES[401],
    };
  }

  // ── Parse JSON body ────────────────────────────────────────
  let json: ApiResponse<T>;
  try {
    json = (await res.json()) as ApiResponse<T>;
  } catch {
    return {
      success: false,
      message: `Unexpected response from server (HTTP ${res.status})`,
    };
  }

  // ── Map known error codes to friendly messages ─────────────
  if (!res.ok && !json.message) {
    json.message = STATUS_MESSAGES[res.status] ?? `Request failed (HTTP ${res.status})`;
  }

  // ── 429: enrich the message ────────────────────────────────
  if (res.status === 429) {
    json.message = STATUS_MESSAGES[429];
  }

  return json;
}

// ─────────────────────────────────────────────────────────────
// Auth API
// ─────────────────────────────────────────────────────────────
export const authApi = {
  /**
   * Sign in with email + password. Returns JWT + user profile.
   */
  login: (email: string, password: string) =>
    apiFetch<AuthResult>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  /**
   * Create a new account.
   */
  signup: (name: string, email: string, password: string) =>
    apiFetch<AuthResult>("/api/auth/signup", {
      method: "POST",
      body: JSON.stringify({ name, email, password }),
    }),

  /**
   * Fetch the current user's profile — used on page refresh to
   * verify the stored token is still valid.
   */
  me: (token: string) =>
    apiFetch<{ user: User }>("/api/auth/me", {}, token),
};

// ─────────────────────────────────────────────────────────────
// Appointments API
// ─────────────────────────────────────────────────────────────
export const appointmentsApi = {
  /**
   * List all appointments for the authenticated user.
   */
  list: (token: string) =>
    apiFetch<{ appointments: Appointment[]; count: number }>(
      "/api/appointments",
      {},
      token
    ),

  /**
   * Create a new appointment via the fallback form.
   * The AI booking flow calls AppointmentService directly on the backend.
   */
  create: (
    token: string,
    data: { appointment_date: string; appointment_time: string; reason: string }
  ) =>
    apiFetch<{ appointment: Appointment }>(
      "/api/appointments",
      { method: "POST", body: JSON.stringify(data) },
      token
    ),

  /**
   * Cancel an appointment (sets status to CANCELLED, preserves record).
   */
  cancel: (token: string, id: string) =>
    apiFetch<{ appointment: Appointment }>(
      `/api/appointments/${id}`,
      { method: "DELETE" },
      token
    ),
};

// ─────────────────────────────────────────────────────────────
// Chat API
// ─────────────────────────────────────────────────────────────
export const chatApi = {
  /**
   * Create a new chat session with an optional title.
   */
  createSession: (token: string, title?: string) =>
    apiFetch<{ session: ChatSession }>(
      "/api/chat/sessions",
      {
        method: "POST",
        body: JSON.stringify({ title: title ?? "New conversation" }),
      },
      token
    ),

  /**
   * List all chat sessions for the user, newest first.
   */
  listSessions: (token: string) =>
    apiFetch<{ sessions: ChatSession[]; count: number }>(
      "/api/chat/sessions",
      {},
      token
    ),

  /**
   * Get all messages in a session (chronological order).
   */
  getMessages: (token: string, sessionId: string) =>
    apiFetch<{ messages: ChatMessage[]; count: number }>(
      `/api/chat/sessions/${sessionId}/messages`,
      {},
      token
    ),

  /**
   * Send a user message. The backend runs the full AI booking flow:
   * analyzes intent → extracts booking info → creates appointment if complete.
   * Returns both messages + structured booking outcome.
   */
  sendMessage: (token: string, sessionId: string, content: string) =>
    apiFetch<SendMessageResult>(
      `/api/chat/sessions/${sessionId}/messages`,
      { method: "POST", body: JSON.stringify({ content }) },
      token
    ),
};
