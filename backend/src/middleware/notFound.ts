import type { Request, Response } from "express";

/**
 * 404 handler — registered after all routes.
 * Any request that falls through to here gets a clean JSON 404.
 */
export function notFound(req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    message: `Cannot ${req.method} ${req.originalUrl}`,
  });
}
