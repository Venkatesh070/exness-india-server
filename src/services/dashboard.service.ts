import { UserWallet } from "../models/UserWallet.js";
import { UserTrading } from "../models/UserTrading.js";
import { NewsArticle } from "../models/NewsArticle.js";
import { MARKET_ASSETS } from "../data/marketAssets.js";
import {
  buildEquityCurve,
  calcAccountMetrics,
  relativeTime,
} from "../utils/accountMetrics.js";

function marketPriceMap(): Record<string, number> {
  const map: Record<string, number> = {};
  for (const asset of MARKET_ASSETS) {
    map[asset.symbol] = asset.price;
  }
  return map;
}

async function getOrCreateWallet(userId: string) {
  let doc = await UserWallet.findOne({ userId }).lean();
  if (!doc) {
    doc = (await UserWallet.create({ userId, balance: 0, transactions: [] })).toObject();
  }
  return doc;
}

async function getOrCreateTrading(userId: string) {
  let doc = await UserTrading.findOne({ userId }).lean();
  if (!doc) {
    doc = (await UserTrading.create({ userId, open: [], closed: [] })).toObject();
  }
  return doc;
}

export async function getDashboardSummary(userId: string) {
  const wallet = await getOrCreateWallet(userId);
  const trading = await getOrCreateTrading(userId);
  const prices = marketPriceMap();

  const metrics = calcAccountMetrics({
    balance: wallet.balance,
    openPositions: trading.open,
    closedTrades: trading.closed,
    prices,
  });

  return metrics;
}

export async function getEquityCurve(userId: string, points = 60) {
  const wallet = await getOrCreateWallet(userId);
  const trading = await getOrCreateTrading(userId);
  const prices = marketPriceMap();

  const metrics = calcAccountMetrics({
    balance: wallet.balance,
    openPositions: trading.open,
    closedTrades: trading.closed,
    prices,
  });

  return {
    points: buildEquityCurve(wallet.balance, trading.closed, metrics.unrealizedPnl, points),
    equity: metrics.equity,
    change30dPct: metrics.change30dPct,
  };
}

export function getMarketMovers(limit = 6) {
  return [...MARKET_ASSETS]
    .sort((a, b) => Math.abs(b.changePct) - Math.abs(a.changePct))
    .slice(0, limit)
    .map((asset) => ({
      symbol: asset.symbol,
      name: asset.name,
      category: asset.category,
      price: asset.price,
      changePct: asset.changePct,
    }));
}

export async function getRecentTrades(userId: string, limit = 4) {
  const trading = await getOrCreateTrading(userId);
  return [...trading.closed]
    .sort((a, b) => b.closedAt - a.closedAt)
    .slice(0, limit)
    .map((trade) => ({
      id: trade.id,
      symbol: trade.symbol,
      side: trade.side,
      qty: trade.qty,
      openPrice: trade.openPrice,
      closePrice: trade.closePrice,
      pnl: trade.pnl,
      openedAt: trade.openedAt,
      closedAt: trade.closedAt,
    }));
}

export async function getLatestNews(limit = 4) {
  const articles = await NewsArticle.find({ active: true })
    .sort({ publishedAt: -1 })
    .limit(limit)
    .lean();

  return articles.map((article) => ({
    id: article._id,
    title: article.title,
    source: article.source,
    category: article.category,
    excerpt: article.excerpt,
    publishedAt: article.publishedAt.toISOString(),
    time: relativeTime(article.publishedAt),
  }));
}

export async function getFullDashboard(userId: string) {
  const wallet = await getOrCreateWallet(userId);
  const trading = await getOrCreateTrading(userId);
  const prices = marketPriceMap();

  const summary = calcAccountMetrics({
    balance: wallet.balance,
    openPositions: trading.open,
    closedTrades: trading.closed,
    prices,
  });

  const [equityCurve, marketMovers, recentTrades, news] = await Promise.all([
    Promise.resolve({
      points: buildEquityCurve(wallet.balance, trading.closed, summary.unrealizedPnl, 60),
      equity: summary.equity,
      change30dPct: summary.change30dPct,
    }),
    Promise.resolve(getMarketMovers(6)),
    Promise.resolve(
      [...trading.closed]
        .sort((a, b) => b.closedAt - a.closedAt)
        .slice(0, 4)
        .map((trade) => ({
          id: trade.id,
          symbol: trade.symbol,
          side: trade.side,
          qty: trade.qty,
          openPrice: trade.openPrice,
          closePrice: trade.closePrice,
          pnl: trade.pnl,
          openedAt: trade.openedAt,
          closedAt: trade.closedAt,
        })),
    ),
    getLatestNews(4),
  ]);

  return {
    summary,
    equityCurve,
    marketMovers,
    recentTrades,
    news,
    openPositionsCount: trading.open.length,
  };
}
