import { Router } from "express";
import * as dashboard from "../controllers/dashboardController.js";
import { verifyToken } from "../middleware/auth.js";

const router = Router();

router.use(verifyToken);

router.get("/", dashboard.getDashboard);
router.get("/summary", dashboard.getSummary);
router.get("/equity-curve", dashboard.getEquityCurve);
router.get("/market-movers", dashboard.getMarketMovers);
router.get("/recent-trades", dashboard.getRecentTrades);
router.get("/news", dashboard.getNews);

export default router;
