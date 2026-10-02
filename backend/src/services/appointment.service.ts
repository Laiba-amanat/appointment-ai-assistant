import { AppointmentStatus } from "@prisma/client";
import { prisma } from "../db/prisma";
import { createError } from "../middleware/errorHandler";
import type {
  CreateAppointmentInput,
  UpdateAppointmentInput,
} from "../validators/appointment.validator";

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────
export type AppointmentRow = {
  id: string;
  userId: string;
  appointmentDate: Date;
  appointmentTime: string;
  reason: string;
  status: AppointmentStatus;
  createdAt: Date;
  updatedAt: Date;
};

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

/**
 * Check whether the user already has a SCHEDULED appointment
 * on the same date + time (excluding a given id for updates).
 */
async function checkConflict(
  userId: string,
  date: string,
  time: string,
  excludeId?: string
): Promise<void> {
  const where: Record<string, unknown> = {
    userId,
    appointmentDate: new Date(date),
    appointmentTime: time,
    status: AppointmentStatus.SCHEDULED,
  };
  if (excludeId) where.id = { not: excludeId };

  const conflict = await prisma.appointment.findFirst({ where });
  if (conflict) {
    throw createError(
      `You already have a scheduled appointment on ${date} at ${time}`,
      409
    );
  }
}

/**
 * Fetch an appointment and verify it belongs to the requesting user.
 * Throws 404 if not found, 403 if owned by someone else.
 */
async function findOwnedOrThrow(
  id: string,
  userId: string
): Promise<AppointmentRow> {
  const appt = await prisma.appointment.findUnique({ where: { id } });
  if (!appt) throw createError("Appointment not found", 404);
  if (appt.userId !== userId)
    throw createError("You do not have access to this appointment", 403);
  return appt;
}

// ─────────────────────────────────────────────────────────────
// Service
// ─────────────────────────────────────────────────────────────
export const AppointmentService = {

  /**
   * Create a new appointment for the authenticated user.
   * Checks for date/time conflicts before inserting.
   */
  async create(
    userId: string,
    input: CreateAppointmentInput
  ): Promise<AppointmentRow> {
    await checkConflict(userId, input.appointment_date, input.appointment_time);

    return prisma.appointment.create({
      data: {
        userId,
        appointmentDate: new Date(input.appointment_date),
        appointmentTime: input.appointment_time,
        reason: input.reason,
        status: AppointmentStatus.SCHEDULED,
      },
    });
  },

  /**
   * Return all appointments for the authenticated user.
   * Ordered: upcoming SCHEDULED first, then by date descending.
   */
  async findAllForUser(userId: string): Promise<AppointmentRow[]> {
    return prisma.appointment.findMany({
      where: { userId },
      orderBy: [
        { appointmentDate: "asc" },
        { appointmentTime: "asc" },
      ],
    });
  },

  /**
   * Return one appointment — enforces ownership.
   */
  async findOne(id: string, userId: string): Promise<AppointmentRow> {
    return findOwnedOrThrow(id, userId);
  },

  /**
   * Update appointment fields.
   * Re-checks conflicts if date or time changes.
   * Cannot modify a CANCELLED appointment.
   */
  async update(
    id: string,
    userId: string,
    input: UpdateAppointmentInput
  ): Promise<AppointmentRow> {
    const existing = await findOwnedOrThrow(id, userId);

    if (existing.status === AppointmentStatus.CANCELLED) {
      throw createError("Cannot update a cancelled appointment", 400);
    }

    // Conflict check only if date/time is actually changing
    const newDate = input.appointment_date ?? existing.appointmentDate.toISOString().split("T")[0];
    const newTime = input.appointment_time ?? existing.appointmentTime;

    const dateOrTimeChanging =
      input.appointment_date !== undefined || input.appointment_time !== undefined;

    if (dateOrTimeChanging) {
      await checkConflict(userId, newDate, newTime, id);
    }

    return prisma.appointment.update({
      where: { id },
      data: {
        ...(input.appointment_date && {
          appointmentDate: new Date(input.appointment_date),
        }),
        ...(input.appointment_time && {
          appointmentTime: input.appointment_time,
        }),
        ...(input.reason    && { reason: input.reason }),
        ...(input.status    && { status: input.status as AppointmentStatus }),
      },
    });
  },

  /**
   * Cancel an appointment (sets status to CANCELLED).
   * Preserves the record for historical purposes.
   * Throws 400 if already cancelled.
   */
  async cancel(id: string, userId: string): Promise<AppointmentRow> {
    const existing = await findOwnedOrThrow(id, userId);

    if (existing.status === AppointmentStatus.CANCELLED) {
      throw createError("Appointment is already cancelled", 400);
    }

    return prisma.appointment.update({
      where: { id },
      data: { status: AppointmentStatus.CANCELLED },
    });
  },
};
