import { AppUser } from "../models/AppUser.js";
import { Kyc } from "../models/Kyc.js";
import { UserWallet } from "../models/UserWallet.js";

export type AdminUserStatus = "Active" | "Pending KYC" | "Suspended";

export interface AdminUserRow {
  id: string;
  userId: string;
  accountId: string | null;
  name: string;
  email: string;
  status: AdminUserStatus;
  balance: number;
  joined: string;
  joinedAt: number;
}

export interface AdminUsersResult {
  users: AdminUserRow[];
  total: number;
  page: number;
  limit: number;
}

function formatJoined(ms: number): string {
  return new Date(ms).toLocaleDateString("en-IN", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function displayId(accountId: string | null | undefined, userId: string): string {
  if (accountId) return `u${accountId}`;
  return `u${userId.slice(-4)}`;
}

function mapStatus(kycStatus: string | undefined, verified: boolean): AdminUserStatus {
  if (kycStatus === "REJECTED") return "Suspended";
  if (kycStatus === "VERIFIED" || verified) return "Active";
  return "Pending KYC";
}

export async function listAdminUsers(query: {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
}): Promise<AdminUsersResult> {
  const page = Math.max(1, query.page ?? 1);
  const limit = Math.min(100, Math.max(1, query.limit ?? 50));
  const search = query.search?.trim().toLowerCase();

  const filter: Record<string, unknown> = {};
  if (search) {
    filter.$or = [
      { email: { $regex: search, $options: "i" } },
      { name: { $regex: search, $options: "i" } },
      { accountId: { $regex: search, $options: "i" } },
    ];
  }

  const [users, total] = await Promise.all([
    AppUser.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    AppUser.countDocuments(filter),
  ]);

  const userIds = users.map((u) => u._id);
  const [kycDocs, walletDocs] = await Promise.all([
    Kyc.find({ userId: { $in: userIds } }).lean(),
    UserWallet.find({ userId: { $in: userIds } }).lean(),
  ]);

  const kycByUser = new Map(kycDocs.map((k) => [k.userId, k.status as string]));
  const balanceByUser = new Map(walletDocs.map((w) => [w.userId, w.balance ?? 0]));

  let rows: AdminUserRow[] = users.map((user) => ({
    id: displayId(user.accountId, user._id),
    userId: user._id,
    accountId: user.accountId ?? null,
    name: user.name,
    email: user.email,
    status: mapStatus(kycByUser.get(user._id), user.verified),
    balance: balanceByUser.get(user._id) ?? 0,
    joined: formatJoined(user.createdAt),
    joinedAt: user.createdAt,
  }));

  if (query.status && query.status !== "all") {
    rows = rows.filter((row) => row.status === query.status);
  }

  return { users: rows, total, page, limit };
}

export async function getAdminUser(userId: string): Promise<AdminUserRow | null> {
  const user = await AppUser.findById(userId).lean();
  if (!user) return null;

  const [kyc, wallet] = await Promise.all([
    Kyc.findOne({ userId }).lean(),
    UserWallet.findOne({ userId }).lean(),
  ]);

  return {
    id: displayId(user.accountId, user._id),
    userId: user._id,
    accountId: user.accountId ?? null,
    name: user.name,
    email: user.email,
    status: mapStatus(kyc?.status, user.verified),
    balance: wallet?.balance ?? 0,
    joined: formatJoined(user.createdAt),
    joinedAt: user.createdAt,
  };
}
