import type { Request, Response } from "express";
import * as wallet from "../services/wallet.service.js";

export async function getWallet(req: Request, res: Response): Promise<void> {
  const data = await wallet.getUserWallet(req.auth!.uid);
  res.json({ wallet: data });
}

export async function getTransactions(req: Request, res: Response): Promise<void> {
  const data = await wallet.getUserWallet(req.auth!.uid);
  res.json({ transactions: data.transactions, balance: data.balance });
}

export async function getPaymentSettings(_req: Request, res: Response): Promise<void> {
  const settings = await wallet.getPaymentSettings();
  res.json({ settings });
}

export async function submitDepositRequest(req: Request, res: Response): Promise<void> {
  const body = req.body as {
    amount?: number;
    referenceId?: string;
    screenshot?: string;
  };

  if (!body.amount || body.amount <= 0) {
    res.status(400).json({ error: "Invalid deposit amount." });
    return;
  }
  if (!body.referenceId?.trim()) {
    res.status(400).json({ error: "Reference ID is required." });
    return;
  }
  if (!body.screenshot?.trim()) {
    res.status(400).json({ error: "Payment screenshot is required." });
    return;
  }
  if (body.screenshot.length > 3_000_000) {
    res.status(400).json({ error: "Screenshot is too large." });
    return;
  }

  const user = await wallet.getUserById(req.auth!.uid);
  if (!user) {
    res.status(404).json({ error: "User profile not found." });
    return;
  }

  const request = await wallet.submitDepositRequest({
    userId: user._id,
    userEmail: user.email,
    userName: user.name,
    amount: body.amount,
    referenceId: body.referenceId,
    screenshot: body.screenshot,
  });

  const walletData = await wallet.getUserWallet(user._id);
  res.status(201).json({ request, wallet: walletData });
}

export async function listDepositRequests(req: Request, res: Response): Promise<void> {
  const requests = await wallet.listUserDepositRequests(req.auth!.uid);
  res.json({ requests });
}

export async function submitWithdrawal(req: Request, res: Response): Promise<void> {
  const body = req.body as {
    amount?: number;
    accountNumber?: string;
    ifsc?: string;
  };

  if (!body.amount || body.amount <= 0) {
    res.status(400).json({ error: "Invalid withdrawal amount." });
    return;
  }
  if (!body.accountNumber?.trim()) {
    res.status(400).json({ error: "Bank account number is required." });
    return;
  }
  if (!body.ifsc?.trim()) {
    res.status(400).json({ error: "IFSC code is required." });
    return;
  }

  try {
    const user = await wallet.getUserById(req.auth!.uid);
    if (!user) {
      res.status(404).json({ error: "User profile not found." });
      return;
    }

    const result = await wallet.submitWithdrawal({
      userId: user._id,
      userEmail: user.email,
      userName: user.name,
      amount: body.amount,
      accountNumber: body.accountNumber,
      ifsc: body.ifsc,
    });
    res.status(201).json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Withdrawal failed.";
    const status = message.includes("Insufficient") ? 400 : 400;
    res.status(status).json({ error: message });
  }
}
