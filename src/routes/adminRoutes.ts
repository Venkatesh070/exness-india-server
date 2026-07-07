import { Router } from "express";
import * as adminDashboard from "../controllers/adminDashboardController.js";
import { requireAdmin, verifyToken } from "../middleware/auth.js";

const router = Router();

router.use(verifyToken, requireAdmin);

router.get("/", adminDashboard.getDashboard);
router.get("/stats", adminDashboard.getStats);
router.get("/daily-active-users", adminDashboard.getDailyActiveUsers);

export default router;
