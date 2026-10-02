import { env } from "./config/env";
import app from "./app";
import { logger } from "./utils/logger";
import { prisma } from "./db/prisma";

// ─────────────────────────────────────────────────────────────
// Catch unhandled promise rejections globally
// Prevents silent crashes in async code paths
// ─────────────────────────────────────────────────────────────
process.on("unhandledRejection", (reason: unknown) => {
  logger.error("Unhandled promise rejection", reason);
  // Give the process a moment to flush logs, then exit
  process.exit(1);
});

process.on("uncaughtException", (err: Error) => {
  logger.error("Uncaught exception", { message: err.message, stack: err.stack });
  process.exit(1);
});

// ─────────────────────────────────────────────────────────────
// Graceful shutdown helpers
// ─────────────────────────────────────────────────────────────
async function shutdown(signal: string): Promise<void> {
  logger.info(`${signal} received — shutting down gracefully`);
  await prisma.$disconnect();
  logger.info("Prisma disconnected");
  process.exit(0);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT",  () => shutdown("SIGINT"));

// ─────────────────────────────────────────────────────────────
// Main startup
// ─────────────────────────────────────────────────────────────
async function main(): Promise<void> {
  // 1. Verify database connectivity before accepting traffic
  try {
    await prisma.$connect();
    logger.info("PostgreSQL connected via Prisma");
  } catch (err) {
    logger.error("Database connection failed — exiting", err);
    process.exit(1);
  }

  // 2. Start HTTP server
  app.listen(env.PORT, () => {
    logger.info("─────────────────────────────────────────");
    logger.info(`  BookAI API server started`);
    logger.info(`  URL  : http://localhost:${env.PORT}`);
    logger.info(`  Env  : ${env.NODE_ENV}`);
    logger.info(`  Health: http://localhost:${env.PORT}/api/health`);
    logger.info("─────────────────────────────────────────");
  });
}

main().catch((err: unknown) => {
  logger.error("Fatal error during startup", err);
  process.exit(1);
});
