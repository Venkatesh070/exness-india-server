import { getFirebaseAuth } from "../config/firebase.js";
import { otpRepo } from "../repositories/index.js";
import { sendOtpEmail } from "./email.service.js";
import {
  FirebaseAuthServiceError,
  signInWithPassword,
  signUpWithPassword,
  toAuthTokens,
} from "./firebaseAuth.js";
import {
  createUserProfile,
  getOrCreateUserProfile,
  getUserByEmail,
  setUserVerified,
} from "./userService.js";
import { encrypt, decrypt, generateOtp } from "../utils/crypto.js";
import { hashOtp, verifyOtp as verifyOtpHash } from "../utils/password.js";
import { AppError } from "../utils/errors.js";
import type { AuthTokens, UserProfile } from "../types/auth.js";

const OTP_EXPIRY_MINUTES = 5;
const MAX_OTP_ATTEMPTS = 5;
const RESEND_COOLDOWN_MS = 60_000;

type OtpPurpose = "register" | "login";

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function getResendInSeconds(createdAt: Date): number {
  const elapsed = Date.now() - createdAt.getTime();
  return Math.max(0, Math.ceil((RESEND_COOLDOWN_MS - elapsed) / 1000));
}

async function assertEmailAvailable(email: string): Promise<void> {
  const existing = await getUserByEmail(email);
  if (existing) {
    throw new AppError(409, "An account with that email already exists.");
  }

  try {
    await getFirebaseAuth().getUserByEmail(email);
    throw new AppError(409, "An account with that email already exists.");
  } catch (err: unknown) {
    if (err instanceof AppError) throw err;

    const code =
      typeof err === "object" && err !== null && "code" in err
        ? String((err as { code: string }).code)
        : "";

    if (code === "auth/user-not-found") return;

    console.warn("Skipping Firebase email lookup during registration:", err);
  }
}

async function issueOtp(
  email: string,
  purpose: OtpPurpose,
  password: string,
  extra?: { name?: string; country?: string; userId?: string },
) {
  await otpRepo.invalidateOld(email, purpose);

  const otp = generateOtp();
  const otpHash = await hashOtp(otp);
  const passwordEnc = encrypt(password);
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

  const record = await otpRepo.create({
    email,
    purpose,
    otpHash,
    passwordEnc,
    expiresAt,
    name: extra?.name,
    country: extra?.country,
    userId: extra?.userId,
  });

  const emailResult = await sendOtpEmail(email, otp);

  return {
    message: "Verification code sent to your email.",
    resendInSeconds: RESEND_COOLDOWN_MS / 1000,
    emailSent: emailResult.sent,
    ...(emailResult.provider === "dev-console" && {
      devNote: "OTP logged in server terminal — email is not configured.",
    }),
    createdAt: record.createdAt,
  };
}

async function verifyOtpRecord(email: string, otp: string, purpose: OtpPurpose) {
  const record = await otpRepo.findLatest(email, purpose);
  if (!record) {
    throw new AppError(400, "No verification code found. Please request a new one.");
  }
  if (record.verified) {
    throw new AppError(400, "Verification code already used.");
  }
  if (record.expiresAt < new Date()) {
    throw new AppError(400, "Verification code expired. Please request a new one.");
  }
  if (record.attempts >= MAX_OTP_ATTEMPTS) {
    throw new AppError(429, "Too many attempts. Please request a new code.");
  }

  const valid = await verifyOtpHash(otp, record.otpHash);
  if (!valid) {
    await otpRepo.incrementAttempts(record.id);
    throw new AppError(400, "Invalid verification code.");
  }

  await otpRepo.markVerified(record.id);
  return record;
}

export async function startRegister(input: {
  name: string;
  email: string;
  password: string;
  country?: string;
}) {
  const email = normalizeEmail(input.email);
  const name = input.name.trim();

  if (!name) {
    throw new AppError(400, "Name is required.");
  }
  if (input.password.length < 6) {
    throw new AppError(400, "Password must be at least 6 characters.");
  }

  await assertEmailAvailable(email);
  return issueOtp(email, "register", input.password, {
    name,
    country: input.country ?? "India",
  });
}

