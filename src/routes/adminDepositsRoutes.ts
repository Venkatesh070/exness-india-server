import { Router } from "express";
import * as adminDeposits from "../controllers/adminDepositsController.js";
import { requireAdmin, verifyToken } from "../middleware/auth.js";

const router = Router();

router.use(verifyToken, requireAdmin);

router.get("/payment-settings", adminDeposits.getPaymentSettings);
router.put("/payment-settings", adminDeposits.updatePaymentSettings);
router.get("/requests", adminDeposits.listRequests);
router.post("/requests/:requestId/approve", adminDeposits.approveRequest);
router.post("/requests/:requestId/reject", adminDeposits.rejectRequest);
router.get("/withdrawal-requests", adminDeposits.listWithdrawalRequests);
router.post("/withdrawal-requests/:requestId/approve", adminDeposits.approveWithdrawalRequest);
router.post("/withdrawal-requests/:requestId/reject", adminDeposits.rejectWithdrawalRequest);

export default router;
