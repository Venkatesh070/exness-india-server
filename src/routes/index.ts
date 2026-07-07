import { Router } from "express";
import rateLimit from "express-rate-limit";
import multer from "multer";
import { authController, profileController, kycController, bankController } from "../controllers/index.js";
import { authenticate } from "../middlewares/auth.js";
import { asyncHandler, validateBody } from "../middlewares/validate.js";
import {
  sendOtpSchema,
  verifyOtpSchema,
  loginSchema,
  refreshSchema,
  profileSchema,
  kycPanSchema,
  kycAadhaarSchema,
  bankAccountSchema,
} from "../validators/auth.validator.js";
import { z } from "zod";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Only images allowed"));
  },
});

const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { success: false, message: "Too many OTP requests" },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, message: "Too many requests" },
});

export const authRoutes = Router();

authRoutes.post(
  "/send-otp",
  otpLimiter,
  validateBody(sendOtpSchema),
  asyncHandler(authController.sendOtp),
);

authRoutes.post(
  "/verify-otp",
  authLimiter,
  validateBody(verifyOtpSchema),
  asyncHandler(authController.verifyOtp),
);

authRoutes.post(
  "/resend-otp",
  otpLimiter,
  validateBody(z.object({ email: z.string().email() })),
  asyncHandler(authController.resendOtp),
);

authRoutes.post(
  "/login",
  authLimiter,
  validateBody(loginSchema),
  asyncHandler(authController.login),
);

authRoutes.post(
  "/refresh",
  validateBody(refreshSchema),
  asyncHandler(authController.refresh),
);

authRoutes.post(
  "/logout",
  validateBody(refreshSchema),
  asyncHandler(authController.logout),
);

authRoutes.get("/me", authenticate, asyncHandler(authController.me));

export const profileRoutes = Router();
profileRoutes.use(authenticate);
profileRoutes.get("/", asyncHandler(profileController.get));
profileRoutes.put("/", validateBody(profileSchema), asyncHandler(profileController.update));

export const kycRoutes = Router();
kycRoutes.use(authenticate);
kycRoutes.get("/", asyncHandler(kycController.get));
kycRoutes.put("/pan", validateBody(kycPanSchema), asyncHandler(kycController.updatePan));
kycRoutes.put("/aadhaar", validateBody(kycAadhaarSchema), asyncHandler(kycController.updateAadhaar));
kycRoutes.post("/selfie", upload.single("selfie"), asyncHandler(kycController.uploadSelfie));

export const bankRoutes = Router();
bankRoutes.use(authenticate);
bankRoutes.get("/", asyncHandler(bankController.list));
bankRoutes.post("/", validateBody(bankAccountSchema), asyncHandler(bankController.add));
bankRoutes.post("/:id/verify", asyncHandler(bankController.verify));
