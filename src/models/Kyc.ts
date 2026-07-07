import { Schema, model, type InferSchemaType } from "mongoose";
import { randomUUID } from "node:crypto";

const kycSchema = new Schema(
  {
    _id: { type: String, default: () => randomUUID() },
    userId: { type: String, required: true, unique: true, index: true },
    status: {
      type: String,
      enum: ["NOT_STARTED", "IN_PROGRESS", "SUBMITTED", "VERIFIED", "REJECTED"],
      default: "NOT_STARTED",
    },
    pan: { type: String },
    panVerified: { type: Boolean, default: false },
    aadhaarReference: { type: String },
    aadhaarVerified: { type: Boolean, default: false },
    selfieUrl: { type: String },
    addressVerified: { type: Boolean, default: false },
  },
  { timestamps: true, versionKey: false },
);

export type KycDoc = InferSchemaType<typeof kycSchema> & {
  _id: string;
  createdAt: Date;
  updatedAt: Date;
};

export const Kyc = model("Kyc", kycSchema, "kyc_records");
