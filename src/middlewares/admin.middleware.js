import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";


export const requireAdmin = async (req, res, next) => {
    try {
        const authHeader = req.headers && req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer")) {
            return res.status(401).json({
                success: false,
                message: "Access denied. Admin token is required"
            });
        }
        const token = authHeader.split(" ")[1];
        const secret = process.env.JWT_SECRET;
        const decoded = jwt.verify(token, secret);
        if (decoded.role !== "ADMIN") {
            return res.status(403).json({
                success: false,
                message: "Access denied. Only Admins can access this."
            });
        }
        const user = await User.findById(decoded.id);
        if (!user || user.role !== "ADMIN" || user.isBanned) {
            return res.status(403).json({
                success: false,
                message: "Access denied. User is banned."
            });
        }
        req.admin = user;
        next();
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};