/**
 * Chat Service — orchestrates the full AI booking workflow.
 *
 * Flow per message:
 *   1. Verify session ownership
 *   2. Save user message
 *   3. Load conversation history
 *   4. Call AI (AiService.analyze) — never throws
 *   5. If intent = book_appointment AND all fields present → attempt booking
 *      a. Backend re-validates date/time/reason independently (never trusts AI blindly)
 *      b. Calls AppointmentService.create (handles conflict checks)
 *      c. Saves confirmation assistant message
 *   6. If missing fields → save clarifying assistant message
 *   7. If AI fails → save fallback assistant message
 *   8. Return full result with booking outcome + fallback form data
 *
 * Boundaries:
 *   - AI NEVER touches the database
 *   - userId always comes from authenticated token, never from AI output
 *   - AppointmentService owns all booking validation/creation
 */

import { MessageRole } from "@prisma/client";
import { prisma } from "../db/prisma";
import { createError } from "../middleware/errorHandler";
import { AiService, type ConversationMessage, type AiAnalysis } from "./ai.service";
import { AppointmentService, type AppointmentRow } from "./appointment.service";
import { logger } from "../utils/logger";
import type { CreateSessionInput, SendMessageInput } from "../validators/chat.validator";

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export type SessionRow = {
  id: string;
  userId: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
};

export type MessageRow = {
  id: string;
  sessionId: string;
  role: MessageRole;
  content: string;
  createdAt: Date;
};

/** Sent back to frontend when AI cannot complete a booking */
export type FallbackFormData = {
  date: string | null;
  time: string | null;
  reason: string | null;
  missing: string[];
};

export type BookingOutcome =
  | { status: "booked";    appointment: AppointmentRow }
  | { status: "conflict";  message: string }
  | { status: "incomplete"; missing: string[] }
  | { status: "not_requested" }
  | { status: "ai_unavailable" };

export type SendMessageResult = {
  userMessage:       MessageRow;
  assistantMessage:  MessageRow;
  analysis:          AiAnalysis | null;
  booking:           BookingOutcome;
  /** Pre-filled form data for when the frontend should show a booking form */
  fallbackForm:      FallbackFormData | null;
  aiAvailable:       boolean;
};

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

async function findOwnedSessionOrThrow(
  sessionId: string,
  userId: string
): Promise<SessionRow> {
  const session = await prisma.chatSession.findUnique({ where: { id: sessionId } });
  if (!session) throw createError("Chat session not found", 404);
  if (session.userId !== userId)
    throw createError("You do not have access to this session", 403);
  return session;
}

/**
 * Backend re-validation of AI-extracted date.
 * Returns null if date is invalid or in the past.
 */
function validateExtractedDate(date: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const d = new Date(date);
  if (isNaN(d.getTime())) return null;
  // Compare as YYYY-MM-DD strings to avoid UTC vs local timezone issues
  const todayStr = new Date().toLocaleDateString("en-CA");
  if (date < todayStr) return null;
  return date;
}

/**
 * Backend re-validation of AI-extracted time.
 * Returns null if format is invalid.
 */
function validateExtractedTime(time: string): string | null {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(time) ? time : null;
}

/**
 * Backend re-validation of AI-extracted reason.
 */
function validateExtractedReason(reason: string): string | null {
  const trimmed = reason.trim();
  return trimmed.length >= 3 ? trimmed : null;
}

/**
 * Build a natural language clarification message listing missing fields.
 */
function buildClarifyMessage(missing: string[], existing: {
  date?: string | null;
  time?: string | null;
  reason?: string | null;
}): string {
  const parts: string[] = [];

  if (missing.includes("date"))   parts.push("the date");
  if (missing.includes("time"))   parts.push("the time");
  if (missing.includes("reason")) parts.push("the reason for the appointment");

  const knownParts: string[] = [];
  if (existing.date)   knownParts.push(`date: ${existing.date}`);
  if (existing.time)   knownParts.push(`time: ${existing.time}`);
  if (existing.reason) knownParts.push(`reason: ${existing.reason}`);

  const knownStr = knownParts.length > 0
    ? ` I already have ${knownParts.join(", ")}.`
    : "";

  if (parts.length === 1) {
    return `To complete your booking, I still need ${parts[0]}.${knownStr} Could you provide that?`;
  }
  return `To complete your booking, I still need ${parts.join(" and ")}.${knownStr} Could you provide those details?`;
}

// ─────────────────────────────────────────────────────────────
// Service
// ─────────────────────────────────────────────────────────────

