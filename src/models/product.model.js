import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: [true, "Title is required"],
            trim: true,
        },
        description: {
            type: String,
            required: [true, "Description is required"],
            trim: true,
        },
        price: {
            type: Number,
            required: [true, "Price is required"],
            min: 0,
        },
        stock: {
            type: Number,
            required: [true, "Stock is required"],
            min: 0,
        },
        category: {
            type: String,
            required: [true, "Category is required"],
            trim: true,
        },
        // 🌟 MULTIPLE IMAGES SUPPORT (Array of image paths)
        images: {
            type: [String],
            required: [true, "At least one product image is required"],
            validate: [(arr) => arr.length > 0, "At least one product image is required"],
        },
        seller: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        status: {
            type: String,
            enum: ["APPROVED", "PENDING_CREATION", "PENDING_UPDATE", "PENDING_DELETION", "REJECTED"],
            default: "PENDING_CREATION",
        },
        rejectionReason: {
            type: String,
            default: "",
        },
        pendingEdits: {
            title: String,
            description: String,
            price: Number,
            stock: Number,
            category: String,
            images: [String],
        },
        reviews: [
            {
                user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
                comment: { type: String, required: true },
                rating: { type: Number, required: true, min: 1, max: 5 },
                createdAt: { type: Date, default: Date.now },
            },
        ],
        rating: {
            type: Number,
            default: 0,
        },
    },
    { timestamps: true }
);

productSchema.index({ title: "text", description: "text", category: "text" });

export const Product = mongoose.model("Product", productSchema);