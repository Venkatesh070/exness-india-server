import { Schema, model, type InferSchemaType } from "mongoose";
import { randomUUID } from "node:crypto";

const withdrawalRequestSchema = new Schema(
  {
    _id: { type: String, default: () => randomUUID() },
    userId: { type: String, required: true, index: true },
    userEmail: { type: String, required: true, lowercase: true, trim: true },
    userName: { type: String, required: true },
    amount: { type: Number, required: true, min: 1 },
    accountNumber: { type: String, required: true },
    ifsc: { type: String, required: true },
    transactionId: { type: String, required: true },
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

export type WithdrawalRequestDoc = InferSchemaType<typeof withdrawalRequestSchema> & { _id: string };

export const WithdrawalRequest = model(
  "WithdrawalRequest",
  withdrawalRequestSchema,
  "withdrawal_requests",
);
