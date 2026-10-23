import { Router } from "express";
import {
    getAllCategories,
    createCategory,
    updateCategory,
    deleteCategory
} from "../controllers/category.controller.js";
import { requireAdmin } from "../middlewares/admin.middleware.js";
import { uploadCategoryImage } from "../middlewares/productUpload.middleware.js";

const router = Router();

router.get("/", getAllCategories);
router.post("/", requireAdmin, uploadCategoryImage, createCategory);
router.put("/:id", requireAdmin, uploadCategoryImage, updateCategory);
router.delete("/:id", requireAdmin, deleteCategory);

export default router;