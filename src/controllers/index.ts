import type { Response } from "express";
import type { AuthRequest } from "../middlewares/auth.js";
import * as authService from "../services/auth.service.js";

export const authController = {
  sendOtp: async (req: AuthRequest, res: Response) => {
    const result = await authService.sendOtp(req.body);
    res.json(result);
  },

  verifyOtp: async (req: AuthRequest, res: Response) => {
    const result = await authService.verifyOtp(req.body);
    res.json({ success: true, ...result });
  },

  resendOtp: async (req: AuthRequest, res: Response) => {
    const { email } = req.body as { email: string };
    const result = await authService.resendOtp(email);
    res.json(result);
  },

  login: async (req: AuthRequest, res: Response) => {
    const result = await authService.login(req.body);
    res.json({ success: true, ...result });
  },

  refresh: async (req: AuthRequest, res: Response) => {
    const { refreshToken } = req.body as { refreshToken: string };
    const result = await authService.refreshAccessToken(refreshToken);
    res.json({ success: true, ...result });
  },

  logout: async (req: AuthRequest, res: Response) => {
    const { refreshToken } = req.body as { refreshToken: string };
    const result = await authService.logout(refreshToken);
    res.json(result);
  },

  me: async (req: AuthRequest, res: Response) => {
    const { userRepo, sanitizeUser } = await import("../repositories/index.js");
    const user = await userRepo.findById(req.user!.id);
    res.json({ success: true, user: sanitizeUser(user!) });
  },
};

export const profileController = {
  get: async (req: AuthRequest, res: Response) => {
    const profile = await authService.getProfile(req.user!.id);
    res.json({ success: true, profile });
  },

  update: async (req: AuthRequest, res: Response) => {
    const profile = await authService.updateProfile(req.user!.id, req.body);
    res.json({ success: true, profile });
  },
};

export const kycController = {
  get: async (req: AuthRequest, res: Response) => {
    const kyc = await authService.getKyc(req.user!.id);
    res.json({ success: true, kyc });
  },

  updatePan: async (req: AuthRequest, res: Response) => {
    const kyc = await authService.updateKycPan(req.user!.id, req.body);
    res.json({ success: true, kyc });
  },

  updateAadhaar: async (req: AuthRequest, res: Response) => {
    const kyc = await authService.updateKycAadhaar(req.user!.id, req.body);
    res.json({ success: true, kyc });
  },

  uploadSelfie: async (req: AuthRequest, res: Response) => {
    const file = req.file;
    if (!file) return res.status(400).json({ success: false, message: "No file uploaded" });
    const kyc = await authService.uploadKycSelfie(req.user!.id, file.buffer, file.mimetype);
    res.json({ success: true, kyc });
  },
};

export const bankController = {
  list: async (req: AuthRequest, res: Response) => {
    const accounts = await authService.getBankAccounts(req.user!.id);
    res.json({ success: true, accounts });
  },

  add: async (req: AuthRequest, res: Response) => {
    const account = await authService.addBankAccount(req.user!.id, req.body);
    res.json({ success: true, account: { id: account.id, bankName: account.bankName, verified: account.verified } });
  },

  verify: async (req: AuthRequest, res: Response) => {
    const account = await authService.verifyBankAccount(req.user!.id, String(req.params.id));
    res.json({ success: true, account });
  },
};
