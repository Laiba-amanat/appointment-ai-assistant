import { Router, type Request, type Response } from "express";
import { prisma } from "../db/prisma";
import { env } from "../config/env";

const router = Router();

/**
 * GET /api/health
 *
 * Public endpoint used by load balancers and uptime monitors.
 * In production: minimal response (no environment internals leaked).
 * In development: richer response for debugging.
 */
router.get("/health", async (_req: Request, res: Response): Promise<void> => {
  let dbStatus: "connected" | "unreachable" = "unreachable";
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbStatus = "connected";
  } catch {
    dbStatus = "unreachable";
  }

  const healthy = dbStatus === "connected";
  const isDev = env.NODE_ENV !== "production";

  const body: Record<string, unknown> = {
    success: healthy,
    status: healthy ? "ok" : "degraded",
    timestamp: new Date().toISOString(),
    database: dbStatus,
    uptime: Math.floor(process.uptime()),
  };

  // Development-only details — not exposed in production
  if (isDev) {
    body.environment  = env.NODE_ENV;
    body.aiConfigured = !!env.GROQ_API_KEY;
    body.aiModel      = env.GROQ_MODEL;
  }

  res.status(healthy ? 200 : 503).json(body);
});

export default router;
