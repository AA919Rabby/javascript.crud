import fs from "node:fs";
import { User } from "../models/user.model.js";
import { Notification } from "../models/notification.model.js";


export const getProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select("-password");
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }
        return res.status(200).json({
            success: true,
            message: "User profile fetched successfully",
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};


export const updateProfile = async (req, res) => {
    try {
        const { name } = req.body;
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }
        if (name) user.name = name.trim();
        if (req.file) {
            if (user.avatar && fs.existsSync(user.avatar)) {
                try {
                    fs.unlinkSync(user.avatar);
                } catch (error) {
                    console.log(error);
                }
            }
        }
        await user.save();
        await Notification.create({
            receiver: user._id,
            type: "Profile Updated",
            message: "Your profile has been updated successfully",
            type: "INFO"
        });
        if (req.io) {
            req.io.emit(`notification_${user._id}`, {
                title: "Profile Updated",
                message: "Your profile has been saved.",
            });
        }
        return res.status(200).json({
            success: true,
            message: "Profile updated successfully",
            data: {
                id: user._id,
                name: user.name,
                email: user.email,
                avatar: user.avatar,
            }
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};


export const deleteAccount = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }
        if (user.avatar && fs.existsSync(user.avatar)) {
            try {
                fs.unlinkSync(user.avatar);
            } catch (error) {
                console.log(error);
            }
        }
        await User.findByIdAndDelete(req.user.id);
        return res.status(200).json({
            success: true,
            message: "Account deleted successfully"
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};


export const getMyNotifications = async (req, res) => {
    try {
        const notifications = await Notification.find({
            receiver: req.user.id
        }).sort({ createdAt: -1 }).limit(20);
        return res.status(200).json({
            success: true,
            message: "Notifications fetched successfully",
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};


