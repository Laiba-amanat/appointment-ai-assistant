import { env } from "../config/env";

type LogLevel = "info" | "warn" | "error" | "debug";

const LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const currentLevel: LogLevel = env.NODE_ENV === "production" ? "info" : "debug";

function log(level: LogLevel, message: string, meta?: unknown): void {
  if (LEVELS[level] < LEVELS[currentLevel]) return;

  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
  const output = meta ? `${prefix} ${message} ${JSON.stringify(meta)}` : `${prefix} ${message}`;

  if (level === "error") {
    console.error(output);
  } else {
    console.log(output);
  }
}

export const logger = {
  info: (msg: string, meta?: unknown) => log("info", msg, meta),
  warn: (msg: string, meta?: unknown) => log("warn", msg, meta),
  error: (msg: string, meta?: unknown) => log("error", msg, meta),
  debug: (msg: string, meta?: unknown) => log("debug", msg, meta),
};
