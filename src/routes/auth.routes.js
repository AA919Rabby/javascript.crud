import { Router } from "express";
import {
    register,
    verifyRegistrationOtp,
    login,
    forgotPassword,
    verifyResetOtp,
    resetPassword,
    changePassword,
} from "../controllers/auth.controller.js";
import { protect } from "../middlewares/auth.middleware.js";
import { authLimiter } from "../middlewares/rateLimiter.js";
import {
    validate,
    registerSchema,
    verifyOtpSchema,
    loginSchema,
    forgotPasswordSchema,
    resetPasswordSchema,
    changePasswordSchema,
    createBlogSchema,
    verifyResetOtpSchema,
} from "../middlewares/validate.middleware.js";
import {
    googleSignIn,
    appleSignIn,
} from "../controllers/socialAuth.controller.js";



const router = Router();


router.use(authLimiter);

router.post("/google", googleSignIn);
router.post("/apple", appleSignIn);

router.post("/register", validate(registerSchema), register);
router.post("/verify-registration-otp", validate(verifyOtpSchema), verifyRegistrationOtp);
router.post("/login", validate(loginSchema), login);
router.post("/forgot-password", validate(forgotPasswordSchema),
    forgotPassword);
router.post("/verify-reset-otp", validate(verifyResetOtpSchema), verifyResetOtp);
router.post("/reset-password", validate(resetPasswordSchema), resetPassword);
router.post("/change-password", protect, validate(changePasswordSchema), changePassword);

export default router;