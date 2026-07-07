import type { Request, Response } from "express";
import * as dashboardService from "../services/dashboard.service.js";

function getUserId(req: Request): string | null {
  return req.auth?.uid ?? null;
}

export async function getDashboard(req: Request, res: Response): Promise<void> {
  const userId = getUserId(req);
  if (!userId) {
    res.status(401).json({ error: "Authentication required." });
    return;
  }

  const data = await dashboardService.getFullDashboard(userId);
  res.json(data);
}

export async function getSummary(req: Request, res: Response): Promise<void> {
  const userId = getUserId(req);
  if (!userId) {
    res.status(401).json({ error: "Authentication required." });
    return;
  }

  const summary = await dashboardService.getDashboardSummary(userId);
  res.json({ summary });
}

export async function getEquityCurve(req: Request, res: Response): Promise<void> {
  const userId = getUserId(req);
  if (!userId) {
    res.status(401).json({ error: "Authentication required." });
    return;
  }

  const points = Math.min(120, Math.max(10, Number(req.query.points) || 60));
  const equityCurve = await dashboardService.getEquityCurve(userId, points);
  res.json({ equityCurve });
}

export async function getMarketMovers(req: Request, res: Response): Promise<void> {
  const userId = getUserId(req);
  if (!userId) {
    res.status(401).json({ error: "Authentication required." });
    return;
  }

  const limit = Math.min(20, Math.max(1, Number(req.query.limit) || 6));
  const marketMovers = dashboardService.getMarketMovers(limit);
  res.json({ marketMovers });
}

export async function getRecentTrades(req: Request, res: Response): Promise<void> {
  const userId = getUserId(req);
  if (!userId) {
    res.status(401).json({ error: "Authentication required." });
    return;
  }

  const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 4));
  const recentTrades = await dashboardService.getRecentTrades(userId, limit);
  res.json({ recentTrades });
}

export async function getNews(req: Request, res: Response): Promise<void> {
  const userId = getUserId(req);
  if (!userId) {
    res.status(401).json({ error: "Authentication required." });
    return;
  }

  const limit = Math.min(20, Math.max(1, Number(req.query.limit) || 4));
  const news = await dashboardService.getLatestNews(limit);
  res.json({ news });
}
