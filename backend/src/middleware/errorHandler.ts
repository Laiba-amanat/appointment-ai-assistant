import type { Request, Response, NextFunction } from "express";
import { logger } from "../utils/logger";
import { env } from "../config/env";

// ─────────────────────────────────────────────────────────────
// Typed error interface
// ─────────────────────────────────────────────────────────────
export interface AppError extends Error {
  statusCode?: number;
  code?: string;
}

/** Factory for creating operational errors with an HTTP status. */
export function createError(message: string, statusCode: number): AppError {
  const err: AppError = new Error(message);
  err.statusCode = statusCode;
  return err;
}

// ─────────────────────────────────────────────────────────────
// Global error handler — registered LAST in the middleware chain.
// ─────────────────────────────────────────────────────────────
export function errorHandler(
  err: AppError,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const isDev = env.NODE_ENV !== "production";

  // Log internally — stack only in development
  logger.error(`${req.method} ${req.originalUrl}`, {
    message: err.message,
    code: err.code,
    stack: isDev ? err.stack : undefined,
  });

  // ── Malformed JSON body ────────────────────────────────────
  if (err instanceof SyntaxError && "body" in err) {
    res.status(400).json({ success: false, message: "Invalid JSON in request body" });
    return;
  }

  // ── Prisma: unique constraint ──────────────────────────────
  if (err.code === "P2002") {
    res.status(409).json({ success: false, message: "A record with that value already exists." });
    return;
  }

  // ── Prisma: record not found ───────────────────────────────
  if (err.code === "P2025") {
    res.status(404).json({ success: false, message: "Record not found." });
    return;
  }

  // ── Prisma: foreign key failure ────────────────────────────
  if (err.code === "P2003") {
    res.status(400).json({ success: false, message: "Related record does not exist." });
    return;
  }

  const statusCode = err.statusCode ?? 500;

  // Never leak internal 5xx details in production
  const message =
    statusCode >= 500 && !isDev
      ? "Internal server error"
      : err.message ?? "Internal server error";

  res.status(statusCode).json({ success: false, message });
}
