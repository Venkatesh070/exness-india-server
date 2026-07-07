import type { Request, Response } from "express";
import * as adminDashboard from "../services/adminDashboard.service.js";

export async function getDashboard(req: Request, res: Response): Promise<void> {
  const days = Math.min(90, Math.max(7, Number(req.query.days) || 60));
  const data = await adminDashboard.getAdminDashboard(days);
  res.json(data);
}

export async function getStats(_req: Request, res: Response): Promise<void> {
  const stats = await adminDashboard.getAdminDashboardStats();
  res.json({ stats });
}

export async function getDailyActiveUsers(req: Request, res: Response): Promise<void> {
  const days = Math.min(90, Math.max(7, Number(req.query.days) || 60));
  const dailyActiveUsers = await adminDashboard.getDailyActiveUsers(days);
  res.json({ dailyActiveUsers });
}
