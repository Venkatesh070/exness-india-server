import { Schema, model, type InferSchemaType } from "mongoose";
import { randomUUID } from "node:crypto";

const refreshTokenSchema = new Schema(
  {
    _id: { type: String, default: () => randomUUID() },
    userId: { type: String, required: true, index: true },
    token: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false }, versionKey: false },
);

export type RefreshTokenDoc = InferSchemaType<typeof refreshTokenSchema> & {
  _id: string;
  createdAt: Date;
};

export const RefreshToken = model("RefreshToken", refreshTokenSchema, "refresh_tokens");
