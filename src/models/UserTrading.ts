import { Schema, model, type InferSchemaType } from "mongoose";

const openPositionSchema = new Schema(
  {
    id: { type: String, required: true },
    symbol: { type: String, required: true },
    side: { type: String, enum: ["buy", "sell"], required: true },
    qty: { type: Number, required: true },
    type: { type: String, default: "market" },
    price: { type: Number, required: true },
    pnl: { type: Number, default: 0 },
    openedAt: { type: Number, required: true },
    sl: { type: Number },
    tp: { type: Number },
  },
  { _id: false },
);

const closedTradeSchema = new Schema(
  {
    id: { type: String, required: true },
    symbol: { type: String, required: true },
    side: { type: String, enum: ["buy", "sell"], required: true },
    qty: { type: Number, required: true },
    openPrice: { type: Number, required: true },
    closePrice: { type: Number, required: true },
    pnl: { type: Number, required: true },
    openedAt: { type: Number, required: true },
    closedAt: { type: Number, required: true },
  },
  { _id: false },
);

const userTradingSchema = new Schema(
  {
    userId: { type: String, required: true, unique: true, index: true },
    open: { type: [openPositionSchema], default: [] },
    closed: { type: [closedTradeSchema], default: [] },
  },
  { timestamps: true, versionKey: false },
);

export type UserTradingDoc = InferSchemaType<typeof userTradingSchema> & {
  _id: string;
  createdAt: Date;
  updatedAt: Date;
};

export const UserTrading = model("UserTrading", userTradingSchema, "user_trading");
