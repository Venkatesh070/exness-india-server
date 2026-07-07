import type { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../utils/jwt.js";
import { AppError } from "../utils/errors.js";
import { prisma } from "../config/database.js";

export interface AuthRequest extends Request {
  user?: { id: string; email: string; role: "user" | "admin" };
}

export async function authenticate(req: AuthRequest, _res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      throw new AppError(401, "Authentication required");
    }

    const token = header.slice(7);
    const payload = verifyAccessToken(token);

    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || user.status === "SUSPENDED") {
      throw new AppError(401, "Invalid or suspended account");
    }

    req.user = { id: user.id, email: user.email, role: payload.role };
    next();
  } catch (err) {
    if (err instanceof AppError) return next(err);
    next(new AppError(401, "Invalid or expired token"));
  }
}

export function requireRole(...roles: Array<"user" | "admin">) {
  return (req: AuthRequest, _res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new AppError(403, "Insufficient permissions"));
    }
    next();
  };
}
