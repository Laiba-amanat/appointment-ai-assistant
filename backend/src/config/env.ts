import "dotenv/config";

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required environment variable: ${key}`);
  return value;
}

const rawPort = parseInt(process.env.PORT ?? "5000", 10);
if (isNaN(rawPort) || rawPort < 1 || rawPort > 65535) {
  throw new Error(`PORT must be a valid port number, got: ${process.env.PORT}`);
}

export const env = {
  NODE_ENV: process.env.NODE_ENV ?? "development",
  PORT:     rawPort,

  DATABASE_URL: requireEnv("DATABASE_URL"),

  JWT_SECRET:    requireEnv("JWT_SECRET"),
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN ?? "7d",

  // Groq AI (free tier, OpenAI-compatible)
  GROQ_API_KEY: process.env.GROQ_API_KEY ?? "",
  GROQ_MODEL:   process.env.GROQ_MODEL ?? "qwen/qwen3.8-27b",

  CORS_ORIGIN: process.env.CORS_ORIGIN ?? "http://localhost:3000",

  RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS ?? "900000", 10),
  RATE_LIMIT_MAX:       parseInt(process.env.RATE_LIMIT_MAX ?? "100", 10),
} as const;
