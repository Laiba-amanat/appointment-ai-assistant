import { Router } from "express";
import { signup, login, getMe } from "../controllers/auth.controller";
import { authenticate } from "../middleware/authenticate";
import { validate } from "../middleware/validate";
import { signupSchema, loginSchema } from "../validators/auth.validator";
import { authLimiter } from "../middleware/rateLimiter";

const router = Router();

/**
 * POST /api/auth/signup
 * Public — create a new account
 */
router.post(
  "/signup",
  authLimiter,          // stricter rate limit on auth routes
  validate(signupSchema),
  signup
);

/**
 * POST /api/auth/login
 * Public — authenticate and receive JWT
 */
router.post(
  "/login",
  authLimiter,
  validate(loginSchema),
  login
);

/**
 * GET /api/auth/me
 * Protected — return the authenticated user's profile
 */
router.get(
  "/me",
  authenticate,
  getMe
);

export default router;
