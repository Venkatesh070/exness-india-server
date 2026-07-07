import { Router } from "express";
import * as adminAuth from "../controllers/adminAuthController.js";
import * as userAuth from "../controllers/userAuthController.js";
import { requireAdmin, verifyToken } from "../middleware/auth.js";

const router = Router();

// User auth — OTP-based register & login
router.post("/user/register", userAuth.register);
router.post("/user/verify-register-otp", userAuth.verifyRegisterOtp);
router.post("/user/resend-register-otp", userAuth.resendRegisterOtp);
router.get("/user/register-otp-resend", userAuth.registerOtpResendStatus);
router.post("/user/login", userAuth.login);
router.post("/user/verify-login-otp", userAuth.verifyLoginOtp);
router.post("/user/resend-login-otp", userAuth.resendLoginOtp);
router.get("/user/login-otp-resend", userAuth.loginOtpResendStatus);
router.post("/user/resend-verification", verifyToken, userAuth.resendVerification);
router.post("/user/sync", verifyToken, userAuth.sync);
router.post("/user/verify-email", verifyToken, userAuth.verifyEmail);
router.get("/user/me", verifyToken, userAuth.me);

// Admin auth
router.post("/admin/login", adminAuth.login);
router.get("/admin/me", verifyToken, requireAdmin, adminAuth.me);

export default router;
