import type { Request, Response, NextFunction } from "express";
import { AuthService } from "../services/auth.service";
import { sendSuccess, sendCreated } from "../utils/response";
import type { AuthenticatedRequest } from "../types";

// ─────────────────────────────────────────────────────────────
// POST /api/auth/signup
// ─────────────────────────────────────────────────────────────
export async function signup(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // req.body already validated + typed by Zod middleware
    const result = await AuthService.signup(req.body);

    sendCreated(res, result, "Account created successfully");
  } catch (err) {
    next(err);
  }
}

// ─────────────────────────────────────────────────────────────
// POST /api/auth/login
// ─────────────────────────────────────────────────────────────
export async function login(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const result = await AuthService.login(req.body);

    sendSuccess(res, result, "Login successful");
  } catch (err) {
    next(err);
  }
}

// ─────────────────────────────────────────────────────────────
// GET /api/auth/me  (protected)
// ─────────────────────────────────────────────────────────────
export async function getMe(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // authenticate middleware guarantees req.user is set
    const { id } = (req as AuthenticatedRequest).user;
    const user = await AuthService.getProfile(id);

    sendSuccess(res, { user }, "Profile retrieved successfully");
  } catch (err) {
    next(err);
  }
}
