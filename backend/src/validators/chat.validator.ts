import { z } from "zod";

// ─────────────────────────────────────────────────────────────
// Create session schema
// ─────────────────────────────────────────────────────────────
export const createSessionSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Title must not be empty")
    .max(255, "Title must not exceed 255 characters")
    .optional()
    .default("New conversation"),
});

// ─────────────────────────────────────────────────────────────
// Send message schema
// ─────────────────────────────────────────────────────────────
export const sendMessageSchema = z.object({
  content: z
    .string({ required_error: "Message content is required" })
    .trim()
    .min(1, "Message cannot be empty")
    .max(4000, "Message must not exceed 4000 characters"),
});

export type CreateSessionInput = z.infer<typeof createSessionSchema>;
export type SendMessageInput   = z.infer<typeof sendMessageSchema>;
