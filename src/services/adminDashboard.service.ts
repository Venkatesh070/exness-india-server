import { AppUser } from "../models/AppUser.js";
import { UserWallet } from "../models/UserWallet.js";
import { UserTrading } from "../models/UserTrading.js";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function startOfDayMs(date: Date): number {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function dayKey(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

export interface AdminDashboardStats {
  totalUsers: number;
  activeToday: number;
  volume24h: number;
  deposits24h: number;
}

export interface DailyActivePoint {
  date: string;
  count: number;
}

export interface AdminDashboardData {
  stats: AdminDashboardStats;
  dailyActiveUsers: DailyActivePoint[];
}

async function countTotalUsers(): Promise<number> {
  return AppUser.countDocuments();
}

async function countActiveToday(sinceMs: number): Promise<number> {
  const activeIds = new Set<string>();

  const newUsers = await AppUser.find({ createdAt: { $gte: sinceMs } }).select("_id").lean();
  for (const user of newUsers) activeIds.add(user._id);

  const tradingDocs = await UserTrading.find({
    $or: [
      { "closed.closedAt": { $gte: sinceMs } },
      { "open.openedAt": { $gte: sinceMs } },
    ],
  })
    .select("userId")
    .lean();

  for (const doc of tradingDocs) activeIds.add(doc.userId);

  const walletDocs = await UserWallet.find({ "transactions.createdAt": { $gte: sinceMs } })
    .select("userId")
    .lean();

  for (const doc of walletDocs) activeIds.add(doc.userId);

  return activeIds.size;
}

async function sumVolume24h(sinceMs: number): Promise<number> {
  const docs = await UserTrading.find({ "closed.closedAt": { $gte: sinceMs } }).lean();
  let total = 0;

  for (const doc of docs) {
    for (const trade of doc.closed ?? []) {
      if (trade.closedAt >= sinceMs) {
        total += Math.abs(trade.qty * trade.closePrice * 100);
      }
    }
  }

  return Math.round(total);
}

async function sumDeposits24h(sinceMs: number): Promise<number> {
  const docs = await UserWallet.find().lean();
  let total = 0;

  for (const doc of docs) {
    for (const txn of doc.transactions ?? []) {
      if (txn.type !== "Deposit" || txn.status !== "Completed") continue;
      const txnTime = txn.createdAt ?? Date.parse(txn.date);
      if (!Number.isNaN(txnTime) && txnTime >= sinceMs) {
        total += txn.amount;
      }
    }
  }

  return Math.round(total);
}

async function buildDailyActiveUsers(days: number): Promise<DailyActivePoint[]> {
  const today = startOfDayMs(new Date());
  const start = today - (days - 1) * MS_PER_DAY;

  const counts = new Map<string, Set<string>>();
  for (let i = 0; i < days; i++) {
    counts.set(dayKey(start + i * MS_PER_DAY), new Set());
  }

  const users = await AppUser.find({ createdAt: { $gte: start } }).select("_id createdAt").lean();
  for (const user of users) {
    const key = dayKey(startOfDayMs(new Date(user.createdAt)));
    counts.get(key)?.add(user._id);
  }

  const tradingDocs = await UserTrading.find({
    $or: [
      { "closed.closedAt": { $gte: start } },
      { "open.openedAt": { $gte: start } },
    ],
  }).lean();

  for (const doc of tradingDocs) {
    for (const trade of doc.closed ?? []) {
      if (trade.closedAt >= start) {
        const key = dayKey(startOfDayMs(new Date(trade.closedAt)));
        counts.get(key)?.add(doc.userId);
      }
    }
    for (const pos of doc.open ?? []) {
      if (pos.openedAt >= start) {
        const key = dayKey(startOfDayMs(new Date(pos.openedAt)));
        counts.get(key)?.add(doc.userId);
      }
    }
  }

  const walletDocs = await UserWallet.find().lean();
  for (const doc of walletDocs) {
    for (const txn of doc.transactions ?? []) {
      const txnTime = txn.createdAt ?? Date.parse(txn.date);
      if (Number.isNaN(txnTime) || txnTime < start) continue;
      const key = dayKey(startOfDayMs(new Date(txnTime)));
      counts.get(key)?.add(doc.userId);
    }
  }

  return [...counts.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, set]) => ({ date, count: set.size }));
}

export async function getAdminDashboardStats(): Promise<AdminDashboardStats> {
  const sinceMs = Date.now() - MS_PER_DAY;

  const [totalUsers, activeToday, volume24h, deposits24h] = await Promise.all([
    countTotalUsers(),
    countActiveToday(sinceMs),
    sumVolume24h(sinceMs),
    sumDeposits24h(sinceMs),
  ]);

  return { totalUsers, activeToday, volume24h, deposits24h };
}

export async function getDailyActiveUsers(days = 60): Promise<DailyActivePoint[]> {
  const safeDays = Math.min(90, Math.max(7, days));
  return buildDailyActiveUsers(safeDays);
}

export async function getAdminDashboard(days = 60): Promise<AdminDashboardData> {
  const [stats, dailyActiveUsers] = await Promise.all([
    getAdminDashboardStats(),
    getDailyActiveUsers(days),
  ]);

  return { stats, dailyActiveUsers };
}
