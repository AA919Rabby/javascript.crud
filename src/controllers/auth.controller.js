import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";
import { OTP } from "../models/otp.model.js";
import { sendEmail } from "../utils/sendEmail.js";



/// Generate random  OTP
const generateOTP = () => {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpHash = crypto.createHash("sha256").update(otp).digest("hex");
    return { otp, otpHash };//Fixed: was otphash
};


export const register = async (req, res) => {
    try {
        const { name, email, password } = req.body;
        const existingUser = await User.findOne({
            email: email.toLowerCase().trim()
        });
        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: "Email is already registered."
            });
        }
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);
        const { otp, otpHash } = generateOTP();
        await OTP.deleteMany({
            email: email.toLowerCase().trim(),
            purpose: "REGISTRATION"
        });
        await OTP.create({
            email: email.toLowerCase().trim(),
            otpHash,
            purpose: "REGISTRATION",
            tempData: { name, passwordHash }
        });
        try {
            await sendEmail({
                to: email,
                subject: "Verify your account - Registration OTP",
                html: `<h2>Welcome</h2><p>Your registration OTP is: <b>${otp}</b></p>`,
                text: `Your registration OTP is: ${otp}`,
            });
        } catch (mailError) {
            console.warn("Mail warning:", mailError.message);
        }

        console.log(`🔑 [DEBUG] Registration OTP for ${email}: ${otp}`);
        return res.status(200).json({
            success: true,
            message: "OTP sent to your email."
        });
    } catch (error) {
        console.error("Register error:", error.message || error);
        return res.status(500).json({
            success: false,
            message: "Server error during registration"
        });
    }
};


export const verifyRegistrationOtp = async (req, res) => {
    try {
        const { email, otp } = req.body;
        const incomingHash = crypto.createHash("sha256").update(otp.toString().trim()).digest("hex");
        const record = await OTP.findOne({
            email: email.toLowerCase().trim(),
            purpose: "REGISTRATION",
            otpHash: incomingHash
        });
        if (!record) {
            return res.status(400).json({
                success: false,
                message: "Invalid or expired OTP"
            });
        }
        const newUser = await User.create({
            name: record.tempData.name,
            email: record.email.toLowerCase().trim(),
            password: record.tempData.passwordHash
        });
        await OTP.findByIdAndDelete(record._id);
        return res.status(201).json({
            success: true,
            message: "Account verified successfully",
            user: {
                id: newUser._id,
                name: newUser.name,
                email: newUser.email
            }
        });
    } catch (error) {
        console.error("Verify Registration OTP error:", error.message || error);
        return res.status(500).json({
            success: false,
            message: "Server error during registration"
        });
    }
};


export const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email: email.toLowerCase().trim() });
        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password"
            });
        }
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password"
            });
        }
        const secret = process.env.JWT_SECRET;
        const token = jwt.sign({ id: user._id, email: user.email }, secret, { expiresIn: "7d" });
        console.log(`🔑 [DEBUG] Login token for ${user.email}: ${token}`);
        return res.status(200).json({
            success: true,
            message: "Login successful",
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email
            }
        });
    } catch (error) {
        console.error("Login error:", error.message || error);
        return res.status(500).json({
            success: false,
            message: "Server error during login"
        });
    }
};


export const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email: email.toLowerCase().trim() });
        if (!user) {
            return res.status(200).json({
                success: true,
                message: "If that email  exists, an OTP has been sent."
            });
        }
        const { otp, otpHash } = generateOTP();
        await OTP.deleteMany({
            email: email.toLowerCase().trim(),
            purpose: "PASSWORD-RESET"
        });
        await OTP.create({
            email: email.toLowerCase().trim(),
            otpHash,
            purpose: "PASSWORD-RESET",
        });
        try {
            await sendEmail({
                to: user.email,
                subject: "Password Reset Request",
                html: `<h2>Password Reset</h2><p>Your password reset code is: <b>${otp}</b></p><p>Expires in 10 minutes.</p>`,
                text: `Your password reset OTP is: ${otp}`,
            });
            console.log(`🔑 [DEBUG] Password Reset OTP for ${user.email}: ${otp}`);
            return res.status(200).json({
                success: true,
                message: "OTP sent to your email."
            });
        } catch (mailError) {
            console.warn("Mail warning:", mailError.message);
        }
        console.log(`🔑 [DEBUG] Password Reset OTP for ${user.email}: ${otp}`);
        return res.status(200).json({
            success: true,
            message: "OTP sent to your email."
        });
    } catch (error) {
        console.error("Forget Password error:", error.message || error);
        return res.status(500).json({
            success: false,
            message: "Server error during password reset"
        });
    }
};


export const verifyResetOtp = async (req, res) => {
    try {
        const { otp } = req.body;
        const incomingHash = crypto.createHash("sha256").update(otp.toString().trim()).digest("hex");
        const record = await OTP.findOne({ purpose: "PASSWORD-RESET", otpHash: incomingHash });
        if (!record) {
            return res.status(400).json({
                success: false,
                message: "Invalid or expired OTP"
            });
        }
        await OTP.findByIdAndDelete(record._id);
        const secret = process.env.JWT_SECRET;
        const forgetToken = jwt.sign(
            { email: record.email, purpose: "PASSWORD-RESET" },
            secret,
            { expiresIn: "15m" }
        );
        console.log(`🔑 [DEBUG] Password Reset Token for ${record.email}: ${forgetToken}`);
        return res.status(200).json({
            success: true,
            message: "OTP verified successfully",
            forgetToken
        });
    } catch (error) {
        console.error("Verify Reset OTP error:", error.message || error);
        return res.status(500).json({
            success: false,
            message: "Server error during password reset"
        });
    }
};


export const resetPassword = async (req, res) => {
    try {
        const { forgotToken, newPassword } = req.body;
        if (!forgotToken) {
            return res.status(401).json({
                success: false,
                message: "Access denied. ForgotToken is required.",
            });
        }
        const secret = process.env.JWT_SECRET;
        let decoded;
        try {
            decoded = jwt.verify(forgotToken, secret);
        } catch (error) {
            return res.status(401).json({
                success: false,
                message: "Invalid or expired ForgotToken.",
            });
        }
        if (decoded.purpose != "PASSWORD-RESET") {
            return res.status(403).json({
                success: false,
                message: "Invalid or expired token",
            });
        }
        const salt = await bcrypt.genSalt(10);
        const newPasswordHash = await bcrypt.hash(newPassword, salt);
        const updatedUser = await User.findOneAndUpdate(
            { email: decoded.email.toLowerCase().trim() },
            { password: newPasswordHash },
            { new: true }
        );
        if (!updatedUser) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }
        return res.status(200).json({
            success: true,
            message: "Password reset successfully",
        });
    } catch (error) {
        console.error("Reset Password error:", error.message || error);
        return res.status(500).json({
            success: false,
            message: "Server error during password reset"
        });
    }
};

export const changePassword = async (req, res) => {
    try {
        const { oldPassword, newPassword } = req.body;
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }
        const isMatch = await bcrypt.compare(oldPassword, user.password);
        if (!isMatch) {
            return res.status(400).json({
                success: false,
                message: "Invalid old password"
            });
        }
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);
        await user.save();
        return res.status(200).json({
            success: true,
            message: "Password changed successfully"
        });
    } catch (error) {
        console.error("Change Password error:", error.message || error);
        return res.status(500).json({
            success: false,
            message: "Server error during password change"
        });
    }
};
