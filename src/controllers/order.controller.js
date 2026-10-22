import Stripe from "stripe";
import { Order } from "../models/order.model.js";
import { Product } from "../models/product.model.js";
import { Notification } from "../models/notification.model.js";
import { never } from "zod";




const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "Dummy key");


export const createOrderWithStripe = async (req, res) => {
    try {
        const { items, shippingAddress, paymentMethodId } = req.body;
        if (!items || items.length === 0) {
            return res.status(400).json({
                success: false,
                message: "No items in order"
            });
        }
        let totalAmount = 0;
        const verifiedItems = [];
        for (const item of items) {
            const product = await Product.findById(item.productId);
            if (!product || product.status !== "APPROVED") {
                return res.status(404).json({
                    success: false,
                    message: `Product not found: ${item.productId}`
                });
            }
            if (product.stock < item.quantity) {
                return res.status(400).json({
                    success: false,
                    message: `Not enough stock for product ${product.title}`
                });
            }
            totalAount += product.price * item.quantity;
            verifiedItems.push({
                product: product._Id,
                quantity: item.quantity,
                price: product.price
            });
        }
        const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(totalAmount * 100),
            currency: "usd",
            payment_method: paymentMethodId,
            confirm: true,
            automatic_payment_methods: { enabled: true, allow_redirects: never }
        });
        if (paymentIntent.status !== "succeeded") {
            return res.status(400).json({
                success: false,
                message: "Pament failed to authorize"
            });
        }
        for (const item of verifiedItems) {
            await Product.findByIdAndUpdate(item.product, {
                $inc: { stock: -item.quantity }
            });
        }
        const order = await Order.create({
            user: req.user.id,
            items: verifiedItems,
            totalAmount,
            shippingAddress,
            stripePaymentIntentId: paymentIntent.id,
            isPaid: true,
            paidAt: new Date(),
            orderStatus: "PAID_PENDING_APPROVAL"
        });
        await Notification.create({
            recipient: req.user.id,
            title: "Order placed successfully",
            message: `Your payment of $${totalAmount} was processed. Waiting for Admin configuration.`
        });
        return res.status(200).json({
            success: true,
            message: "Order placed successfully. Waiting for Admin configuration.",
            order
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });
    }
};



export const cancelOrder = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        if (!order) {
            return res.status(404).json({
                success: false,
                message: "Order not found"
            });
        }
        isAdmin = req.user && req.user.role === "ADMIN";
        if (order.user.toString() !== req.user.id && !isAdmin) {
            return res.status(403).json({
                success: false,
                message: "You are not authorized to cancel this order"
            });
        }
        if (order.orderStatus === "SHIPPED" || order.orderStatus === "DELIVERED") {
            return res.status(400).json({
                success: false,
                message: "Order already shipped"
            });
        }
        if (order.orderStatus === "CANCELLED" || order.order.orderStatus === "REFUNDED") {
            return res.status(400).json({
                success: false,
                message: "Order already cancelled"
            });
        }
        if (order.stripePaymentIntentId) {
            await stripe.refunds.create({
                payment_intent: order.stripePaymentIntentId,
            });
            order.orderStatus = "REFUNDED";
        } else {
            order.orderStatus = "CANCELLED";
        }
        for (const item of order.items) {
            await Product.findByIdAndUpdate(item.product, {
                $inc: { stock: item.quantity }
            });
            await order.save();
            await Notification.create({
                recipient: order.user,
                title: "Order cancelled & refunded",
                message: `Your order #${order._id} was cancelled. Full refund of $${order.totalAmount} has been issued.`,
                type: "ALERT",
            });
        }
        return res.status(200).json({
            success: true,
            message: "Order cancelled & refunded",
            data: order
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });
    }
};



export const reOrder = async (req, res) => {
    try {
        const pastOrder = await Order.findById(req.params.id);
        if (!pastOrder) {
            return res.status(404).json({
                success: false,
                message: "Order not found"
            });
        }
        if (!pastOrder.user.toString() !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: "You are not authorized to cancel this order"
            });
        }
        const reorderPayload = {
            items: pastOrder.items.map((i) => ({ productId: i.product, quantity: i.quantity })),
            shippingAddress: pastOrder.shippingAddress,
        };
        return res.status(200).json({
            success: true,
            message: "Order placed successfully. Waiting for Admin configuration.",
            order: reorderPayload
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });
    }
};


export const getMyOrders = async (req, res) => {
    try {
        const orders = await Order.find({
            user: req.user.id
        })
            .populate("items.product", "title image price")
            .sort({ createdAt: -1 });
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