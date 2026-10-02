import rateLimit, { type RateLimitRequestHandler } from "express-rate-limit";
import { env } from "../config/env";

// ─────────────────────────────────────────────────────────────
// General API limiter
// Applied to all /api/* routes.
// Window and max configured via RATE_LIMIT_WINDOW_MS / RATE_LIMIT_MAX in .env
// ─────────────────────────────────────────────────────────────
export const apiLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,   // default: 900_000ms (15 min)
  max: env.RATE_LIMIT_MAX,              // default: 100 requests
  standardHeaders: true,               // Return RateLimit-* headers
  legacyHeaders: false,                // Disable X-RateLimit-* headers
  handler: (_req, res) => {
    res.status(429).json({
      success: false,
      message: "Too many requests. Please slow down and try again later.",
    });
  },
});

// ─────────────────────────────────────────────────────────────
// Auth-specific limiter (stricter)
// Applied to /api/auth/* in Step 4 to prevent brute-force.
// ─────────────────────────────────────────────────────────────
export const authLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 15 * 60 * 1000,   // 15 minutes
  max: 10,                     // 10 auth attempts per window per IP
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({
      success: false,
      message: "Too many authentication attempts. Please try again in 15 minutes.",
    });
  },
});
