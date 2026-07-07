import { refreshTokenRepo } from "../repositories/index.js";
import {
  getRefreshExpiryDate,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from "../utils/jwt.js";
import { AppError } from "../utils/errors.js";
import { getUserProfile } from "./userService.js";

export interface UserApiTokens {
  accessToken: string;
  refreshToken: string;
}

export async function issueUserTokens(userId: string, email: string): Promise<UserApiTokens> {
  const payload = { sub: userId, email, role: "user" as const };
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);
  await refreshTokenRepo.create(userId, refreshToken, getRefreshExpiryDate());
  return { accessToken, refreshToken };
}

export async function refreshUserAccessToken(refreshToken: string): Promise<{ accessToken: string }> {
  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw new AppError(401, "Invalid refresh token.");
  }

  if (payload.role !== "user") {
    throw new AppError(401, "Invalid refresh token.");
  }

  const stored = await refreshTokenRepo.findByToken(refreshToken);
  if (!stored || stored.expiresAt < new Date()) {
    throw new AppError(401, "Refresh token expired. Please sign in again.");
  }

  const user = await getUserProfile(payload.sub);
  if (!user) {
    throw new AppError(401, "User not found.");
  }

  const accessToken = signAccessToken({
    sub: payload.sub,
    email: payload.email,
    role: "user",
  });

  return { accessToken };
}

export async function revokeUserRefreshToken(refreshToken: string): Promise<void> {
  try {
    await refreshTokenRepo.deleteByToken(refreshToken);
  } catch {
    // token may already be deleted
  }
}