export async function verifyRegisterOtp(input: {
  email: string;
  otp: string;
}): Promise<{ user: UserProfile; customToken: string; tokens: AuthTokens }> {
  const email = normalizeEmail(input.email);
  const record = await verifyOtpRecord(email, input.otp, "register");

  const password = decrypt(record.passwordEnc);
  const name = record.name?.trim() || email.split("@")[0] || "User";
  const country = record.country ?? "India";

  let auth;
  try {
    auth = await signUpWithPassword(email, password);
  } catch (err) {
    if (err instanceof FirebaseAuthServiceError && err.status === 409) {
      throw new AppError(409, "An account with that email already exists.");
    }
    throw err;
  }

  await getFirebaseAuth().updateUser(auth.localId, { emailVerified: true, displayName: name });

  let user = await createUserProfile(auth.localId, { email, name, country });
  user = (await setUserVerified(auth.localId, true)) ?? user;

  const customToken = await getFirebaseAuth().createCustomToken(auth.localId);
  const tokens = toAuthTokens(auth);

  return { user, customToken, tokens };
}

export async function resendRegisterOtp(emailInput: string) {
  const email = normalizeEmail(emailInput);
  const record = await otpRepo.findLatest(email, "register");
  if (!record) {
    throw new AppError(400, "No pending registration found. Please sign up again.");
  }

  const wait = getResendInSeconds(record.createdAt);
  if (wait > 0) {
    throw new AppError(429, `Please wait ${wait}s before requesting a new code.`);
  }

  const password = decrypt(record.passwordEnc);
  return issueOtp(email, "register", password, {
    name: record.name ?? undefined,
    country: record.country ?? undefined,
  });
}

export async function getRegisterOtpResend(emailInput: string) {
  const email = normalizeEmail(emailInput);
  const record = await otpRepo.findLatest(email, "register");
  return { resendInSeconds: record ? getResendInSeconds(record.createdAt) : 0 };
}

export async function startLogin(input: { email: string; password: string }) {
  const email = normalizeEmail(input.email);

  let auth;
  try {
    auth = await signInWithPassword(email, input.password);
  } catch (err) {
    if (err instanceof FirebaseAuthServiceError) {
      throw new AppError(err.status, err.message);
    }
    throw err;
  }

  return issueOtp(email, "login", input.password, { userId: auth.localId });
}

export async function verifyLoginOtp(input: {
  email: string;
  otp: string;
}): Promise<{ user: UserProfile; customToken: string; tokens: AuthTokens }> {
  const email = normalizeEmail(input.email);
  const record = await verifyOtpRecord(email, input.otp, "login");

  const password = decrypt(record.passwordEnc);
  const auth = await signInWithPassword(email, password);

  await getFirebaseAuth().updateUser(auth.localId, { emailVerified: true });

  let user = await getOrCreateUserProfile(auth.localId, { email });
  if (!user.verified) {
    user = (await setUserVerified(auth.localId, true)) ?? user;
  }

  const customToken = await getFirebaseAuth().createCustomToken(auth.localId);
  const tokens = toAuthTokens(auth);

  return { user, customToken, tokens };
}

export async function resendLoginOtp(emailInput: string) {
  const email = normalizeEmail(emailInput);
  const record = await otpRepo.findLatest(email, "login");
  if (!record) {
    throw new AppError(400, "No pending sign-in found. Please sign in again.");
  }

  const wait = getResendInSeconds(record.createdAt);
  if (wait > 0) {
    throw new AppError(429, `Please wait ${wait}s before requesting a new code.`);
  }

  const password = decrypt(record.passwordEnc);
  return issueOtp(email, "login", password, { userId: record.userId ?? undefined });
}

export async function getLoginOtpResend(emailInput: string) {
  const email = normalizeEmail(emailInput);
  const record = await otpRepo.findLatest(email, "login");
  return { resendInSeconds: record ? getResendInSeconds(record.createdAt) : 0 };
}