export const ChatService = {

  async createSession(userId: string, input: CreateSessionInput): Promise<SessionRow> {
    return prisma.chatSession.create({
      data: { userId, title: input.title ?? "New conversation" },
    });
  },

  async listSessions(userId: string): Promise<SessionRow[]> {
    return prisma.chatSession.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
    });
  },

  async getMessages(sessionId: string, userId: string): Promise<MessageRow[]> {
    await findOwnedSessionOrThrow(sessionId, userId);
    return prisma.chatMessage.findMany({
      where: { sessionId },
      orderBy: { createdAt: "asc" },
    });
  },

  // ───────────────────────────────────────────────────────────
  // Main orchestration method
  // ───────────────────────────────────────────────────────────
  async sendMessage(
    sessionId: string,
    userId: string,
    input: SendMessageInput
  ): Promise<SendMessageResult> {

    // 1. Verify ownership
    await findOwnedSessionOrThrow(sessionId, userId);

    // 2. Save user message immediately
    const userMessage = await prisma.chatMessage.create({
      data: { sessionId, role: MessageRole.USER, content: input.content },
    });

    // 3. Auto-update session title from first message if still default
    const session = await prisma.chatSession.findUnique({ where: { id: sessionId } });
    if (session && session.title === "New conversation") {
      const shortTitle = input.content.length > 45
        ? input.content.slice(0, 45) + "…"
        : input.content;
      await prisma.chatSession.update({
        where: { id: sessionId },
        data: { title: shortTitle },
      });
    }

    // 3. Load history for context (excluding the message just saved)
    const historyRows = await prisma.chatMessage.findMany({
      where: { sessionId, NOT: { id: userMessage.id } },
      orderBy: { createdAt: "asc" },
      take: 20,
    });

    const conversationHistory: ConversationMessage[] = historyRows.map((m) => ({
      role: m.role === MessageRole.USER ? "user" : "assistant",
      content: m.content,
    }));

    // 4. Call AI — never throws
    const aiResult = await AiService.analyze(conversationHistory, input.content);
    const analysis = aiResult.analysis;

    // ── Default booking outcome (will be updated below) ───────
    let booking: BookingOutcome = { status: "not_requested" };
    let assistantContent = analysis?.reply
      ?? "I'm having trouble right now. Please try again or use the booking form below.";
    let fallbackForm: FallbackFormData | null = null;

    // 5. Orchestrate based on AI result ────────────────────────

    if (!aiResult.success || !analysis) {
      // AI unavailable → always show fallback form so user can still book
      booking = { status: "ai_unavailable" };
      fallbackForm = { date: null, time: null, reason: null, missing: ["date", "time", "reason"] };

    } else if (analysis.intent === "book_appointment") {

      // ── Backend re-validates everything independently ────────
      const safeDate   = analysis.date   ? validateExtractedDate(analysis.date)     : null;
      const safeTime   = analysis.time   ? validateExtractedTime(analysis.time)     : null;
      const safeReason = analysis.reason ? validateExtractedReason(analysis.reason) : null;

      // Compute what is actually missing after backend validation
      const actualMissing: string[] = [];
      if (!safeDate)   actualMissing.push("date");
      if (!safeTime)   actualMissing.push("time");
      if (!safeReason) actualMissing.push("reason");

      if (actualMissing.length > 0) {
        // ── Missing fields → ask for clarification ─────────────
        booking = { status: "incomplete", missing: actualMissing };
        assistantContent = buildClarifyMessage(actualMissing, {
          date:   safeDate,
          time:   safeTime,
          reason: safeReason,
        });
        // Provide partial form data for frontend fallback
        fallbackForm = {
          date:    safeDate,
          time:    safeTime,
          reason:  safeReason,
          missing: actualMissing,
        };

      } else {
        // ── All fields present — attempt booking ───────────────
        try {
          const appointment = await AppointmentService.create(userId, {
            appointment_date: safeDate!,
            appointment_time: safeTime!,
            reason:           safeReason!,
          });

          booking = { status: "booked", appointment };
          assistantContent = [
            `✅ Your appointment has been booked!`,
            `📅 Date:   ${safeDate}`,
            `⏰ Time:   ${safeTime}`,
            `📋 Reason: ${safeReason}`,
            ``,
            `You'll find it in your appointments list. Is there anything else I can help you with?`,
          ].join("\n");

          logger.info("Appointment booked via chat", {
            userId,
            sessionId,
            appointmentId: appointment.id,
            date: safeDate,
            time: safeTime,
          });

        } catch (err: unknown) {
          // Conflict or other booking error — sanitize message before user-facing reply
          const isConflict = (err as { statusCode?: number }).statusCode === 409;
          const internalMsg = err instanceof Error ? err.message : "Booking failed";

          booking = { status: "conflict", message: internalMsg };
          // Use a safe user-facing message — never expose raw internal errors
          assistantContent = isConflict
            ? `You already have an appointment on ${safeDate} at ${safeTime}. Would you like to choose a different time?`
            : `I wasn't able to complete the booking. Please try a different time or use the booking form below.`;
          fallbackForm = { date: safeDate, time: safeTime, reason: safeReason, missing: [] };
        }
      }

    } else {
      // General question or unknown intent — use AI reply as-is
      booking = { status: "not_requested" };
    }

    // 6. Save assistant message
    const assistantMessage = await prisma.chatMessage.create({
      data: { sessionId, role: MessageRole.ASSISTANT, content: assistantContent },
    });

    // 7. Bump session updatedAt
    await prisma.chatSession.update({
      where: { id: sessionId },
      data:  { updatedAt: new Date() },
    });

    return {
      userMessage,
      assistantMessage,
      analysis,
      booking,
      fallbackForm,
      aiAvailable: aiResult.success,
    };
  },
};
