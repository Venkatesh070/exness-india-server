import { randomUUID } from "node:crypto";
import { UserWallet } from "../models/UserWallet.js";
import { PaymentSettings } from "../models/PaymentSettings.js";
import { DepositRequest } from "../models/DepositRequest.js";
import { WithdrawalRequest } from "../models/WithdrawalRequest.js";
import { AppUser } from "../models/AppUser.js";

const DEFAULT_QR_PLACEHOLDER =
  "data:image/svg+xml," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240" viewBox="0 0 240 240">
      <rect fill="#ffffff" width="240" height="240"/>
      <rect x="20" y="20" width="60" height="60" fill="#0F1A15"/>
      <rect x="30" y="30" width="40" height="40" fill="#ffffff"/>
      <rect x="40" y="40" width="20" height="20" fill="#0F1A15"/>
      <rect x="160" y="20" width="60" height="60" fill="#0F1A15"/>
      <rect x="170" y="30" width="40" height="40" fill="#ffffff"/>
      <rect x="180" y="40" width="20" height="20" fill="#0F1A15"/>
      <rect x="20" y="160" width="60" height="60" fill="#0F1A15"/>
      <rect x="30" y="170" width="40" height="40" fill="#ffffff"/>
      <rect x="40" y="180" width="20" height="20" fill="#0F1A15"/>
      <text x="120" y="235" text-anchor="middle" font-family="sans-serif" font-size="9" fill="#666">Scan to pay · UPI</text>
    </svg>`,
  );

export interface PaymentSettingsView {
  qrImage: string | null;
  upiId: string;
  accountName: string;
  updatedAt: number;
}

export interface DepositRequestView {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  amount: number;
  referenceId: string;
  screenshot: string;
  status: "pending" | "approved" | "rejected";
  createdAt: number;
  reviewedAt?: number;
}

function formatTxnDate(ms: number): string {
  return new Date(ms).toLocaleDateString("en-IN", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export interface WithdrawalRequestView {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  amount: number;
  accountNumber: string;
  ifsc: string;
  status: "pending" | "approved" | "rejected";
  createdAt: number;
  reviewedAt?: number;
}

type WithdrawalRequestDocLike = {
  _id: string;
  userId: string;
  userEmail: string;
  userName: string;
  amount: number;
  accountNumber: string;
  ifsc: string;
  status: string;
  createdAt: number;
  reviewedAt?: number | null;
};

function toWithdrawalView(doc: WithdrawalRequestDocLike): WithdrawalRequestView {
  return {
    id: doc._id,
    userId: doc.userId,
    userEmail: doc.userEmail,
    userName: doc.userName,
    amount: doc.amount,
    accountNumber: doc.accountNumber,
    ifsc: doc.ifsc,
    status: doc.status as WithdrawalRequestView["status"],
    createdAt: doc.createdAt,
    reviewedAt: doc.reviewedAt ?? undefined,
  };
}

type DepositRequestDocLike = {
  _id: string;
  userId: string;
  userEmail: string;
  userName: string;
  amount: number;
  referenceId: string;
  screenshot: string;
  status: string;
  createdAt: number;
  reviewedAt?: number | null;
};

function toDepositView(doc: DepositRequestDocLike): DepositRequestView {
  return {
    id: doc._id,
    userId: doc.userId,
    userEmail: doc.userEmail,
    userName: doc.userName,
    amount: doc.amount,
    referenceId: doc.referenceId,
    screenshot: doc.screenshot,
    status: doc.status as DepositRequestView["status"],
    createdAt: doc.createdAt,
    reviewedAt: doc.reviewedAt ?? undefined,
  };
}

export async function getOrCreateWallet(userId: string) {
  let wallet = await UserWallet.findOne({ userId });
  if (!wallet) {
    wallet = await UserWallet.create({ userId, balance: 0, transactions: [] });
  }
  return wallet;
}

export async function getPaymentSettings(): Promise<PaymentSettingsView> {
  let doc = await PaymentSettings.findById("default");
  if (!doc) {
    doc = await PaymentSettings.create({
      _id: "default",
      qrImage: DEFAULT_QR_PLACEHOLDER,
      upiId: "exness-india@upi",
      accountName: "Exness India",
      updatedAt: 0,
    });
  }

  return {
    qrImage: doc.qrImage || DEFAULT_QR_PLACEHOLDER,
    upiId: doc.upiId,
    accountName: doc.accountName,
    updatedAt: doc.updatedAt,
  };
}

export async function updatePaymentSettings(patch: {
  qrImage?: string;
  upiId?: string;
  accountName?: string;
}): Promise<PaymentSettingsView> {
  const updatedAt = Date.now();
  const doc = await PaymentSettings.findByIdAndUpdate(
    "default",
    {
      $set: {
        ...(patch.qrImage !== undefined ? { qrImage: patch.qrImage } : {}),
        ...(patch.upiId !== undefined ? { upiId: patch.upiId.trim() } : {}),
        ...(patch.accountName !== undefined ? { accountName: patch.accountName.trim() } : {}),
        updatedAt,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  return {
    qrImage: doc.qrImage || DEFAULT_QR_PLACEHOLDER,
    upiId: doc.upiId,
    accountName: doc.accountName,
    updatedAt: doc.updatedAt,
  };
}

export async function submitDepositRequest(input: {
  userId: string;
  userEmail: string;
  userName: string;
  amount: number;
  referenceId: string;
  screenshot: string;
}): Promise<DepositRequestView> {
  const createdAt = Date.now();
  const requestId = randomUUID();

  const doc = await DepositRequest.create({
    _id: requestId,
    userId: input.userId,
    userEmail: input.userEmail.toLowerCase().trim(),
    userName: input.userName,
    amount: input.amount,
    referenceId: input.referenceId.trim(),
    screenshot: input.screenshot,
    status: "pending",
    createdAt,
  });

  const wallet = await getOrCreateWallet(input.userId);
  wallet.transactions.unshift({
    id: randomUUID(),
    type: "Deposit",
    method: "UPI · QR",
    amount: input.amount,
    status: "Pending",
    date: formatTxnDate(createdAt),
    createdAt,
    referenceId: input.referenceId.trim(),
    depositRequestId: requestId,
  });
  await wallet.save();

  return toDepositView(doc.toObject());
}

export async function listDepositRequests(status?: string): Promise<DepositRequestView[]> {
  const filter =
    status && status !== "all"
      ? { status: status as DepositRequestView["status"] }
      : {};

  const docs = await DepositRequest.find(filter).sort({ createdAt: -1 }).lean();
  return docs.map((doc) => toDepositView(doc as DepositRequestDocLike));
}

export async function approveDepositRequest(
  requestId: string,
  adminUid: string,
): Promise<DepositRequestView> {
  const doc = await DepositRequest.findById(requestId);
  if (!doc) throw new Error("Deposit request not found.");
  if (doc.status !== "pending") throw new Error("Deposit request already reviewed.");

  const reviewedAt = Date.now();
  doc.status = "approved";
  doc.reviewedAt = reviewedAt;
  doc.reviewedBy = adminUid;
  await doc.save();

  const wallet = await getOrCreateWallet(doc.userId);
  let credited = false;

  for (const txn of wallet.transactions) {
    if (txn.depositRequestId === requestId) {
      credited = true;
      txn.status = "Completed";
    }
  }

  if (!credited) {
    wallet.transactions.unshift({
      id: randomUUID(),
      type: "Deposit",
      method: "UPI · QR",
      amount: doc.amount,
      status: "Completed",
      date: formatTxnDate(reviewedAt),
      createdAt: reviewedAt,
      referenceId: doc.referenceId,
      depositRequestId: requestId,
    });
  }

  wallet.balance += doc.amount;
  await wallet.save();

  return toDepositView(doc.toObject());
}

export async function rejectDepositRequest(
  requestId: string,
  adminUid: string,
): Promise<DepositRequestView> {
  const doc = await DepositRequest.findById(requestId);
  if (!doc) throw new Error("Deposit request not found.");
  if (doc.status !== "pending") throw new Error("Deposit request already reviewed.");

  const reviewedAt = Date.now();
  doc.status = "rejected";
  doc.reviewedAt = reviewedAt;
  doc.reviewedBy = adminUid;
  await doc.save();

  const wallet = await UserWallet.findOne({ userId: doc.userId });
  if (wallet) {
    for (const txn of wallet.transactions) {
      if (txn.depositRequestId === requestId) {
        txn.status = "Rejected";
      }
    }
    await wallet.save();
  }

  return toDepositView(doc.toObject());
}

export async function getUserById(userId: string) {
  return AppUser.findById(userId).lean();
}

export const MIN_TRADING_BALANCE = 5000;

export interface WalletTxnView {
  id: string;
  type: "Deposit" | "Withdrawal";
  method: string;
  amount: number;
  status: "Completed" | "Pending" | "Rejected";
  date: string;
  createdAt?: number;
  referenceId?: string;
  depositRequestId?: string;
  accountNumber?: string;
  ifsc?: string;
}

export interface UserWalletView {
  balance: number;
  transactions: WalletTxnView[];
  isFunded: boolean;
  minTradingBalance: number;
}

function toTxnView(txn: {
  id: string;
  type: string;
  method?: string;
  amount: number;
  status?: string;
  date: string;
  createdAt?: number | null;
  referenceId?: string | null;
  depositRequestId?: string | null;
  accountNumber?: string | null;
  ifsc?: string | null;
}): WalletTxnView {
  return {
    id: txn.id,
    type: txn.type as WalletTxnView["type"],
    method: txn.method ?? "",
    amount: txn.amount,
    status: (txn.status ?? "Completed") as WalletTxnView["status"],
    date: txn.date,
    createdAt: txn.createdAt ?? undefined,
    referenceId: txn.referenceId ?? undefined,
    depositRequestId: txn.depositRequestId ?? undefined,
    accountNumber: txn.accountNumber ?? undefined,
    ifsc: txn.ifsc ?? undefined,
  };
}

export async function getUserWallet(userId: string): Promise<UserWalletView> {
  const wallet = await getOrCreateWallet(userId);
  const balance = wallet.balance ?? 0;

  return {
    balance,
    transactions: (wallet.transactions ?? []).map((txn) => toTxnView(txn)),
    isFunded: balance >= MIN_TRADING_BALANCE,
    minTradingBalance: MIN_TRADING_BALANCE,
  };
}

export async function submitWithdrawal(input: {
  userId: string;
  userEmail: string;
  userName: string;
  amount: number;
  accountNumber: string;
  ifsc: string;
}): Promise<{ wallet: UserWalletView; request: WithdrawalRequestView }> {
  const wallet = await getOrCreateWallet(input.userId);

  if (input.amount <= 0) {
    throw new Error("Invalid withdrawal amount.");
  }
  if (input.amount > (wallet.balance ?? 0)) {
    throw new Error("Insufficient balance.");
  }

  const accountNumber = input.accountNumber.trim();
  const ifsc = input.ifsc.trim().toUpperCase();
  if (!accountNumber || accountNumber.length < 6) {
    throw new Error("Enter a valid bank account number.");
  }
  if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc)) {
    throw new Error("Enter a valid IFSC code.");
  }

  const createdAt = Date.now();
  const transactionId = randomUUID();
  const requestId = randomUUID();

  wallet.balance = (wallet.balance ?? 0) - input.amount;
  wallet.transactions.unshift({
    id: transactionId,
    type: "Withdrawal",
    method: `IMPS · ${ifsc}`,
    amount: -input.amount,
    status: "Pending",
    date: formatTxnDate(createdAt),
    createdAt,
    accountNumber,
    ifsc,
  });
  await wallet.save();

  const doc = await WithdrawalRequest.create({
    _id: requestId,
    userId: input.userId,
    userEmail: input.userEmail.toLowerCase().trim(),
    userName: input.userName,
    amount: input.amount,
    accountNumber,
    ifsc,
    transactionId,
    status: "pending",
    createdAt,
  });

  const walletView = await getUserWallet(input.userId);
  return { wallet: walletView, request: toWithdrawalView(doc.toObject()) };
}

export async function listWithdrawalRequests(status?: string): Promise<WithdrawalRequestView[]> {
  const filter =
    status && status !== "all"
      ? { status: status as WithdrawalRequestView["status"] }
      : {};

  const docs = await WithdrawalRequest.find(filter).sort({ createdAt: -1 }).lean();
  return docs.map((doc) => toWithdrawalView(doc as WithdrawalRequestDocLike));
}

export async function approveWithdrawalRequest(
  requestId: string,
  adminUid: string,
): Promise<WithdrawalRequestView> {
  const doc = await WithdrawalRequest.findById(requestId);
  if (!doc) throw new Error("Withdrawal request not found.");
  if (doc.status !== "pending") throw new Error("Withdrawal request already reviewed.");

  const reviewedAt = Date.now();
  doc.status = "approved";
  doc.reviewedAt = reviewedAt;
  doc.reviewedBy = adminUid;
  await doc.save();

  const wallet = await UserWallet.findOne({ userId: doc.userId });
  if (wallet) {
    for (const txn of wallet.transactions) {
      if (txn.id === doc.transactionId) {
        txn.status = "Completed";
      }
    }
    await wallet.save();
  }

  return toWithdrawalView(doc.toObject());
}

export async function rejectWithdrawalRequest(
  requestId: string,
  adminUid: string,
): Promise<WithdrawalRequestView> {
  const doc = await WithdrawalRequest.findById(requestId);
  if (!doc) throw new Error("Withdrawal request not found.");
  if (doc.status !== "pending") throw new Error("Withdrawal request already reviewed.");

  const reviewedAt = Date.now();
  doc.status = "rejected";
  doc.reviewedAt = reviewedAt;
  doc.reviewedBy = adminUid;
  await doc.save();

  const wallet = await UserWallet.findOne({ userId: doc.userId });
  if (wallet) {
    for (const txn of wallet.transactions) {
      if (txn.id === doc.transactionId) {
        txn.status = "Rejected";
      }
    }
    wallet.balance = (wallet.balance ?? 0) + doc.amount;
    await wallet.save();
  }

  return toWithdrawalView(doc.toObject());
}

export async function listUserDepositRequests(userId: string): Promise<DepositRequestView[]> {
  const docs = await DepositRequest.find({ userId }).sort({ createdAt: -1 }).lean();
  return docs.map((doc) => toDepositView(doc as DepositRequestDocLike));
}
