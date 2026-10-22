import { Product } from "../models/product.model.js";
import { Notification } from "../models/notification.model.js";
import { success } from "zod";



export const getApprovedProducts = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const search = req.query.search ? req.query.search.trim() : "";
        const category = req.query.category ? req.query.category.trim() : "";
        const query = { status: "APPROVED" };
        if (search) {
            query.$or = [
                { title: { $regex: search, $options: "i" } },
                { description: { $regex: search, $options: "i" } },
            ]
        }
        if (category) query.category = { $regex: category, $options: "i" };
        const skip = (page - 1) * limit;
        const [products, total] = await Promise.all([
            Product.find(query)
                .populate("seller", "name avatar")
                .skip(skip)
                .limit(limit)
                .sort({ createdAt: -1 }),
            Product.countDocuments(query)
        ])
        return res.status(200).json({
            success: true,
            pagination: {
                totalProducts: total,
                totalPages: Math.ceil(total / limit),
                currentPage: page,
                limit,
            },
            data: products
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            message: "Error occured while fetching products"
        })
    }
};


export const getProductDetails = async (req, res) => {
    try {
        const product = await Product.findOne({
            _id: req.params.id,
            status: "APPROVED"
        })
            .populate("seller", "name email avatar")
            .populate("reviews.user", "name avatar");
        if (!product) {
            return res.status(404).json({
                success: false,
                message: "Product not found"
            });
        }
        return res.status(200).json({
            success: true,
            data: product
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            message: "Error occured while fetching product details"
        });
    }
};



export const requestAddProduct = async (req, res) => {
    try {
        const { title, description, price, stock, category } = req.body;
        if (!title || !description || !price || !stock || !category) {
            return res.status(400).json({
                success: false,
                message: "Please provide all the required fields"
            });
        }
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: "Please provide an image"
            });
        }
        const imagePath = req.file.path.replace(/\\/g, "/");
        const isCallerAdmin = req.user.role === "ADMIN";
        const product = await Product.create({
            title,
            description,
            price: Number(price),
            stock: Number(stock),
            category,
            image: imagePath,
            seller: req.user.id,
            status: isCallerAdmin ? "APPROVED" : "PENDING_CREATION",
        });
        return res.status(200).json({
            success: true,
            message: isCallerAdmin ?
                "Product created successfully" :
                "Product created successfully. Wait for admin approval",
            data: product
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            message: "Error occured while creating product"
        });
    }
};



export const requestUpdateProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            title,
            description,
            price,
            stock,
            category
        } = req.body;
        const product = await Product.findById(id);
        if (!product) {
            return res.status(404).json({
                success: false,
                message: "Product not found"
            });
        }
        const isCallerAdmin = req.user.role === "ADMIN";
        if (product.seller.toString() !== req.user.id && !isCallerAdmin) {
            return res.status(403).json({
                success: false,
                message: "You are not authorized to update this product"
            });
        }
        const imagePath = req.file ? req.file.path.replace(/\\/g, "/") : "undefined";
        if (isCallerAdmin) {
            if (title) product.title = title;
            if (description) product.description = description;
            if (price !== undefined) product.price = Number(price);
            if (stock !== undefined) product.stock = Number(stock);
            if (category) product.category = category;
            if (imagePath) product.image = imagePath;
            await product.save();
            return res.status(200).json({
                success: true, message: "Product updated directly by Admin",
                data: product
            });
        }
        product.status = "PENDING_UPDATE";
        product.pendingEdits = {
            title: title || product.title,
            description: description || product.description,
            price: price ? Number(price) : product.price,
            stock: stock !== undefined ? Number(stock) : product.stock,
            category: category || product.category,
            image: imagePath || product.image,
        };

        await product.save();

        return res.status(200).json({
            success: true,
            message: "Update request submitted. Changes will apply after Admin approval.",
        });

    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};


export const requestDeleteProduct = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) {
            return res.status(404).json({
                success: false,
                message: "Product not found"
            });
        }
        const isCallerAdmin = req.user.role === "ADMIN";
        if (!isCallerAdmin) {
            await Product.findOneAndDelete(req.params.id);
            return res.status(200).json({
                success: true,
                message: "Product deleted successfully"
            });
        }
        if (product.seller.toString() !== req.user.id && !isCallerAdmin) {
            return res.status(403).json({
                success: false,
                message: "You are not authorized to delete this product"
            });
        }
        product.status = "PENDING_DELETION";
        await product.save();
        return res.status(200).json({
            success: true,
            message: "Product deleted successfully"
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};