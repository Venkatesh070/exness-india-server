import { Schema, model, type InferSchemaType } from "mongoose";
import { randomUUID } from "node:crypto";

const bankAccountSchema = new Schema(
  {
    _id: { type: String, default: () => randomUUID() },
    userId: { type: String, required: true, index: true },
    bankName: { type: String, required: true },
    accountHolder: { type: String, required: true },
    accountNumberEncrypted: { type: String, required: true },
    ifsc: { type: String, required: true },
    verified: { type: Boolean, default: false },
  },
  { timestamps: true, versionKey: false },
);

export type BankAccountDoc = InferSchemaType<typeof bankAccountSchema> & {
  _id: string;
  createdAt: Date;
  updatedAt: Date;
};

export const BankAccount = model("BankAccount", bankAccountSchema, "bank_accounts");
