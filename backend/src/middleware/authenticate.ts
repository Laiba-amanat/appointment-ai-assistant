import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { sendUnauthorized } from "../utils/response";
import type { AuthenticatedRequest } from "../types";

// ─────────────────────────────────────────────────────────────
// JWT payload shape
// ─────────────────────────────────────────────────────────────
interface JwtPayload {
  id: string;
  email: string;
  iat: number;
  exp: number;
}

// ─────────────────────────────────────────────────────────────
// authenticate middleware
//
// Reads:  Authorization: Bearer <token>
// Sets:   req.user = { id, email }
// Sends:  401 for missing / invalid / expired token
// ─────────────────────────────────────────────────────────────
export function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const authReq = req as AuthenticatedRequest;
  const authHeader = req.headers.authorization;

  // 1. Check header exists and has correct format
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    sendUnauthorized(res, "Authentication required. Provide a Bearer token.");
    return;
  }

  const token = authHeader.slice(7); // remove "Bearer "

  if (!token) {
    sendUnauthorized(res, "Authentication token is missing.");
    return;
  }

  // 2. Verify and decode
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;

    // 3. Attach user info to request.
    // role is set to "user" for this prototype — role-based access control
    // is not implemented at this scope. A full RBAC system would read role
    // from the DB on each request or embed it in the JWT payload.
    authReq.user = {
      id: decoded.id,
      email: decoded.email,
      role: "user",
    };

    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      sendUnauthorized(res, "Token has expired. Please log in again.");
      return;
    }
    if (err instanceof jwt.JsonWebTokenError) {
      sendUnauthorized(res, "Invalid token. Please log in again.");
      return;
    }
    // Unexpected error — pass to global error handler
    next(err);
  }
}
