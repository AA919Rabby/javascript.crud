import { Router } from "express";
import {
    getApprovedProducts,
    getProductDetails,
    requestAddProduct,
    requestUpdateProduct,
    requestDeleteProduct,
} from "../controllers/product.controller.js";
import { protect } from "../middlewares/auth.middleware.js";
import { uploadProductImages } from "../middlewares/productUpload.middleware.js";

const router = Router();

// Public Store Routes
router.get("/", getApprovedProducts);
router.get("/:id", getProductDetails); // 🌟 Single Product Details API

// Authenticated Seller  Routes (Require Admin Approval)
router.post("/", protect, uploadProductImages, requestAddProduct);
router.put("/:id", protect, uploadProductImages, requestUpdateProduct);
router.delete("/:id", protect, requestDeleteProduct);

export default router;