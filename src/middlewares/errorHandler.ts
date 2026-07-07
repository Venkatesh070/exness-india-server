import type { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { isAppError } from "../utils/errors.js";

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: err.flatten().fieldErrors,
    });
  }

  if (isAppError(err)) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      code: err.code,
    });
  }

  console.error("[Unhandled Error]", err);
  return res.status(500).json({ success: false, message: "Internal server error" });
}
