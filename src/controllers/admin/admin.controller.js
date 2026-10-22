import fs from "node:fs";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { User } from "../../models/user.model.js";
import { Product } from "../../models/product.model.js";
import { Notification } from "../../models/notification.model.js";
import { Order } from "../../models/order.model.js";


// ========================================================
// 1. ADMIN LOGIN (Produces adminToken)
// ========================================================
export const adminLogin = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ success: false, message: "Email and password required" });
        }

        const user = await User.findOne({ email: email.toLowerCase().trim() });
        if (!user || user.role !== "ADMIN") {
            return res.status(403).json({ success: false, message: "Invalid admin credentials" });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(403).json({ success: false, message: "Invalid admin credentials" });
        }

        const secret = process.env.JWT_SECRET || "super_secret_jwt_key_production_2026_xyz";
        const adminToken = jwt.sign(
            { id: user._id, email: user.email, role: "ADMIN" },
            secret,
            { expiresIn: "1d" }
        );

        return res.status(200).json({
            success: true,
            message: "Admin authentication successful",
            adminToken,
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Server error during admin login" });
    }
};

// ========================================================
// 2. GET ALL USERS (PAGINATED WITH FILTERS)
// ========================================================
export const getAllUsers = async (req, res) => {
    try {
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 10;
        const search = req.query.search ? req.query.search.trim() : "";

        const query = {};
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: "i" } },
                { email: { $regex: search, $options: "i" } },
            ];
        }

        const skip = (page - 1) * limit;
        const [users, total] = await Promise.all([
            User.find(query).select("-password").skip(skip).limit(limit).sort({ createdAt: -1 }),
            User.countDocuments(query),
        ]);

        return res.status(200).json({
            success: true,
            pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
            data: users,
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Server error fetching users" });
    }
};

// ========================================================
// 3. BLOCK / UNBLOCK USER
// ========================================================
export const toggleBlockUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { isBlocked } = req.body;

        const user = await User.findByIdAndUpdate(id, { isBlocked }, { new: true }).select("-password");
        if (!user) return res.status(404).json({ success: false, message: "User not found" });

        return res.status(200).json({
            success: true,
            message: `User ${isBlocked ? "blocked" : "unblocked"} successfully`,
            data: user,
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Server error" });
    }
};

// ========================================================
// 4. BAN / UNBAN USER
// ========================================================
export const toggleBanUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { isBanned, banReason } = req.body;

        const user = await User.findByIdAndUpdate(
            id,
            { isBanned, banReason: banReason || "" },
            { new: true }
        ).select("-password");

        if (!user) return res.status(404).json({ success: false, message: "User not found" });

        await Notification.create({
            recipient: user._id,
            title: isBanned ? "Account Banned" : "Account Unbanned",
            message: isBanned ? `Your account has been banned: ${banReason}` : "Your account ban has been lifted.",
            type: "ALERT",
        });

        return res.status(200).json({
            success: true,
            message: `User ${isBanned ? "banned" : "unbanned"} successfully`,
            data: user,
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Server error" });
    }
};

// ========================================================
// 5. 🌟 ADD PRODUCT (Admin Direct Creation - Auto Approved)
// ========================================================
export const addProduct = async (req, res) => {
    try {
        const { title, description, price, stock, category } = req.body;

        if (!title || !description || !price || stock === undefined || !category) {
            return res.status(400).json({ success: false, message: "Missing required product fields" });
        }

        if (!req.file) {
            return res.status(400).json({ success: false, message: "Product image is required" });
        }

        const imagePath = req.file.path.replace(/\\/g, "/");

        const product = await Product.create({
            title,
            description,
            price: Number(price),
            stock: Number(stock),
            category,
            image: imagePath,
            seller: req.admin._id,
            status: "APPROVED", // Admin products are auto-approved!
        });

        return res.status(201).json({
            success: true,
            message: "Product added and published immediately by Admin",
            data: product,
        });
    } catch (error) {
        console.error("Add Product Error:", error);
        return res.status(500).json({ success: false, message: "Server error creating product" });
    }
};

// ========================================================
// 6. 🌟 UPDATE PRODUCT (Admin Direct Edit)
// ========================================================
export const updateProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, description, price, stock, category } = req.body;

        const product = await Product.findById(id);
        if (!product) return res.status(404).json({ success: false, message: "Product not found" });

        if (title) product.title = title;
        if (description) product.description = description;
        if (price !== undefined) product.price = Number(price);
        if (stock !== undefined) product.stock = Number(stock);
        if (category) product.category = category;

        if (req.file) {
            if (product.image && fs.existsSync(product.image)) {
                try { fs.unlinkSync(product.image); } catch (_) { }
            }
            product.image = req.file.path.replace(/\\/g, "/");
        }

        product.status = "APPROVED";
        const updatedProduct = await product.save();

        return res.status(200).json({
            success: true,
            message: "Product updated directly by Admin",
            data: updatedProduct,
        });
    } catch (error) {
        console.error("Update Product Error:", error);
        return res.status(500).json({ success: false, message: "Server error updating product" });
    }
};

