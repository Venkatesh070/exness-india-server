import { Router } from "express";
import * as adminUsers from "../controllers/adminUsersController.js";
import { requireAdmin, verifyToken } from "../middleware/auth.js";

const router = Router();

router.use(verifyToken, requireAdmin);

router.get("/", adminUsers.listUsers);
router.get("/:userId", adminUsers.getUser);

export default router;
