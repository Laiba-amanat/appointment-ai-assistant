import type { Request, Response, NextFunction } from "express";
import { type ZodTypeAny, type infer as ZodInfer } from "zod";
import { sendBadRequest } from "../utils/response";

/**
 * Zod request body validation middleware factory.
 *
 * Usage:
 *   router.post("/register", validate(registerSchema), authController.register);
 *
 * On success  → req.body is replaced with the parsed + typed data.
 * On failure  → responds 400 with field-level error details.
 */
export function validate<T extends ZodTypeAny>(schema: T) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      const errors = result.error.errors.map((e) => ({
        field: e.path.join(".") || "body",
        message: e.message,
      }));
      sendBadRequest(res, "Validation failed", errors);
      return;
    }

    // Replace body with the parsed, typed data (strips unknown fields)
    req.body = result.data as ZodInfer<T>;
    next();
  };
}
