import type { Request, Response } from "express";
import { FirebaseAuthServiceError, signInWithPassword } from "../services/firebaseAuth.js";
import { isAdmin, resolveAdminProfile } from "../services/adminService.js";

function handleAuthError(res: Response, err: unknown): void {
  if (err instanceof FirebaseAuthServiceError) {
    res.status(err.status).json({ error: err.message });
    return;
  }

  if (err instanceof Error && err.message === "NOT_ADMIN") {
    res.status(403).json({ error: "This account does not have admin access." });
    return;
  }

  console.error("Admin auth error:", err);
  res.status(500).json({ error: "Authentication failed." });
}

export async function login(req: Request, res: Response): Promise<void> {
  const { email, password } = req.body as { email?: string; password?: string };

  if (!email || !password) {
    res.status(400).json({ error: "email and password are required." });
    return;
  }

  try {
    const signIn = await signInWithPassword(email, password);

    const admin = await isAdmin(signIn.localId);
    if (!admin) {
      res.status(403).json({ error: "This account does not have admin access." });
      return;
    }

    const adminProfile = await resolveAdminProfile(signIn.localId, signIn.email);

    res.json({
      admin: adminProfile,
      tokens: {
        idToken: signIn.idToken,
        refreshToken: signIn.refreshToken,
        expiresIn: signIn.expiresIn,
      },
    });
  } catch (err) {
    handleAuthError(res, err);
  }
}

export async function me(req: Request, res: Response): Promise<void> {
  if (!req.auth?.email) {
    res.status(401).json({ error: "Authentication required." });
    return;
  }

  try {
    const admin = await resolveAdminProfile(req.auth.uid, req.auth.email);
    res.json({ admin });
  } catch (err) {
    handleAuthError(res, err);
  }
}
