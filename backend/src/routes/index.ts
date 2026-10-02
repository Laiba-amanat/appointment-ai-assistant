import { Router } from "express";
import healthRouter       from "./health";
import authRouter         from "./auth";
import appointmentsRouter from "./appointments";
import chatRouter         from "./chat";

const router = Router();

// ── Health ─────────────────────────────────────────────────────
// GET /api/health
router.use(healthRouter);

// ── Auth ───────────────────────────────────────────────────────
// POST /api/auth/signup
// POST /api/auth/login
// GET  /api/auth/me
router.use("/auth", authRouter);

// ── Appointments ───────────────────────────────────────────────
// POST   /api/appointments
// GET    /api/appointments
// GET    /api/appointments/:id
// PATCH  /api/appointments/:id
// DELETE /api/appointments/:id
router.use("/appointments", appointmentsRouter);

// ── Chat ───────────────────────────────────────────────────────
// POST /api/chat/sessions
// GET  /api/chat/sessions
// GET  /api/chat/sessions/:sessionId/messages
// POST /api/chat/sessions/:sessionId/messages
router.use("/chat", chatRouter);

export default router;
