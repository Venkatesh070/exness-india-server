import { getFirebaseAuth } from "../firebase/admin.js";
import { env } from "../config/env.js";
import { sendOtpEmail } from "./email.service.js";
import { uploadToS3 } from "./upload.service.js";
import {
  userRepo,
  otpRepo,
  refreshTokenRepo,
  profileRepo,
  kycRepo,
  bankRepo,
  sanitizeUser,
} from "../repositories/index.js";
import { hashPassword, verifyPassword, hashOtp, verifyOtp as verifyOtpHash } from "../utils/password.js";
import { encrypt, decrypt, generateOtp } from "../utils/crypto.js";
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  getRefreshExpiryDate,
} from "../utils/jwt.js";
import { AppError } from "../utils/errors.js";
import type { z } from "zod";
import type {
  sendOtpSchema,
  verifyOtpSchema,
  loginSchema,
  profileSchema,
  kycPanSchema,
  kycAadhaarSchema,
  bankAccountSchema,
} from "../validators/auth.validator.js";

const OTP_EXPIRY_MINUTES = 5;
const MAX_OTP_ATTEMPTS = 5;

async function resolveFirebaseUid(email: string, password: string): Promise<string | null> {
  const hasFirebaseAdmin = Boolean(env.FIREBASE_CLIENT_EMAIL && env.FIREBASE_PRIVATE_KEY);
  if (!hasFirebaseAdmin && env.NODE_ENV === "development") {
    console.warn("Firebase Admin not configured — creating local user without firebaseUid");
    return null;
  }

  try {
    const fbUser = await getFirebaseAuth().createUser({
      email,
      password,
      emailVerified: true,
    });
    return fbUser.uid;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Firebase user creation failed";
    throw new AppError(500, msg, "FIREBASE_ERROR");
  }
}

export async function sendOtp(input: z.infer<typeof sendOtpSchema>) {
  const existing = await userRepo.findByEmail(input.email);
  if (existing?.emailVerified) {
    throw new AppError(409, "Email already registered");
  }

  await otpRepo.invalidateOld(input.email, "register");

  const otp = generateOtp();
  const otpHash = await hashOtp(otp);
  const passwordEnc = encrypt(input.password);
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

  await otpRepo.create({
    email: input.email,
    purpose: "register",
    otpHash,
    passwordEnc,
    expiresAt,
  });
  const emailResult = await sendOtpEmail(input.email, otp);

  return {
    success: true,
    emailSent: emailResult.sent,
    ...(emailResult.provider === "dev-console" && {
      message: "OTP generated. Check the server terminal — email is not configured yet.",
    }),
  };
}

export async function verifyOtp(input: z.infer<typeof verifyOtpSchema>) {
  const record = await otpRepo.findLatest(input.email, "register");
  if (!record) throw new AppError(400, "No OTP found. Please request a new one.");
  if (record.verified) throw new AppError(400, "OTP already used");
  if (record.expiresAt < new Date()) throw new AppError(400, "OTP expired");
  if (record.attempts >= MAX_OTP_ATTEMPTS) {
    throw new AppError(429, "Too many attempts. Request a new OTP.");
  }

  const valid = await verifyOtpHash(input.otp, record.otpHash);
  if (!valid) {
    await otpRepo.incrementAttempts(record.id);
    throw new AppError(400, "Invalid OTP");
  }

  const plainPassword = decrypt(record.passwordEnc);
  const passwordHash = await hashPassword(plainPassword);

  const firebaseUid = await resolveFirebaseUid(input.email, plainPassword);

  const existing = await userRepo.findByEmail(input.email);

  let user;
  if (existing) {
    user = await userRepo.update(existing.id, {
      passwordHash,
      firebaseUid,
      emailVerified: true,
      status: "ACTIVE",
    });
  } else {
    user = await userRepo.create({
      email: input.email,
      passwordHash,
      firebaseUid,
      emailVerified: true,
    });
  }

  if (!user) throw new AppError(500, "Failed to create user");

  await otpRepo.markVerified(record.id);

  const tokens = await issueTokens(user.id, user.email);
  return { ...tokens, user: sanitizeUser(user) };
}