// ========================================================
// 7. GET ALL PRODUCTS
// ========================================================
export const getProducts = async (req, res) => {
    try {
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 10;
        const search = req.query.search ? req.query.search.trim() : "";
        const category = req.query.category ? req.query.category.trim() : "";

        const query = {};
        if (search) {
            query.$or = [
                { title: { $regex: search, $options: "i" } },
                { description: { $regex: search, $options: "i" } },
            ];
        }
        if (category) query.category = { $regex: category, $options: "i" };

        const skip = (page - 1) * limit;
        const [products, total] = await Promise.all([
            Product.find(query).skip(skip).limit(limit).sort({ createdAt: -1 }),
            Product.countDocuments(query),
        ]);

        return res.status(200).json({
            success: true,
            pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
            data: products,
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Server error" });
    }
};

// ========================================================
// 8. DELETE PRODUCT
// ========================================================
export const deleteProduct = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) return res.status(404).json({ success: false, message: "Product not found" });

        if (product.image && fs.existsSync(product.image)) {
            try { fs.unlinkSync(product.image); } catch (_) { }
        }

        await Product.findByIdAndDelete(req.params.id);
        return res.status(200).json({ success: true, message: "Product deleted permanently" });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Server error deleting product" });
    }
};

// ========================================================
// 9. APPROVALS QUEUE: GET PENDING REQUESTS
// ========================================================
export const getPendingProducts = async (req, res) => {
    try {
        const pending = await Product.find({
            status: { $in: ["PENDING_CREATION", "PENDING_UPDATE", "PENDING_DELETION"] },
        }).populate("seller", "name email");

        return res.status(200).json({ success: true, count: pending.length, data: pending });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Server error fetching queue" });
    }
};

// ========================================================
// 10. APPROVE PRODUCT REQUEST
// ========================================================
export const approveProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const product = await Product.findById(id);
        if (!product) return res.status(404).json({ success: false, message: "Product not found" });

        if (product.status === "PENDING_CREATION") {
            product.status = "APPROVED";
            await product.save();
        } else if (product.status === "PENDING_UPDATE") {
            const edits = product.pendingEdits;
            if (edits.title) product.title = edits.title;
            if (edits.description) product.description = edits.description;
            if (edits.price) product.price = edits.price;
            if (edits.stock !== undefined) product.stock = edits.stock;
            if (edits.category) product.category = edits.category;
            if (edits.image) product.image = edits.image;

            product.pendingEdits = undefined;
            product.status = "APPROVED";
            await product.save();
        } else if (product.status === "PENDING_DELETION") {
            if (product.image && fs.existsSync(product.image)) {
                try { fs.unlinkSync(product.image); } catch (_) { }
            }
            await Product.findByIdAndDelete(id);
            return res.status(200).json({ success: true, message: "Deletion approved. Product removed." });
        }

        await Notification.create({
            recipient: product.seller,
            title: "Product Approved",
            message: `Your product "${product.title}" is now live!`,
            type: "INFO",
        });

        return res.status(200).json({ success: true, message: "Product approved!", data: product });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Server error" });
    }
};

// ========================================================
// 11. REJECT PRODUCT REQUEST
// ========================================================
export const rejectProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;

        const product = await Product.findById(id);
        if (!product) return res.status(404).json({ success: false, message: "Product not found" });

        if (product.status === "PENDING_UPDATE") {
            product.pendingEdits = undefined;
            product.status = "APPROVED";
        } else {
            product.status = "REJECTED";
        }

        product.rejectionReason = reason || "Does not meet store guidelines";
        await product.save();

        await Notification.create({
            recipient: product.seller,
            title: "Product Rejected",
            message: `Your product request for "${product.title}" was rejected: ${product.rejectionReason}`,
            type: "WARNING",
        });

        return res.status(200).json({ success: true, message: "Product rejected", data: product });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Server error" });
    }
};


export const getPendingOrders = async (req, res) => {
    try {
        const orders = await Order.find({ orderStatus: "PAID_PENDING_APPROVAL" })
            .populate("user", "name email")
            .populate("items.product", "title price image");
        return res.status(200).json({
            success: true,
            message: "Orders retrieved successfully",
            count: orders.length,
            data: orders
        });

    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });
    }
};



export const approveOrder = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, adminNotes } = req.body; // "APPROVED" or "SHIPPED"

        const order = await Order.findById(id);
        if (!order) return res.status(404).json({ success: false, message: "Order not found" });

        order.orderStatus = status || "APPROVED";
        if (adminNotes) order.adminNotes = adminNotes;
        await order.save();

        await Notification.create({
            recipient: order.user,
            title: "Order Approved by Admin!",
            message: `Your order #${order._id} has been approved and is being prepared for shipment.`,
            type: "INFO",
        });

        return res.status(200).json({
            success: true,
            message: "Order approved successfully. Ready for fulfillment.",
            data: order,
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Server error approving order" });
    }
};
