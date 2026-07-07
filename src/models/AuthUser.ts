import { Schema, model, type InferSchemaType } from "mongoose";
import { randomUUID } from "node:crypto";

const authUserSchema = new Schema(
  {
    _id: { type: String, default: () => randomUUID() },
    firebaseUid: { type: String, unique: true, sparse: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    emailVerified: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ["ACTIVE", "SUSPENDED", "PENDING"],
      default: "PENDING",
    },
  },
  { timestamps: true, versionKey: false },
);

export type AuthUserDoc = InferSchemaType<typeof authUserSchema> & {
  _id: string;
  createdAt: Date;
  updatedAt: Date;
};

export const AuthUser = model("AuthUser", authUserSchema, "auth_users");
