import type { Request, Response, NextFunction } from "express";
import { AppointmentService } from "../services/appointment.service";
import { sendSuccess, sendCreated } from "../utils/response";
import type { AuthenticatedRequest } from "../types";

// helper — cast once per handler
const auth = (req: Request) => (req as AuthenticatedRequest).user;

// ─────────────────────────────────────────────────────────────
// POST /api/appointments
// ─────────────────────────────────────────────────────────────
export async function createAppointment(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const appointment = await AppointmentService.create(auth(req).id, req.body);
    sendCreated(res, { appointment }, "Appointment created successfully");
  } catch (err) {
    next(err);
  }
}

// ─────────────────────────────────────────────────────────────
// GET /api/appointments
// ─────────────────────────────────────────────────────────────
export async function listAppointments(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const appointments = await AppointmentService.findAllForUser(auth(req).id);
    sendSuccess(res, { appointments, count: appointments.length });
  } catch (err) {
    next(err);
  }
}

// ─────────────────────────────────────────────────────────────
// GET /api/appointments/:id
// ─────────────────────────────────────────────────────────────
export async function getAppointment(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const appointment = await AppointmentService.findOne(
      req.params.id,
      auth(req).id
    );
    sendSuccess(res, { appointment });
  } catch (err) {
    next(err);
  }
}

// ─────────────────────────────────────────────────────────────
// PATCH /api/appointments/:id
// ─────────────────────────────────────────────────────────────
export async function updateAppointment(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const appointment = await AppointmentService.update(
      req.params.id,
      auth(req).id,
      req.body
    );
    sendSuccess(res, { appointment }, "Appointment updated successfully");
  } catch (err) {
    next(err);
  }
}

// ─────────────────────────────────────────────────────────────
// DELETE /api/appointments/:id
// ─────────────────────────────────────────────────────────────
export async function cancelAppointment(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const appointment = await AppointmentService.cancel(
      req.params.id,
      auth(req).id
    );
    sendSuccess(res, { appointment }, "Appointment cancelled successfully");
  } catch (err) {
    next(err);
  }
}
