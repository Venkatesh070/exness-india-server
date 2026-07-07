import { prisma } from "../config/database.js";
import type { User, Profile, Kyc, BankAccount } from "@prisma/client";

export const userRepo = {
  findByEmail: (email: string) => prisma.user.findUnique({ where: { email } }),
  findById: (id: string) =>
    prisma.user.findUnique({
      where: { id },
      include: { profile: true, kyc: true, bankAccounts: true },
    }),
  create: (data: {
    email: string;
    passwordHash: string;
    firebaseUid: string | null;
    emailVerified: boolean;
  }) =>
    prisma.user.create({
      data: {
        email: data.email,
        passwordHash: data.passwordHash,
        firebaseUid: data.firebaseUid,
        emailVerified: data.emailVerified,
        status: "ACTIVE",
        profile: { create: {} },
        kyc: { create: {} },
      },
      include: { profile: true, kyc: true },
    }),
};

export const otpRepo = {
  create: (data: {
    email: string;
    otpHash: string;
    passwordEnc: string;
    expiresAt: Date;
  }) => prisma.emailOtp.create({ data }),
  findLatest: (email: string) =>
    prisma.emailOtp.findFirst({
      where: { email, verified: false },
      orderBy: { createdAt: "desc" },
    }),
  markVerified: (id: string) => prisma.emailOtp.update({ where: { id }, data: { verified: true } }),
  incrementAttempts: (id: string) =>
    prisma.emailOtp.update({ where: { id }, data: { attempts: { increment: 1 } } }),
  invalidateOld: (email: string) =>
    prisma.emailOtp.updateMany({ where: { email, verified: false }, data: { verified: true } }),
};

export const refreshTokenRepo = {
  create: (userId: string, token: string, expiresAt: Date) =>
    prisma.refreshToken.create({ data: { userId, token, expiresAt } }),
  findByToken: (token: string) => prisma.refreshToken.findUnique({ where: { token } }),
  deleteByToken: (token: string) => prisma.refreshToken.delete({ where: { token } }),
  deleteAllForUser: (userId: string) => prisma.refreshToken.deleteMany({ where: { userId } }),
};

export const profileRepo = {
  upsert: (userId: string, data: Partial<Profile>) =>
    prisma.profile.upsert({
      where: { userId },
      create: { userId, ...data },
      update: data,
    }),
  findByUserId: (userId: string) => prisma.profile.findUnique({ where: { userId } }),
};

export const kycRepo = {
  upsert: (userId: string, data: Partial<Kyc>) =>
    prisma.kyc.upsert({
      where: { userId },
      create: { userId, ...data },
      update: data,
    }),
  findByUserId: (userId: string) => prisma.kyc.findUnique({ where: { userId } }),
};

export const bankRepo = {
  create: (data: {
    userId: string;
    bankName: string;
    accountHolder: string;
    accountNumberEncrypted: string;
    ifsc: string;
  }) => prisma.bankAccount.create({ data }),
  findByUserId: (userId: string) => prisma.bankAccount.findMany({ where: { userId } }),
};

export function sanitizeUser(user: User & { profile?: Profile | null; kyc?: Kyc | null }) {
  return {
    id: user.id,
    email: user.email,
    emailVerified: user.emailVerified,
    status: user.status,
    createdAt: user.createdAt,
    profile: user.profile,
    kyc: user.kyc ? { status: user.kyc.status, panVerified: user.kyc.panVerified } : null,
  };
}
