import { NewsArticle } from "../models/NewsArticle.js";

const SEED_NEWS = [
  {
    title: "Gold steadies near record highs as Fed rate path unclear",
    source: "Market Wire",
    category: "Metals",
    excerpt:
      "Spot gold hovered above $2,400/oz as traders weighed mixed signals from Federal Reserve officials.",
    publishedAt: new Date(Date.now() - 12 * 60_000),
  },
  {
    title: "Bitcoin reclaims $68K on spot ETF inflows",
    source: "CryptoDesk",
    category: "Crypto",
    excerpt: "Institutional inflows accelerated overnight, pushing BTC back above key resistance.",
    publishedAt: new Date(Date.now() - 34 * 60_000),
  },
  {
    title: "Euro holds firm as ECB signals patience on cuts",
    source: "FX Wire",
    category: "Forex",
    excerpt: "EUR/USD steadied near session highs as traders priced a slower easing path from Frankfurt.",
    publishedAt: new Date(Date.now() - 60 * 60_000),
  },
  {
    title: "S&P 500 extends rally on mega-cap earnings beat",
    source: "WallStreet",
    category: "Indices",
    excerpt: "US500 pushed higher as technology and financials led broad risk-on flows.",
    publishedAt: new Date(Date.now() - 2 * 60 * 60_000),
  },
  {
    title: "Brent crude eases as OPEC+ signals output rise",
    source: "EnergyToday",
    category: "Energy",
    excerpt:
      "Oil prices retreated after the cartel hinted at gradual production increases from October.",
    publishedAt: new Date(Date.now() - 3 * 60 * 60_000),
  },
  {
    title: "Tesla deliveries beat estimates, shares pop after-hours",
    source: "WallStreet",
    category: "Stocks",
    excerpt: "Q2 deliveries came in ahead of consensus, easing demand concerns.",
    publishedAt: new Date(Date.now() - 4 * 60 * 60_000),
  },
];

export async function seedNewsArticles(): Promise<void> {
  const count = await NewsArticle.countDocuments();
  if (count > 0) return;
  await NewsArticle.insertMany(SEED_NEWS);
}
