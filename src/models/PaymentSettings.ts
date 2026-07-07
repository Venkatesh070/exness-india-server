import { Schema, model, type InferSchemaType } from "mongoose";

const paymentSettingsSchema = new Schema(
  {
    _id: { type: String, default: "default" },
    qrImage: { type: String, default: "" },
    upiId: { type: String, default: "exness-india@upi" },
    accountName: { type: String, default: "Exness India" },
    updatedAt: { type: Number, default: 0 },
  },
  { _id: false, timestamps: false, versionKey: false },
);

export type PaymentSettingsDoc = InferSchemaType<typeof paymentSettingsSchema> & { _id: string };

export const PaymentSettings = model(
  "PaymentSettings",
  paymentSettingsSchema,
  "payment_settings",
);
