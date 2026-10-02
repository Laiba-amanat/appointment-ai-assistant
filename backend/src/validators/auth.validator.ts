import { z } from "zod";

// ─────────────────────────────────────────────────────────────
// Signup schema
// ─────────────────────────────────────────────────────────────
export const signupSchema = z.object({
  name: z
    .string({ required_error: "Name is required" })
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must not exceed 100 characters"),

  email: z
    .string({ required_error: "Email is required" })
    .trim()
    .toLowerCase()                          // normalize before storing
    .email("Must be a valid email address")
    .max(255, "Email must not exceed 255 characters"),

  password: z
    .string({ required_error: "Password is required" })
    .min(8, "Password must be at least 8 characters")
    .max(72, "Password must not exceed 72 characters") // bcrypt hard limit
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
});

// ─────────────────────────────────────────────────────────────
// Login schema
// ─────────────────────────────────────────────────────────────
export const loginSchema = z.object({
  email: z
    .string({ required_error: "Email is required" })
    .trim()
    .toLowerCase()
    .email("Must be a valid email address"),

  password: z
    .string({ required_error: "Password is required" })
    .min(1, "Password is required"),
});

// ─────────────────────────────────────────────────────────────
// Inferred TypeScript types
// ─────────────────────────────────────────────────────────────
export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput  = z.infer<typeof loginSchema>;
