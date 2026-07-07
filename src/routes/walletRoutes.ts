import { Router } from "express";
import * as wallet from "../controllers/walletController.js";
import { verifyToken } from "../middleware/auth.js";

const router = Router();

router.get("/payment-settings", wallet.getPaymentSettings);

router.use(verifyToken);

router.get("/", wallet.getWallet);
router.get("/transactions", wallet.getTransactions);
router.get("/deposit-requests", wallet.listDepositRequests);
router.post("/deposit-requests", wallet.submitDepositRequest);
router.post("/withdrawals", wallet.submitWithdrawal);

export default router;
