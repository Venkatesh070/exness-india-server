import { Router } from "express";
import * as adminAuth from "../controllers/adminAuthController.js";
import * as userAuth from "../controllers/userAuthController.js";
import { requireAdmin, verifyToken } from "../middleware/auth.js";

const router = Router();

// User auth
router.post("/user/register", userAuth.register);
router.post("/user/resend-verification", verifyToken, userAuth.resendVerification);
router.post("/user/sync", verifyToken, userAuth.sync);
router.post("/user/verify-email", verifyToken, userAuth.verifyEmail);
router.get("/user/me", verifyToken, userAuth.me);

// Admin auth
router.post("/admin/login", adminAuth.login);
router.get("/admin/me", verifyToken, requireAdmin, adminAuth.me);

export default router;
