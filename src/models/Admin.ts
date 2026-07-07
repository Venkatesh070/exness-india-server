import { Schema, model, type InferSchemaType } from "mongoose";

const adminSchema = new Schema(
  {
    _id: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: { type: String, required: true },
    role: { type: String, default: "admin" },
    permissions: { type: [String], default: [] },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false, timestamps: false, versionKey: false },
);

export type AdminDoc = InferSchemaType<typeof adminSchema> & { _id: string };

export const Admin = model("Admin", adminSchema, "admins");
