import fs from "node:fs";
import { Product } from "../models/product.model.js";


export const requestAddProduct = async (req, res) => {
    try {
        const { title, description, price, stock, category } = req.body;
        if (!title || !description || !price || stock === undefined || !category) {
            if (req.files) req.files.forEach((f) => {
                try {
                    fs.unlinkSync(f.path);
                } catch (error) {
                    console.log(error);
                }
            });
            return res.status(400).json({
                success: false,
                message: "Missing required fields"
            });
        }
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({
                success: false,
                message: "At least one product image is required."
            });
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
            message: isCallerAdmin ? "Product published directly by Admin." : "Product submitted. Awaiting Admin approval.",
            data: product,
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            message: "Error occured while fetching products"
        })
    }
};


export const requestUpdateProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, description, price, stock, category } = req.body;
        const product = await Product.findById(id);
        if (!product) {
            if (req.files) req.files.forEach((f) => {
                try {
                    fs.unlinkSync(f.path);
                } catch (error) {
                    console.log(error);
                }
            });
            return res.status(404).json({
                success: false,
                message: "Product not found"
            });
        }
        const isCallerAdmin = req.user && req.user.role === "ADMIN";
        if (product.seller.toString() !== req.user.id && !isCallerAdmin) {
            if (req.files) req.files.forEach((f) => {
                try {
                    fs.unlinkSync(f.path);
                } catch (error) {
                    console.log(error);
                }
            });
            return res.status(403).json({
                success: false,
                message: "You are not authorized to update this product"
            });
        }
        const hasNewImages = req.files && req.files.length > 0;
        const newImagePaths = hasNewImages
            ? req.files.map((f) => f.path.replace(/\\/g, "/"))
            : null;

        // --- ADMIN DIRECT UPDATE ---
        if (isCallerAdmin) {
            if (title) product.title = title.trim();
            if (description) product.description = description.trim();
            if (price !== undefined) product.price = Number(price);
            if (stock !== undefined) product.stock = Number(stock);
            if (category) product.category = category.trim();

            // If replacement images provided, remove old files and save new
            if (hasNewImages) {
                product.images.forEach((oldPath) => {
                    if (fs.existsSync(oldPath)) try { fs.unlinkSync(oldPath); } catch (_) { }
                });
                product.images = newImagePaths;
            }

            await product.save();
            return res.status(200).json({ success: true, message: "Product updated directly by Admin", data: product });
        }

        // --- NORMAL USER UPDATE (Goes to Pending Queue) ---
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
            message: "Update submitted with changes and images. Awaiting Admin approval.",
            data: product,
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            message: "Error occured while fetching products"
        })
    }
};