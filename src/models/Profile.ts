import { Schema, model, type InferSchemaType } from "mongoose";
import { randomUUID } from "node:crypto";

const profileSchema = new Schema(
  {
    _id: { type: String, default: () => randomUUID() },
    userId: { type: String, required: true, unique: true, index: true },
    firstName: { type: String },
    lastName: { type: String },
    dob: { type: Date },
    gender: { type: String },
    occupation: { type: String },
    income: { type: String },
    address: { type: String },
  },
  { timestamps: true, versionKey: false },
);

export type ProfileDoc = InferSchemaType<typeof profileSchema> & {
  _id: string;
  createdAt: Date;
  updatedAt: Date;
};

export const Profile = model("Profile", profileSchema, "profiles");
