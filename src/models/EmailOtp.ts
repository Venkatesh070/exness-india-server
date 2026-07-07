import { Schema, model, type InferSchemaType } from "mongoose";
import { randomUUID } from "node:crypto";

const emailOtpSchema = new Schema(
  {
    _id: { type: String, default: () => randomUUID() },
    email: { type: String, required: true, lowercase: true, trim: true },
    purpose: { type: String, enum: ["register", "login"], default: "register" },
    otpHash: { type: String, required: true },
    passwordEnc: { type: String, required: true },
    name: { type: String },
    country: { type: String, default: "India" },
    expiresAt: { type: Date, required: true },
    attempts: { type: Number, default: 0 },
    verified: { type: Boolean, default: false },
    userId: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false }, versionKey: false },
);

emailOtpSchema.index({ email: 1, purpose: 1, verified: 1, createdAt: -1 });

export type EmailOtpDoc = InferSchemaType<typeof emailOtpSchema> & {
  _id: string;
  createdAt: Date;
};

export const EmailOtp = model("EmailOtp", emailOtpSchema, "email_otps");
