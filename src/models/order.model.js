import mongoose from "mongoose";

const orderSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        items: [
            {
                product: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "Product",
                    required: true,
                },
                quantity: { type: Number, required: true, min: 1 },
                price: { type: Number, required: true },
            },
        ],
        totalAmount: { type: Number, required: true },
        shippingAddress: {
            street: { type: String, required: true },
            city: { type: String, required: true },
            country: { type: String, required: true },
        },
        // Stripe Details
        paymentMethod: { type: String, default: "STRIPE" },
        stripePaymentIntentId: { type: String, required: true },
        isPaid: { type: Boolean, default: false },
        paidAt: { type: Date },
        // Order Status Workflow
        orderStatus: {
            type: String,
            enum: [
                "PAID_PENDING_APPROVAL", // Paid via Stripe, waiting for Admin check
                "APPROVED",              // Approved by Admin -> Ready to ship
                "SHIPPED",
                "DELIVERED",
                "CANCELLED",             // Cancelled by User/Admin (Triggers Refund)
                "REFUNDED",
            ],
            default: "PAID_PENDING_APPROVAL",
            index: true,
        },
        adminNotes: { type: String, default: "" },
    },
    { timestamps: true }
);

export const Order = mongoose.model("Order", orderSchema);