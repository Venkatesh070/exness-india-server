export const ACCOUNT_LEVERAGE = 500;
export const MIN_TRADING_BALANCE = 5000;

export interface OpenPosition {
  symbol: string;
  side: "buy" | "sell";
  qty: number;
  price: number;
}

export interface ClosedTrade {
  pnl: number;
  closedAt: number;
}

export function calcPositionPnl(
  position: Pick<OpenPosition, "side" | "qty" | "price">,
  currentPrice: number,
) {
  return (currentPrice - position.price) * (position.side === "buy" ? 1 : -1) * position.qty * 100;
}

export function sumOpenPnl(
  positions: OpenPosition[],
  prices: Record<string, number | undefined>,
) {
  return positions.reduce((sum, position) => {
    const current = prices[position.symbol] ?? position.price;
    return sum + calcPositionPnl(position, current);
  }, 0);
}

export function calcMarginUsed(positions: OpenPosition[], leverage = ACCOUNT_LEVERAGE) {
  return positions.reduce((sum, position) => sum + (position.qty * position.price) / leverage, 0);
}

export function calcAccountMetrics({
  balance,
  openPositions,
  closedTrades,
  prices,
}: {
  balance: number;
  openPositions: OpenPosition[];
  closedTrades: ClosedTrade[];
  prices: Record<string, number | undefined>;
}) {
  const unrealizedPnl = sumOpenPnl(openPositions, prices);
  const equity = balance + unrealizedPnl;
  const margin = calcMarginUsed(openPositions);
  const freeMargin = Math.max(0, equity - margin);

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const startMs = startOfDay.getTime();

  const realizedToday = closedTrades
    .filter((trade) => trade.closedAt >= startMs)
    .reduce((sum, trade) => sum + trade.pnl, 0);
  const profitToday = realizedToday + unrealizedPnl;

  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const realized30d = closedTrades
    .filter((trade) => trade.closedAt >= thirtyDaysAgo)
    .reduce((sum, trade) => sum + trade.pnl, 0);
  const equity30dAgo = Math.max(0, equity - realized30d);
  const change30dPct = equity30dAgo > 0 ? ((equity - equity30dAgo) / equity30dAgo) * 100 : 0;

  return {
    balance,
    equity,
    unrealizedPnl,
    margin,
    freeMargin,
    profitToday,
    change30dPct,
    leverage: ACCOUNT_LEVERAGE,
    leverageLabel: `1:${ACCOUNT_LEVERAGE}`,
    isFunded: balance >= MIN_TRADING_BALANCE,
    minTradingBalance: MIN_TRADING_BALANCE,
  };
}

export function buildEquityCurve(
  balance: number,
  closedTrades: ClosedTrade[],
  openPnl: number,
  points = 60,
) {
  const equity = balance + openPnl;
  if (!closedTrades.length) {
    return Array.from({ length: points }, () => equity);
  }

  const sorted = [...closedTrades].sort((a, b) => a.closedAt - b.closedAt);
  const realizedTotal = sorted.reduce((sum, trade) => sum + trade.pnl, 0);
  let running = balance - realizedTotal;
  const samples = [running];

  for (const trade of sorted) {
    running += trade.pnl;
    samples.push(running);
  }
  samples.push(equity);

  if (samples.length >= points) {
    const step = (samples.length - 1) / (points - 1);
    return Array.from({ length: points }, (_, index) => {
      const position = index * step;
      const left = Math.floor(position);
      const right = Math.min(samples.length - 1, Math.ceil(position));
      const weight = position - left;
      return samples[left] * (1 - weight) + samples[right] * weight;
    });
  }

  const padded = [...samples];
  while (padded.length < points) {
    padded.push(equity);
  }
  return padded;
}

export function relativeTime(date: Date): string {
  const diff = Date.now() - date.getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
