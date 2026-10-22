import { Router } from "express";
import {
    getProfile,
    updateProfile,
    deleteAccount,
    getMyNotifications,
} from "../controllers/user.controller.js";
import { protect } from "../middlewares/auth.middleware.js";
import { uploadAvatar } from "../middlewares/upload.middleware.js";



const router = Router();


router.get("/profile", protect, getProfile);
router.put("/profile", uploadAvatar.single("avatar"), updateProfile);
router.delete("/account", protect, deleteAccount);
router.get("/notifications", getMyNotifications);

export default router;
