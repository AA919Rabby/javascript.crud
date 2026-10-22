import { Router } from "express";
import {
    createOrderWithStripe,
    cancelOrder,
    reOrder,
    getMyOrders
} from "../controllers/order.controller.js";
import { protect } from "../middlewares/auth.middleware.js";


const router = Router();
router.use(protect);

router.post("/checkout", createOrderWithStripe);
router.post("/:id/cancel", cancelOrder);
router.get("/:id/reorder", reOrder);
router.get("/my-orders", getMyOrders);

export default router;