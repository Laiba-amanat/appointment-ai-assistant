import express, { type Application } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import compression from "compression";

import { env } from "./config/env";
import { apiLimiter } from "./middleware/rateLimiter";
import { errorHandler } from "./middleware/errorHandler";
import { notFound } from "./middleware/notFound";
import { logger } from "./utils/logger";
import router from "./routes/index";

const app: Application = express();

// ─────────────────────────────────────────────────────────────
// Security headers
// ─────────────────────────────────────────────────────────────
app.use(helmet());

// ─────────────────────────────────────────────────────────────
// CORS
// CORS_ORIGIN can be a comma-separated list for multiple origins.
// e.g. http://localhost:3000,http://localhost:3001
// ─────────────────────────────────────────────────────────────
const allowedOrigins = env.CORS_ORIGIN
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (curl, mobile apps, Postman)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error(`CORS: origin '${origin}' not allowed`));
    },
    credentials: true,
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// ─────────────────────────────────────────────────────────────
// Response compression
// ─────────────────────────────────────────────────────────────
app.use(compression());

// ─────────────────────────────────────────────────────────────
// Body parsing
// Limit to 10kb — prevents oversized payload attacks
// ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));

// ─────────────────────────────────────────────────────────────
// HTTP request logging (morgan → our logger)
// Skips /api/health to avoid noise in logs
// ─────────────────────────────────────────────────────────────
app.use(
  morgan(
    env.NODE_ENV === "production" ? "combined" : "dev",
    {
      stream: {
        write: (message: string): void => {
          logger.info(message.trim());
        },
      },
      skip: (_req, _res) => _req.url === "/api/health",
    }
  )
);

// ─────────────────────────────────────────────────────────────
// Rate limiting — applied to all /api/* routes
// Configured via RATE_LIMIT_WINDOW_MS and RATE_LIMIT_MAX in .env
// ─────────────────────────────────────────────────────────────
app.use("/api", apiLimiter);

// ─────────────────────────────────────────────────────────────
// API routes
// Health check is registered inside router (routes/index.ts)
// Feature routes (auth, appointments, chat) added in later steps
// ─────────────────────────────────────────────────────────────
app.use("/api", router);

// ─────────────────────────────────────────────────────────────
// 404 handler — catches any route not matched above
// ─────────────────────────────────────────────────────────────
app.use(notFound);

// ─────────────────────────────────────────────────────────────
// Global error handler — must be the LAST middleware registered
// Handles all errors passed via next(err)
// ─────────────────────────────────────────────────────────────
app.use(errorHandler);

export default app;
