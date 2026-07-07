import type { Request, Response } from "express";
import * as adminUsers from "../services/adminUsers.service.js";

export async function listUsers(req: Request, res: Response): Promise<void> {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 50;
  const search = typeof req.query.search === "string" ? req.query.search : undefined;
  const status = typeof req.query.status === "string" ? req.query.status : undefined;

  const data = await adminUsers.listAdminUsers({ page, limit, search, status });
  res.json(data);
}

export async function getUser(req: Request, res: Response): Promise<void> {
  const user = await adminUsers.getAdminUser(String(req.params.userId));
  if (!user) {
    res.status(404).json({ error: "User not found." });
    return;
  }
  res.json({ user });
}
