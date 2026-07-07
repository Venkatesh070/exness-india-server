export interface MarketAsset {
  symbol: string;
  name: string;
  category: string;
  price: number;
  changePct: number;
}

/** Reference market snapshot for dashboard movers (updated server-side). */
export const MARKET_ASSETS: MarketAsset[] = [
  { symbol: "SOL/USD", name: "Solana / US Dollar", category: "crypto", price: 148.2, changePct: 4.82 },
  { symbol: "AVAX/USD", name: "Avalanche / US Dollar", category: "crypto", price: 28.45, changePct: -3.61 },
  { symbol: "NVDA", name: "NVIDIA Corp", category: "stocks", price: 124.8, changePct: 2.94 },
  { symbol: "ETH/USD", name: "Ethereum / US Dollar", category: "crypto", price: 3420.5, changePct: 1.87 },
  { symbol: "DOGE/USD", name: "Dogecoin / US Dollar", category: "crypto", price: 0.124, changePct: -2.15 },
  { symbol: "XAU/USD", name: "Gold / US Dollar", category: "metals", price: 2412.4, changePct: 0.54 },
  { symbol: "EUR/USD", name: "Euro / US Dollar", category: "forex", price: 1.0842, changePct: 0.12 },
  { symbol: "BTC/USD", name: "Bitcoin / US Dollar", category: "crypto", price: 68420, changePct: 1.42 },
  { symbol: "US500", name: "S&P 500", category: "indices", price: 5482.3, changePct: 0.68 },
  { symbol: "BRENT", name: "Brent Crude", category: "energy", price: 82.14, changePct: -0.92 },
];
