// ─────────────────────────────────────────────────────────────
// Shared TypeScript types — mirrors backend Prisma models
// ─────────────────────────────────────────────────────────────

export interface User {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  updatedAt: string;
}

export type AppointmentStatus = "SCHEDULED" | "CANCELLED" | "COMPLETED";

export interface Appointment {
  id: string;
  userId: string;
  appointmentDate: string;
  appointmentTime: string;
  reason: string;
  status: AppointmentStatus;
  createdAt: string;
  updatedAt: string;
}

export type MessageRole = "USER" | "ASSISTANT" | "SYSTEM";

export interface ChatMessage {
  id: string;
  sessionId: string;
  role: MessageRole;
  content: string;
  createdAt: string;
}

export interface ChatSession {
  id: string;
  userId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  errors?: { field: string; message: string }[];
}

// AI booking analysis
export type BookingIntent = "book_appointment" | "general_question" | "unknown";

export interface AiAnalysis {
  intent: BookingIntent;
  reply: string;
  date: string | null;
  time: string | null;
  reason: string | null;
  missing: string[];
}

export interface FallbackFormData {
  date: string | null;
  time: string | null;
  reason: string | null;
  missing: string[];
}

export type BookingStatus =
  | "booked"
  | "incomplete"
  | "conflict"
  | "not_requested"
  | "ai_unavailable";

export interface BookingOutcome {
  status: BookingStatus;
  appointment?: Appointment;
  message?: string;
  missing?: string[];
}

export interface SendMessageResult {
  userMessage: ChatMessage;
  assistantMessage: ChatMessage;
  analysis: AiAnalysis | null;
  booking: BookingOutcome;
  fallbackForm: FallbackFormData | null;
  aiAvailable: boolean;
}

// Auth
export interface AuthResult {
  user: User;
  token: string;
}
