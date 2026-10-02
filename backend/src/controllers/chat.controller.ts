import type { Request, Response, NextFunction } from "express";
import { ChatService } from "../services/chat.service";
import { sendSuccess, sendCreated } from "../utils/response";
import type { AuthenticatedRequest } from "../types";

const auth = (req: Request) => (req as AuthenticatedRequest).user;

// ─────────────────────────────────────────────────────────────
// POST /api/chat/sessions
// ─────────────────────────────────────────────────────────────
export async function createSession(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const session = await ChatService.createSession(auth(req).id, req.body);
    sendCreated(res, { session }, "Chat session created");
  } catch (err) {
    next(err);
  }
}

// ─────────────────────────────────────────────────────────────
// GET /api/chat/sessions
// ─────────────────────────────────────────────────────────────
export async function listSessions(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const sessions = await ChatService.listSessions(auth(req).id);
    sendSuccess(res, { sessions, count: sessions.length });
  } catch (err) {
    next(err);
  }
}

// ─────────────────────────────────────────────────────────────
// GET /api/chat/sessions/:sessionId/messages
// ─────────────────────────────────────────────────────────────
export async function getMessages(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const messages = await ChatService.getMessages(
      req.params.sessionId,
      auth(req).id
    );
    sendSuccess(res, { messages, count: messages.length });
  } catch (err) {
    next(err);
  }
}

// ─────────────────────────────────────────────────────────────
// POST /api/chat/sessions/:sessionId/messages
// ─────────────────────────────────────────────────────────────
export async function sendMessage(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const result = await ChatService.sendMessage(
      req.params.sessionId,
      auth(req).id,
      req.body
    );
    sendCreated(res, result, "Message processed");
  } catch (err) {
    next(err);
  }
}
