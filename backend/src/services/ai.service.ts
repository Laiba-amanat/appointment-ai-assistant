/**
 * AI Service — Groq API (OpenAI-compatible, free tier)
 * Model: llama-3.1-8b-instant — fast, free, excellent for structured JSON
 */

import { z } from "zod";
import { env } from "../config/env";
import { logger } from "../utils/logger";

const GROQ_API_URL    = "https://api.groq.com/openai/v1/chat/completions";
const REQUEST_TIMEOUT = 15_000;
const MAX_RETRIES     = 1;
const RETRY_DELAY     = 2_000;

// ─────────────────────────────────────────────────────────────
// System prompt
// ─────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a helpful AI appointment booking assistant for BookAI, a scheduling platform.

Your ONLY job is to extract booking information from user messages and respond with a JSON object.
You are NOT booking the appointment yourself — you are just extracting what the user wants.
Never refuse or say you cannot access systems. Just extract the data and reply in JSON.

You MUST always respond with a single valid JSON object. No markdown, no explanation, no code fences.

Required JSON structure:
{
  "intent": "book_appointment" | "general_question" | "unknown",
  "reply": "friendly message to show the user",
  "date": "YYYY-MM-DD" | null,
  "time": "HH:mm" | null,
  "reason": "reason for appointment" | null,
  "missing": ["date", "time", "reason"]
}

Rules:
- intent = "book_appointment" when user wants to schedule/book/create an appointment
- intent = "general_question" for questions about the service
- intent = "unknown" for greetings or unrelated messages
- For book_appointment: extract date (YYYY-MM-DD), time (24h HH:mm), reason from user message
- "missing" lists which of [date, time, reason] are not yet provided
- Resolve "tomorrow", "next Monday" etc to real YYYY-MM-DD dates
- Today's date: ${new Date().toLocaleDateString("en-CA")}
- Never invent details the user did not provide
- If user says "hi" or greets, set intent=unknown and reply with a friendly greeting asking how you can help
- ONLY output the JSON object, nothing else`;

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
}

export interface AiAnalysis {
  intent: "book_appointment" | "general_question" | "unknown";
  reply: string;
  date: string | null;
  time: string | null;
  reason: string | null;
  missing: string[];
}

export interface AiServiceResult {
  success:  boolean;
  analysis: AiAnalysis | null;
  error?:   string;
}

// ─────────────────────────────────────────────────────────────
// Zod schema
// ─────────────────────────────────────────────────────────────

const aiSchema = z.object({
  intent:  z.enum(["book_appointment", "general_question", "unknown"]),
  reply:   z.string().trim().min(1),
  date:    z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  time:    z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).nullable(),
  reason:  z.string().trim().min(1).nullable(),
  missing: z.array(z.enum(["date", "time", "reason"])).default([]),
});

type AiOutput = z.infer<typeof aiSchema>;

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

function fallback(reply: string): AiAnalysis {
  return { intent: "unknown", reply, date: null, time: null, reason: null, missing: ["date", "time", "reason"] };
}

function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}

async function callGroq(messages: object[]): Promise<{ status: number; ok: boolean; text: string }> {
  const ctrl  = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), REQUEST_TIMEOUT);
  try {
    const res = await fetch(GROQ_API_URL, {
      method:  "POST",
      headers: {
        "Content-Type":  "application/json",
        "Authorization": `Bearer ${env.GROQ_API_KEY}`,
      },
      body:   JSON.stringify({
        model:       env.GROQ_MODEL,
        messages,
        temperature: 0.2,
        max_tokens:  400,
        // Groq supports response_format for JSON
        response_format: { type: "json_object" },
      }),
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    const text = await res.text().catch(() => "");
    return { status: res.status, ok: res.ok, text };
  } catch (err) {
    clearTimeout(timer);
    const isTimeout = err instanceof Error && err.name === "AbortError";
    return { status: isTimeout ? 408 : 503, ok: false, text: isTimeout ? "timeout" : "network_error" };
  }
}

// ─────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────

export const AiService = {

  async analyze(history: ConversationMessage[], userMessage: string): Promise<AiServiceResult> {

    if (!env.GROQ_API_KEY) {
      logger.warn("GROQ_API_KEY not configured");
      return { success: false, analysis: fallback("AI is not configured. Please use the booking form below."), error: "No API key" };
    }

    const messages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...history.slice(-10).map(m => ({ role: m.role, content: m.content })),
      { role: "user", content: userMessage },
    ];

    logger.debug("Groq request", { model: env.GROQ_MODEL, history: history.length });

    let result = await callGroq(messages);

    // Retry once on 429
    for (let i = 1; i <= MAX_RETRIES && result.status === 429; i++) {
      logger.warn(`Groq 429 — retry ${i} in ${RETRY_DELAY}ms`);
      await sleep(RETRY_DELAY);
      result = await callGroq(messages);
    }

    if (!result.ok) {
      logger.error("Groq API error", { status: result.status, preview: result.text.slice(0, 120) });
      const msg =
        result.status === 408  ? "The AI took too long. Please try again." :
        result.status === 429  ? "AI is busy. Please try again in a moment." :
        result.status === 401  ? "AI key is invalid. Please check configuration." :
        "I couldn't reach the AI. You can use the booking form below.";
      return { success: false, analysis: fallback(msg), error: `HTTP ${result.status}` };
    }

    logger.debug("Groq response", { length: result.text.length });

    // Parse Groq envelope
    let rawContent: string;
    try {
      const envelope = JSON.parse(result.text) as {
        choices?: { message?: { content?: string } }[];
      };
      rawContent = envelope.choices?.[0]?.message?.content ?? "";
    } catch {
      logger.warn("Groq envelope parse failed", { preview: result.text.slice(0, 100) });
      return { success: false, analysis: fallback("Unexpected response. Please try again."), error: "Envelope parse failed" };
    }

    // Strip markdown fences if present
    rawContent = rawContent.replace(/^```json\s*/i, "").replace(/```\s*$/,"").trim();

    // Parse JSON payload
    let parsed: unknown;
    try {
      parsed = JSON.parse(rawContent);
    } catch {
      logger.warn("Groq non-JSON payload", { preview: rawContent.slice(0, 100) });
      return { success: false, analysis: fallback("I didn't understand that. Could you rephrase?"), error: "Non-JSON payload" };
    }

    // Zod validate
    const v = aiSchema.safeParse(parsed);
    if (!v.success) {
      logger.warn("Groq Zod failed", { errors: v.error.errors.map(e => e.message) });
      return { success: false, analysis: fallback("Unexpected format from AI. Please try again."), error: "Zod failed" };
    }

    const data: AiOutput = v.data;

    // Nullify past dates
    if (data.intent === "book_appointment" && data.date) {
      const todayStr = new Date().toLocaleDateString("en-CA");
      if (data.date < todayStr) {
        data.date = null;
        if (!data.missing.includes("date")) data.missing.push("date");
      }
    }

    logger.debug("AI analysis done", { intent: data.intent, missing: data.missing });

    return {
      success:  true,
      analysis: { intent: data.intent, reply: data.reply, date: data.date, time: data.time, reason: data.reason, missing: data.missing },
    };
  },
};
