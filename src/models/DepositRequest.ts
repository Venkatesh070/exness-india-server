import { Schema, model, type InferSchemaType } from "mongoose";
import { randomUUID } from "node:crypto";

const depositRequestSchema = new Schema(
  {
    _id: { type: String, default: () => randomUUID() },
    userId: { type: String, required: true, index: true },
    userEmail: { type: String, required: true, lowercase: true, trim: true },
    userName: { type: String, required: true },
    amount: { type: Number, required: true, min: 1 },
    referenceId: { type: String, required: true, trim: true },
    screenshot: { type: String, required: true },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
      index: true,
    },
    createdAt: { type: Number, required: true },
    reviewedAt: { type: Number },
    reviewedBy: { type: String },
  },
  { _id: false, timestamps: false, versionKey: false },
);

export type DepositRequestDoc = InferSchemaType<typeof depositRequestSchema> & { _id: string };

export const DepositRequest = model("DepositRequest", depositRequestSchema, "deposit_requests");
