import { z } from "zod";

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

/**
 * Validates YYYY-MM-DD and ensures the date is not before today.
 * Compares date strings (YYYY-MM-DD) directly to avoid timezone
 * issues where new Date("YYYY-MM-DD") parses as UTC midnight but
 * today's local date may be "ahead" of UTC.
 */
const futureDateString = z
  .string({ required_error: "appointment_date is required" })
  .regex(/^\d{4}-\d{2}-\d{2}$/, "appointment_date must be in YYYY-MM-DD format")
  .refine((val) => {
    const d = new Date(val);
    return !isNaN(d.getTime());
  }, "appointment_date must be a valid date")
  .refine((val) => {
    // Compare as YYYY-MM-DD strings — avoids UTC vs local timezone issues
    const todayStr = new Date().toLocaleDateString("en-CA"); // en-CA gives YYYY-MM-DD
    return val >= todayStr;
  }, "appointment_date must not be in the past");

/** Validates HH:MM (24-hour) */
const timeString = z
  .string({ required_error: "appointment_time is required" })
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "appointment_time must be in HH:MM format (24-hour)");

// ─────────────────────────────────────────────────────────────
// Create schema
// ─────────────────────────────────────────────────────────────
export const createAppointmentSchema = z.object({
  appointment_date: futureDateString,

  appointment_time: timeString,

  reason: z
    .string({ required_error: "reason is required" })
    .trim()
    .min(2, "reason must be at least 2 characters")
    .max(500, "reason must not exceed 500 characters"),
});

// ─────────────────────────────────────────────────────────────
// Update schema — all fields optional, at least one required
// ─────────────────────────────────────────────────────────────
export const updateAppointmentSchema = z
  .object({
    appointment_date: futureDateString.optional(),
    appointment_time: timeString.optional(),
    reason: z.string().trim().min(2).max(500).optional(),
    status: z
      .enum(["SCHEDULED", "CANCELLED", "COMPLETED"], {
        errorMap: () => ({
          message: "status must be SCHEDULED, CANCELLED, or COMPLETED",
        }),
      })
      .optional(),
  })
  .refine(
    (data) => Object.keys(data).length > 0,
    "At least one field must be provided for update"
  );

// ─────────────────────────────────────────────────────────────
// Inferred types
// ─────────────────────────────────────────────────────────────
export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;
export type UpdateAppointmentInput = z.infer<typeof updateAppointmentSchema>;
