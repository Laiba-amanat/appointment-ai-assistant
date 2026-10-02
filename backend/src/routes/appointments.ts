import { Router } from "express";
import { authenticate } from "../middleware/authenticate";
import { validate } from "../middleware/validate";
import {
  createAppointmentSchema,
  updateAppointmentSchema,
} from "../validators/appointment.validator";
import {
  createAppointment,
  listAppointments,
  getAppointment,
  updateAppointment,
  cancelAppointment,
} from "../controllers/appointment.controller";

const router = Router();

// All appointment routes require authentication
router.use(authenticate);

/**
 * POST /api/appointments
 * Create a new appointment for the authenticated user
 */
router.post("/", validate(createAppointmentSchema), createAppointment);

/**
 * GET /api/appointments
 * List all appointments for the authenticated user
 */
router.get("/", listAppointments);

/**
 * GET /api/appointments/:id
 * Get a single appointment — ownership enforced
 */
router.get("/:id", getAppointment);

/**
 * PATCH /api/appointments/:id
 * Update appointment fields — ownership enforced, conflict re-checked
 */
router.patch("/:id", validate(updateAppointmentSchema), updateAppointment);

/**
 * DELETE /api/appointments/:id
 * Cancel appointment (sets status to CANCELLED, preserves record)
 */
router.delete("/:id", cancelAppointment);

export default router;
