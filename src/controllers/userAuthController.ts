import type { Request, Response } from "express";
import {
  getOrCreateUserProfile,
  setUserVerified,
  syncUserProfile,
} from "../services/userService.js";
import * as userOtpAuth from "../services/userOtpAuth.service.js";
import { isAppError } from "../utils/errors.js";

function handleError(res: Response, err: unknown, fallback = "Request failed."): void {
  if (isAppError(err)) {
    res.status(err.statusCode).json({ error: err.message });
    return;
  }
  console.error("User auth error:", err);
  res.status(500).json({ error: fallback });
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
    const result = await userOtpAuth.startRegister({
      email,
      password,
      name: name.trim(),
      country,
    });
    res.status(200).json(result);
  } catch (err) {
    handleError(res, err, "Registration failed.");
  }
}

export async function verifyRegisterOtp(req: Request, res: Response): Promise<void> {
  const { email, otp } = req.body as { email?: string; otp?: string };

  if (!email || !otp) {
    res.status(400).json({ error: "email and otp are required." });
    return;
  }

  try {
    const result = await userOtpAuth.verifyRegisterOtp({ email, otp });
    res.status(201).json({
      user: result.user,
      customToken: result.customToken,
      tokens: result.tokens,
      message: "Account created successfully.",
    });
  } catch (err) {
    handleError(res, err, "Verification failed.");
  }
}

export async function resendRegisterOtp(req: Request, res: Response): Promise<void> {
  const { email } = req.body as { email?: string };

  if (!email) {
    res.status(400).json({ error: "email is required." });
    return;
  }

  try {
    const result = await userOtpAuth.resendRegisterOtp(email);
    res.json(result);
  } catch (err) {
    handleError(res, err, "Failed to resend code.");
  }
}

export async function registerOtpResendStatus(req: Request, res: Response): Promise<void> {
  const email = typeof req.query.email === "string" ? req.query.email : "";

  if (!email) {
    res.status(400).json({ error: "email query parameter is required." });
    return;
  }

  try {
    const result = await userOtpAuth.getRegisterOtpResend(email);
    res.json(result);
  } catch (err) {
    handleError(res, err);
  }
}

export async function login(req: Request, res: Response): Promise<void> {
  const { email, password } = req.body as { email?: string; password?: string };

  if (!email || !password) {
    res.status(400).json({ error: "email and password are required." });
    return;
  }

  try {
    const result = await userOtpAuth.startLogin({ email, password });
    res.json(result);
  } catch (err) {
    handleError(res, err, "Sign in failed.");
  }
}

export async function verifyLoginOtp(req: Request, res: Response): Promise<void> {
  const { email, otp } = req.body as { email?: string; otp?: string };

  if (!email || !otp) {
    res.status(400).json({ error: "email and otp are required." });
    return;
  }

  try {
    const result = await userOtpAuth.verifyLoginOtp({ email, otp });
    res.json({
      user: result.user,
      customToken: result.customToken,
      tokens: result.tokens,
      message: "Signed in successfully.",
    });
  } catch (err) {
    handleError(res, err, "Verification failed.");
  }
}

export async function resendLoginOtp(req: Request, res: Response): Promise<void> {
  const { email } = req.body as { email?: string };

  if (!email) {
    res.status(400).json({ error: "email is required." });
    return;
  }

  try {
    const result = await userOtpAuth.resendLoginOtp(email);
    res.json(result);
  } catch (err) {
    handleError(res, err, "Failed to resend code.");
  }
}

export async function loginOtpResendStatus(req: Request, res: Response): Promise<void> {
  const email = typeof req.query.email === "string" ? req.query.email : "";

  if (!email) {
    res.status(400).json({ error: "email query parameter is required." });
    return;
  }

  try {
    const result = await userOtpAuth.getLoginOtpResend(email);
    res.json(result);
  } catch (err) {
    handleError(res, err);
  }
}

export async function resendVerification(req: Request, res: Response): Promise<void> {
  res.status(410).json({
    error: "Email link verification is no longer used. Sign in again to receive an OTP code.",
  });
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
    res.status(400).json({ error: "Email is not verified yet." });
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
