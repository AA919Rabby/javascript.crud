import fs from "node:fs";
import { Product } from "../models/product.model.js";

// ========================================================
// 1. 🌟 PUBLIC: GET ALL APPROVED PRODUCTS (Fixes the crash!)
// ========================================================
export const getApprovedProducts = async (req, res) => {
    try {
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 10;
        const search = req.query.search ? req.query.search.trim() : "";
        const category = req.query.category ? req.query.category.trim() : "";

        // Public users only see APPROVED products!
        const query = { status: "APPROVED" };

        if (search) {
            query.$or = [
                { title: { $regex: search, $options: "i" } },
                { description: { $regex: search, $options: "i" } },
            ];
        }

        if (category) {
            query.category = { $regex: category, $options: "i" };
        }

        const skip = (page - 1) * limit;

        const [products, total] = await Promise.all([
            Product.find(query)
                .populate("seller", "name avatar")
                .skip(skip)
                .limit(limit)
                .sort({ createdAt: -1 }),
            Product.countDocuments(query),
        ]);

        return res.status(200).json({
            success: true,
            pagination: {
                totalProducts: total,
                totalPages: Math.ceil(total / limit),
                currentPage: page,
                limit,
            },
            data: products,
        });
    } catch (error) {
        console.error("Get Approved Products Error:", error);
        return res.status(500).json({ success: false, message: "Server error fetching products" });
    }
};

// ========================================================
// 2. 🌟 PUBLIC: GET SINGLE PRODUCT DETAILS (By ID)
// ========================================================
export const getProductDetails = async (req, res) => {
    try {
        const product = await Product.findOne({
            _id: req.params.id,
            status: "APPROVED",
        })
            .populate("seller", "name email avatar")
            .populate("reviews.user", "name avatar");

        if (!product) {
            return res.status(404).json({ success: false, message: "Product not found or pending approval" });
        }

        return res.status(200).json({ success: true, data: product });
    } catch (error) {
        console.error("Get Product Details Error:", error);
        return res.status(500).json({ success: false, message: "Server error fetching product details" });
    }
};

// ========================================================
// 3. ADD PRODUCT: (1 to 5 images required)
// ========================================================
export const requestAddProduct = async (req, res) => {
    try {
        const { title, description, price, stock, category } = req.body;

        if (!title || !description || !price || stock === undefined || !category) {
            if (req.files) req.files.forEach((f) => { try { fs.unlinkSync(f.path); } catch (_) { } });
            return res.status(400).json({ success: false, message: "Missing required product fields" });
        }

        // 1 to 5 images check
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ success: false, message: "Upload between 1 and 5 images for the product." });
        }

        const imagePaths = req.files.map((f) => f.path.replace(/\\/g, "/"));
        const isCallerAdmin = req.user && req.user.role === "ADMIN";

        const product = await Product.create({
            title: title.trim(),
            description: description.trim(),
            price: Number(price),
            stock: Number(stock),
            category: category.trim(),
            images: imagePaths,
            seller: req.user.id,
            status: isCallerAdmin ? "APPROVED" : "PENDING_CREATION",
        });

        return res.status(201).json({
            success: true,
            message: isCallerAdmin
                ? "Product published directly by Admin."
                : "Product submitted. Awaiting Admin approval.",
            data: product,
        });
    } catch (error) {
        console.error("Add Product Error:", error);
        return res.status(500).json({ success: false, message: "Server error creating product" });
    }
};

// ========================================================
// 4. UPDATE PRODUCT: Text fields + Optional 1 to 5 replacement images
// ========================================================
export const requestUpdateProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, description, price, stock, category } = req.body;

        const product = await Product.findById(id);
        if (!product) {
            if (req.files) req.files.forEach((f) => { try { fs.unlinkSync(f.path); } catch (_) { } });
            return res.status(404).json({ success: false, message: "Product not found" });
        }

        const isCallerAdmin = req.user && req.user.role === "ADMIN";
        if (product.seller.toString() !== req.user.id && !isCallerAdmin) {
            if (req.files) req.files.forEach((f) => { try { fs.unlinkSync(f.path); } catch (_) { } });
            return res.status(403).json({ success: false, message: "Unauthorized to update this product" });
        }

        const hasNewImages = req.files && req.files.length > 0;
        const newImagePaths = hasNewImages
            ? req.files.map((f) => f.path.replace(/\\/g, "/"))
            : null;

        // --- CASE A: ADMIN DIRECT UPDATE ---
        if (isCallerAdmin) {
            if (title) product.title = title.trim();
            if (description) product.description = description.trim();
            if (price !== undefined) product.price = Number(price);
            if (stock !== undefined) product.stock = Number(stock);
            if (category) product.category = category.trim();

            if (hasNewImages) {
                product.images.forEach((oldPath) => {
                    if (fs.existsSync(oldPath)) try { fs.unlinkSync(oldPath); } catch (_) { }
                });
                product.images = newImagePaths;
            }

            await product.save();
            return res.status(200).json({
                success: true,
                message: "Product updated directly by Admin",
                data: product,
            });
        }

        // --- CASE B: NORMAL USER (Goes to Pending Queue) ---
        product.status = "PENDING_UPDATE";
        product.pendingEdits = {
            title: title ? title.trim() : product.title,
            description: description ? description.trim() : product.description,
            price: price !== undefined ? Number(price) : product.price,
            stock: stock !== undefined ? Number(stock) : product.stock,
            category: category ? category.trim() : product.category,
            images: hasNewImages ? newImagePaths : product.images,
        };

        await product.save();

        return res.status(200).json({
            success: true,
            message: "Update submitted. Awaiting Admin approval.",
            data: product,
        });
    } catch (error) {
        console.error("Update Product Error:", error);
        return res.status(500).json({ success: false, message: "Server error updating product" });
    }
};

// ========================================================
// 5. DELETE PRODUCT (User Request or Admin Direct)
// ========================================================
export const requestDeleteProduct = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) return res.status(404).json({ success: false, message: "Product not found" });

        const isCallerAdmin = req.user && req.user.role === "ADMIN";

        if (isCallerAdmin) {
            if (product.images) {
                product.images.forEach((p) => {
                    if (fs.existsSync(p)) try { fs.unlinkSync(p); } catch (_) { }
                });
            }
            await Product.findByIdAndDelete(req.params.id);
            return res.status(200).json({ success: true, message: "Product deleted permanently by Admin" });
        }

        if (product.seller.toString() !== req.user.id) {
            return res.status(403).json({ success: false, message: "Unauthorized to delete this product" });
        }

        product.status = "PENDING_DELETION";
        await product.save();

        return res.status(200).json({
            success: true,
            message: "Deletion request submitted. Awaiting Admin approval.",
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Server error deleting product" });
    }
};