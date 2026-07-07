import { Router } from "express";
import * as adminNews from "../controllers/adminNewsController.js";
import { requireAdmin, verifyToken } from "../middleware/auth.js";

const router = Router();

router.use(verifyToken, requireAdmin);

router.get("/", adminNews.listArticles);
router.post("/", adminNews.createArticle);
router.get("/:id", adminNews.getArticle);
router.put("/:id", adminNews.updateArticle);
router.delete("/:id", adminNews.deleteArticle);

export default router;
