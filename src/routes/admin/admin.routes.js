import { Router } from "express";
import {
    getPendingOrders,
    approveOrder
} from "../../controllers/admin/admin.controller.js";
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
import { uploadProductImage } from "../../middlewares/productUpload.middleware.js";

const router = Router();

// 🌟 MUST BE "/login", NOT "/admin/login":
router.post("/login", adminLogin);

// Protected Admin Routes (Require Bearer adminToken)
router.use(requireAdmin);

router.get("/users", getAllUsers);
router.patch("/users/:id/block", toggleBlockUser);
router.patch("/users/:id/ban", toggleBanUser);

// Products Management
router.post("/products", uploadProductImage.single("image"), addProduct);
router.put("/products/:id", uploadProductImage.single("image"), updateProduct);
router.get("/products", getProducts);
router.delete("/products/:id", deleteProduct);

// Approvals Queue
router.get("/products/pending", getPendingProducts);
router.patch("/products/:id/approve", approveProduct);
router.patch("/products/:id/reject", rejectProduct);

//admin orders routes
router.get("/orders/pending", getPendingOrders);
router.patch("/orders/:id/approve", approveOrder);



export default router;