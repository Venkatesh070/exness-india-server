import type { NextFunction, Request, Response } from "express";
import { isAdmin } from "../services/adminService.js";
import { verifyFirebaseToken } from "../services/tokenVerifier.js";
import type { DecodedToken } from "../types/auth.js";

declare global {
  namespace Express {
    interface Request {
      auth?: DecodedToken;
    }
  }
}

export async function verifyToken(req: Request, res: Response, next: NextFunction): Promise<void> {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing or invalid Authorization header." });
    return;
  }

  const token = header.slice(7);

  try {
    const decoded = await verifyFirebaseToken(token);
    req.auth = {
      uid: decoded.uid,
      email: decoded.email,
      role: decoded.role,
      emailVerified: decoded.emailVerified,
    };
    next();
  } catch (err) {
    console.error("Token verification failed:", err);
    const detail = err instanceof Error ? err.message : "Invalid or expired token.";
    const message =
      process.env.NODE_ENV === "development" ? detail : "Invalid or expired token.";
    res.status(401).json({ error: message });
  }
}

export async function requireAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (!req.auth) {
    res.status(401).json({ error: "Authentication required." });
    return;
  }

  try {
    const admin = await isAdmin(req.auth.uid);
    if (!admin) {
      res.status(403).json({ error: "Admin access required." });
      return;
    }
    next();
  } catch (err) {
    console.error("Admin check failed:", err);
    res.status(500).json({ error: "Failed to verify admin access." });
  }
}
