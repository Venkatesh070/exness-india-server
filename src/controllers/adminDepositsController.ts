import type { Request, Response } from "express";
import * as wallet from "../services/wallet.service.js";

export async function getPaymentSettings(_req: Request, res: Response): Promise<void> {
  const settings = await wallet.getPaymentSettings();
  res.json({ settings });
}

export async function updatePaymentSettings(req: Request, res: Response): Promise<void> {
  const body = req.body as {
    qrImage?: string;
    upiId?: string;
    accountName?: string;
  };

  if (body.qrImage !== undefined && body.qrImage.length > 3_000_000) {
    res.status(400).json({ error: "QR image is too large." });
    return;
  }

  const settings = await wallet.updatePaymentSettings({
    qrImage: body.qrImage,
    upiId: body.upiId,
    accountName: body.accountName,
  });

  res.json({ settings });
}

export async function listRequests(req: Request, res: Response): Promise<void> {
  const status = typeof req.query.status === "string" ? req.query.status : "all";
  const requests = await wallet.listDepositRequests(status);
  res.json({ requests });
}

export async function approveRequest(req: Request, res: Response): Promise<void> {
  try {
    const request = await wallet.approveDepositRequest(String(req.params.requestId), req.auth!.uid);
    res.json({ request });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to approve deposit.";
    const status = message.includes("not found") ? 404 : 400;
    res.status(status).json({ error: message });
  }
}

export async function rejectRequest(req: Request, res: Response): Promise<void> {
  try {
    const request = await wallet.rejectDepositRequest(String(req.params.requestId), req.auth!.uid);
    res.json({ request });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to reject deposit.";
    const status = message.includes("not found") ? 404 : 400;
    res.status(status).json({ error: message });
  }
}

export async function listWithdrawalRequests(req: Request, res: Response): Promise<void> {
  const status = typeof req.query.status === "string" ? req.query.status : "all";
  const requests = await wallet.listWithdrawalRequests(status);
  res.json({ requests });
}

export async function approveWithdrawalRequest(req: Request, res: Response): Promise<void> {
  try {
    const request = await wallet.approveWithdrawalRequest(String(req.params.requestId), req.auth!.uid);
    res.json({ request });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to approve withdrawal.";
    const status = message.includes("not found") ? 404 : 400;
    res.status(status).json({ error: message });
  }
}

export async function rejectWithdrawalRequest(req: Request, res: Response): Promise<void> {
  try {
    const request = await wallet.rejectWithdrawalRequest(String(req.params.requestId), req.auth!.uid);
    res.json({ request });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to reject withdrawal.";
    const status = message.includes("not found") ? 404 : 400;
    res.status(status).json({ error: message });
  }
}
