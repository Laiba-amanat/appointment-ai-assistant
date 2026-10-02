import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../db/prisma";
import { env } from "../config/env";
import { createError } from "../middleware/errorHandler";
import type { SignupInput, LoginInput } from "../validators/auth.validator";

// ─────────────────────────────────────────────────────────────
// Safe user type — never includes passwordHash
// ─────────────────────────────────────────────────────────────
export interface SafeUser {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthResult {
  user: SafeUser;
  token: string;
}

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

/** Strip passwordHash before returning user data */
function toSafeUser(user: {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  createdAt: Date;
  updatedAt: Date;
}): SafeUser {
  const { passwordHash: _removed, ...safe } = user;
  return safe;
}

/** Sign a JWT containing the user's id and email */
function signToken(userId: string, email: string): string {
  return jwt.sign(
    { id: userId, email },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN } as jwt.SignOptions
  );
}

// ─────────────────────────────────────────────────────────────
// Service methods
// ─────────────────────────────────────────────────────────────

const BCRYPT_ROUNDS = 12;

export const AuthService = {

  /**
   * Register a new user.
   * Throws 409 if email already exists.
   */
  async signup(input: SignupInput): Promise<AuthResult> {
    // Check for duplicate email
    const existing = await prisma.user.findUnique({
      where: { email: input.email },
      select: { id: true },
    });
    if (existing) {
      throw createError("An account with this email already exists", 409);
    }

    // Hash password — never store plaintext
    const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);

    // Create user
    const user = await prisma.user.create({
      data: {
        name: input.name,
        email: input.email,
        passwordHash,
      },
    });

    const token = signToken(user.id, user.email);

    return { user: toSafeUser(user), token };
  },

  /**
   * Authenticate an existing user.
   * Throws 401 for invalid credentials (email or password).
   * Uses a generic message to prevent email enumeration.
   */
  async login(input: LoginInput): Promise<AuthResult> {
    const user = await prisma.user.findUnique({
      where: { email: input.email },
    });

    // Use constant-time compare even when user doesn't exist
    // to prevent timing-based email enumeration attacks
    const dummyHash = "$2a$12$invalidhashusedtopreventimenumeration00000000000000000";
    const hashToCompare = user?.passwordHash ?? dummyHash;

    const passwordValid = await bcrypt.compare(input.password, hashToCompare);

    if (!user || !passwordValid) {
      throw createError("Invalid email or password", 401);
    }

    const token = signToken(user.id, user.email);

    return { user: toSafeUser(user), token };
  },

  /**
   * Fetch the authenticated user's profile by id.
   * Throws 404 if user no longer exists (e.g. deleted after token issued).
   */
  async getProfile(userId: string): Promise<SafeUser> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw createError("User not found", 404);
    }

    return user;
  },
};
