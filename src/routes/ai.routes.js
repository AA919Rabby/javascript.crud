import { Router } from "express";
import { checkProductByImage, appAssistantChat } from "../controllers/ai.controller.js";
import { protect } from "../middlewares/auth.middleware.js";
import { uploadAvatar } from "../middlewares/upload.middleware.js";

const router = Router();
router.use(protect);

// Visual Product Check: Accepts image upload
router.post("/check-product", uploadAvatar.single("photo"), checkProductByImage);

// General Application Helper & Chat Assistant
router.post("/chat", appAssistantChat);

export default router;