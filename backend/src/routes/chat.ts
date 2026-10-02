import { Router } from "express";
import { authenticate } from "../middleware/authenticate";
import { validate } from "../middleware/validate";
import { createSessionSchema, sendMessageSchema } from "../validators/chat.validator";
import {
  createSession,
  listSessions,
  getMessages,
  sendMessage,
} from "../controllers/chat.controller";

const router = Router();

// All chat routes require authentication
router.use(authenticate);

/**
 * POST /api/chat/sessions
 * Create a new chat session
 */
router.post("/sessions", validate(createSessionSchema), createSession);

/**
 * GET /api/chat/sessions
 * List all sessions for the authenticated user
 */
router.get("/sessions", listSessions);

/**
 * GET /api/chat/sessions/:sessionId/messages
 * Get all messages in a session — ownership enforced
 */
router.get("/sessions/:sessionId/messages", getMessages);

/**
 * POST /api/chat/sessions/:sessionId/messages
 * Send a user message — ownership enforced, AI added in Step 7
 */
router.post(
  "/sessions/:sessionId/messages",
  validate(sendMessageSchema),
  sendMessage
);

export default router;
