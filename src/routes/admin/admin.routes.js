import { Router } from "express";
import {
    adminLogin,
    getAllUsers,
    toggleBlockUser,
    toggleBanUser,
    addProduct,
    updateProduct,
    getProducts,
    deleteProduct,
    getPendingProducts,
    approveProduct,
    rejectProduct,
} from "../../controllers/admin/admin.controller.js";
import { requireAdmin } from "../../middlewares/admin.middleware.js";
import { uploadProductImages } from "../../middlewares/productUpload.middleware.js";

const router = Router();

// Public Admin Login
router.post("/login", adminLogin);

// 🛡️ Protected Admin Routes
router.use(requireAdmin);

// User Management
router.get("/users", getAllUsers);
router.patch("/users/:id/block", toggleBlockUser);
router.patch("/users/:id/ban", toggleBanUser);

// 🌟 Products Management (Uses uploadProductImages directly - NO .single()!)
router.post("/products", uploadProductImages, addProduct);
router.put("/products/:id", uploadProductImages, updateProduct);
router.get("/products", getProducts);
router.delete("/products/:id", deleteProduct);

// Approvals Queue
router.get("/products/pending", getPendingProducts);
router.patch("/products/:id/approve", approveProduct);
router.patch("/products/:id/reject", rejectProduct);

export default router;