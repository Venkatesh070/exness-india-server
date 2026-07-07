import { Schema, model, type InferSchemaType } from "mongoose";

/** Firebase-backed demo user profile (alpha-trade frontend). */
const appUserSchema = new Schema(
  {
    _id: { type: String, required: true },
    accountId: { type: String, unique: true, sparse: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: { type: String, required: true },
    verified: { type: Boolean, default: false },
    createdAt: { type: Number, required: true },
    country: { type: String, default: "India" },
    twoFA: { type: Boolean, default: false },
  },
  { _id: false, timestamps: false, versionKey: false },
);

export type AppUserDoc = InferSchemaType<typeof appUserSchema> & { _id: string };

export const AppUser = model("AppUser", appUserSchema, "users");
