import { z } from "zod";

export const sendOtpSchema = z.object({
  email: z.string().email("Invalid email address").toLowerCase().trim(),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Must contain uppercase")
    .regex(/[a-z]/, "Must contain lowercase")
    .regex(/[0-9]/, "Must contain a number"),
});

export const verifyOtpSchema = z.object({
  email: z.string().email().toLowerCase().trim(),
  otp: z.string().length(6, "OTP must be 6 digits").regex(/^\d+$/, "OTP must be numeric"),
});

export const loginSchema = z.object({
  email: z.string().email().toLowerCase().trim(),
  password: z.string().min(1, "Password is required"),
  rememberMe: z.boolean().optional(),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

export const profileSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  dob: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional(),
  gender: z.enum(["male", "female", "other"]).optional(),
  occupation: z.string().max(100).optional(),
  income: z.string().max(50).optional(),
  address: z.string().max(500).optional(),
});

export const kycPanSchema = z.object({
  pan: z.string().regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, "Invalid PAN format"),
});

export const kycAadhaarSchema = z.object({
  aadhaarReference: z.string().min(4).max(20),
});

export const bankAccountSchema = z.object({
  bankName: z.string().min(2).max(100),
  accountHolder: z.string().min(2).max(100),
  accountNumber: z.string().regex(/^\d{9,18}$/, "Invalid account number"),
  confirmAccountNumber: z.string(),
  ifsc: z.string().regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, "Invalid IFSC code"),
}).refine((d) => d.accountNumber === d.confirmAccountNumber, {
  message: "Account numbers do not match",
  path: ["confirmAccountNumber"],
});
