import { Schema, model, type InferSchemaType } from "mongoose";

const walletTxnSchema = new Schema(
  {
    id: { type: String, required: true },
    type: { type: String, enum: ["Deposit", "Withdrawal"], required: true },
    method: { type: String, default: "" },
    amount: { type: Number, required: true },
    status: { type: String, enum: ["Completed", "Pending", "Rejected"], default: "Completed" },
    date: { type: String, required: true },
    createdAt: { type: Number },
    referenceId: { type: String },
    depositRequestId: { type: String },
    accountNumber: { type: String },
    ifsc: { type: String },
  },
  { _id: false },
);

const userWalletSchema = new Schema(
  {
    userId: { type: String, required: true, unique: true, index: true },
    balance: { type: Number, default: 0 },
    transactions: { type: [walletTxnSchema], default: [] },
  },
  { timestamps: true, versionKey: false },
);

export type UserWalletDoc = InferSchemaType<typeof userWalletSchema> & {
  _id: string;
  createdAt: Date;
  updatedAt: Date;
};

export const UserWallet = model("UserWallet", userWalletSchema, "user_wallets");
