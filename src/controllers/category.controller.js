import fs from "node:fs";
import { Category } from "../models/category.model.js";

// 1. PUBLIC: GET ALL CATEGORIES
export const getAllCategories = async (_req, res) => {
    try {
        const categories = await Category.find().sort({ name: 1 });
        return res.status(200).json({
            success: true,
            count: categories.length,
            data: categories,
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Error fetching categories" });
    }
};

// 2. 🛡️ ADMIN ONLY: ADD CATEGORY (Image optional)
export const createCategory = async (req, res) => {
    try {
        const { name, description } = req.body;

        if (!name || !name.trim()) {
            if (req.file) try { fs.unlinkSync(req.file.path); } catch (_) { }
            return res.status(400).json({ success: false, message: "Category name is required" });
        }

        const cleanName = name.trim();
        const exists = await Category.findOne({ name: { $regex: new RegExp(`^${cleanName}$`, "i") } });
        if (exists) {
            if (req.file) try { fs.unlinkSync(req.file.path); } catch (_) { }
            return res.status(409).json({ success: false, message: "Category already exists" });
        }

        // Optional 1 image
        const imagePath = req.file ? req.file.path.replace(/\\/g, "/") : "";

        const category = await Category.create({
            name: cleanName,
            description: description ? description.trim() : "",
            image: imagePath,
        });

        return res.status(201).json({
            success: true,
            message: "Category created by Admin",
            data: category,
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Error creating category" });
    }
};

// 3. 🛡️ ADMIN ONLY: UPDATE CATEGORY (Optional new image)
export const updateCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description } = req.body;

        const category = await Category.findById(id);
        if (!category) {
            if (req.file) try { fs.unlinkSync(req.file.path); } catch (_) { }
            return res.status(404).json({ success: false, message: "Category not found" });
        }

        if (name && name.trim()) category.name = name.trim();
        if (description !== undefined) category.description = description.trim();

        // If new image uploaded, replace and delete old
        if (req.file) {
            if (category.image && fs.existsSync(category.image)) {
                try { fs.unlinkSync(category.image); } catch (_) { }
            }
            category.image = req.file.path.replace(/\\/g, "/");
        }

        await category.save();

        return res.status(200).json({
            success: true,
            message: "Category updated by Admin",
            data: category,
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Error updating category" });
    }
};

// 4. 🛡️ ADMIN ONLY: DELETE CATEGORY
export const deleteCategory = async (req, res) => {
    try {
        const category = await Category.findById(req.params.id);
        if (!category) return res.status(404).json({ success: false, message: "Category not found" });

        if (category.image && fs.existsSync(category.image)) {
            try { fs.unlinkSync(category.image); } catch (_) { }
        }

        await Category.findByIdAndDelete(req.params.id);
        return res.status(200).json({ success: true, message: "Category deleted by Admin" });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Error deleting category" });
    }
};