import type { Request, Response } from "express";
import type { FirebaseSignInResponse } from "../types/auth.js";
import {
  FirebaseAuthServiceError,
  sendVerificationEmail,
  signInWithPassword,
  signUpWithPassword,
  toAuthTokens,
} from "../services/firebaseAuth.js";
import {
  getOrCreateUserProfile,
  setUserVerified,
  syncUserProfile,
} from "../services/userService.js";

function verificationContinueUrl(email: string): string {
  const base = process.env.FRONTEND_URL ?? "http://localhost:8080";
  return `${base.replace(/\/$/, "")}/verify?email=${encodeURIComponent(email)}`;
}

function isPgUniqueViolation(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code: string }).code === "23505"
  );
}

function handleAuthError(res: Response, err: unknown): void {
  if (err instanceof FirebaseAuthServiceError) {
    res.status(err.status).json({ error: err.message });
    return;
  }
  if (isPgUniqueViolation(err)) {
    res.status(409).json({ error: "An account with that email already exists." });
    return;
  }
  console.error("User auth error:", err);
  res.status(500).json({ error: "Registration failed." });
}

async function sendVerificationOrWarn(email: string, idToken: string): Promise<void> {
  await sendVerificationEmail(idToken, verificationContinueUrl(email));
}

export async function register(req: Request, res: Response): Promise<void> {
  const { email, password, name, country } = req.body as {
    email?: string;
    password?: string;
    name?: string;
    country?: string;
  };

  if (!email || !password || !name?.trim()) {
    res.status(400).json({ error: "email, password, and name are required." });
    return;
  }

  try {
    let auth: FirebaseSignInResponse;
    let created = true;

    try {
      auth = await signUpWithPassword(email, password);
    } catch (err) {
      if (err instanceof FirebaseAuthServiceError && err.status === 409) {
        auth = await signInWithPassword(email, password);
        created = false;
      } else {
        throw err;
      }
    }

    const user = await syncUserProfile(auth.localId, {
      email: auth.email,
      name: name.trim(),
      country,
    });

    res.status(created ? 201 : 200).json({
      user,
      tokens: toAuthTokens(auth),
      message: created ? "Account created." : "Signed in.",
    });
  } catch (err) {
    handleAuthError(res, err);
  }
}

export async function resendVerification(req: Request, res: Response): Promise<void> {
  if (!req.auth?.email) {
    res.status(401).json({ error: "Authentication required." });
    return;
  }

  const header = req.headers.authorization;
  const idToken = header?.startsWith("Bearer ") ? header.slice(7) : "";

  if (!idToken) {
    res.status(401).json({ error: "Missing token." });
    return;
  }

  try {
    await sendVerificationOrWarn(req.auth.email, idToken);
    res.json({ message: "Verification email sent." });
  } catch (err) {
    console.error("Verification email error:", err);
    handleAuthError(res, err);
  }
}

export async function sync(req: Request, res: Response): Promise<void> {
  if (!req.auth?.email) {
    res.status(401).json({ error: "Authentication required." });
    return;
  }

  const { name, country } = req.body as { name?: string; country?: string };

  if (!name?.trim()) {
    res.status(400).json({ error: "name is required." });
    return;
  }

  try {
    const user = await syncUserProfile(req.auth.uid, {
      email: req.auth.email,
      name: name.trim(),
      country,
    });
    res.json({ user });
  } catch (err) {
    console.error("User sync error:", err);
    res.status(500).json({ error: "Failed to save profile." });
  }
}

export async function verifyEmail(req: Request, res: Response): Promise<void> {
  if (!req.auth) {
    res.status(401).json({ error: "Authentication required." });
    return;
  }

  if (!req.auth.emailVerified) {
    res.status(400).json({
      error: "Email is not verified yet. Check your inbox and click the verification link.",
    });
    return;
  }

  try {
    const user = await setUserVerified(req.auth.uid, true);
    if (!user) {
      res.status(404).json({ error: "User profile not found." });
      return;
    }
    res.json({ user });
  } catch (err) {
    console.error("User verify error:", err);
    res.status(500).json({ error: "Failed to update verification status." });
  }
}

export async function me(req: Request, res: Response): Promise<void> {
  if (!req.auth?.email) {
    res.status(401).json({ error: "Authentication required." });
    return;
  }

  try {
    const user = await getOrCreateUserProfile(req.auth.uid, {
      email: req.auth.email,
      name: req.auth.email.split("@")[0],
    });

    if (req.auth.emailVerified && !user.verified) {
      const updated = await setUserVerified(req.auth.uid, true);
      res.json({ user: updated ?? user });
      return;
    }

    res.json({ user });
  } catch (err) {
    console.error("User me error:", err);
    res.status(500).json({ error: "Failed to fetch profile." });
  }
}