export async function login(input: z.infer<typeof loginSchema>) {
  const user = await userRepo.findByEmail(input.email);
  if (!user) throw new AppError(401, "Invalid email or password");

  const valid = await verifyPassword(input.password, user.passwordHash);
  if (!valid) throw new AppError(401, "Invalid email or password");
  if (!user.emailVerified) throw new AppError(403, "Email not verified");
  if (user.status === "SUSPENDED") throw new AppError(403, "Account suspended");

  const full = await userRepo.findById(user.id);
  const tokens = await issueTokens(user.id, user.email);
  return { ...tokens, user: sanitizeUser(full!) };
}

export async function refreshAccessToken(refreshToken: string) {
  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw new AppError(401, "Invalid refresh token");
  }

  const stored = await refreshTokenRepo.findByToken(refreshToken);
  if (!stored || stored.expiresAt < new Date()) {
    throw new AppError(401, "Refresh token expired");
  }

  const accessToken = signAccessToken({ sub: payload.sub, email: payload.email, role: "user" });
  return { accessToken };
}

export async function logout(refreshToken: string) {
  try {
    await refreshTokenRepo.deleteByToken(refreshToken);
  } catch {
    // token may already be deleted
  }
  return { success: true };
}

async function issueTokens(userId: string, email: string) {
  const payload = { sub: userId, email, role: "user" as const };
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);
  await refreshTokenRepo.create(userId, refreshToken, getRefreshExpiryDate());
  return { accessToken, refreshToken };
}

export async function getProfile(userId: string) {
  const profile = await profileRepo.findByUserId(userId);
  if (!profile) throw new AppError(404, "Profile not found");
  return profile;
}

export async function updateProfile(userId: string, input: z.infer<typeof profileSchema>) {
  const data = {
    ...input,
    dob: input.dob ? new Date(input.dob) : undefined,
  };
  return profileRepo.upsert(userId, data);
}

export async function updateKycPan(userId: string, input: z.infer<typeof kycPanSchema>) {
  return kycRepo.upsert(userId, {
    pan: input.pan,
    status: "IN_PROGRESS",
  });
}

export async function updateKycAadhaar(userId: string, input: z.infer<typeof kycAadhaarSchema>) {
  return kycRepo.upsert(userId, {
    aadhaarReference: input.aadhaarReference,
    status: "IN_PROGRESS",
  });
}

export async function uploadKycSelfie(userId: string, buffer: Buffer, mimeType: string) {
  const url = await uploadToS3(buffer, mimeType, "kyc/selfies");
  return kycRepo.upsert(userId, { selfieUrl: url, status: "SUBMITTED" });
}

export async function getKyc(userId: string) {
  const kyc = await kycRepo.findByUserId(userId);
  if (!kyc) throw new AppError(404, "KYC record not found");
  return kyc;
}

export async function addBankAccount(userId: string, input: z.infer<typeof bankAccountSchema>) {
  const encrypted = encrypt(input.accountNumber);
  return bankRepo.create({
    userId,
    bankName: input.bankName,
    accountHolder: input.accountHolder,
    accountNumberEncrypted: encrypted,
    ifsc: input.ifsc,
  });
}

export async function getBankAccounts(userId: string) {
  const accounts = await bankRepo.findByUserId(userId);
  return accounts.map((a) => ({
    id: a.id,
    bankName: a.bankName,
    accountHolder: a.accountHolder,
    ifsc: a.ifsc,
    verified: a.verified,
    accountNumberMasked: "****" + decrypt(a.accountNumberEncrypted).slice(-4),
  }));
}

export async function verifyBankAccount(userId: string, accountId: string) {
  const accounts = await bankRepo.findByUserId(userId);
  const account = accounts.find((a) => a.id === accountId);
  if (!account) throw new AppError(404, "Bank account not found");

  return bankRepo.verifyById(account.id);
}

export async function resendOtp(email: string) {
  const record = await otpRepo.findLatest(email, "register");
  if (!record) throw new AppError(400, "No pending registration found");

  const otp = generateOtp();
  const otpHash = await hashOtp(otp);
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

  await otpRepo.invalidateOld(email, "register");
  await otpRepo.create({
    email,
    purpose: "register",
    otpHash,
    passwordEnc: record.passwordEnc,
    expiresAt,
  });
  const emailResult = await sendOtpEmail(email, otp);
  return {
    success: true,
    emailSent: emailResult.sent,
    ...(emailResult.provider === "dev-console" && {
      message: "OTP generated. Check the server terminal — email is not configured yet.",
    }),
  };
}
