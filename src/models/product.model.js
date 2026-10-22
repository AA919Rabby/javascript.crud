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
        },
        stock: {
            type: Number,
            required: [true, "Stock is required"],
        },
        category: {
            type: String,
            required: [true, "Category is required"],
            trim: true,
        },
        image: {
            type: String,
            required: [true, "Image is required"],
        },
        seller: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        status: {
            type: String,
            enum: ["APPROVED", "PENDING_CREATION", "PENDING_UPDATE", "PENDING_DELETION", "REJECTED"],
            default: "PENDING_CREATION",
            index: true
        },
        rejectionReason: {
            type: String,
            default: ""
        },
        pendingEdits: {
            title: String,
            description: String,
            price: Number,
            stock: Number,
            category: String,
            image: String,
        },
        reviews: [
            {
                user: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "User",
                    required: true,
                },
                comment: {
                    type: String,
                    required: true,
                    trim: true,
                },
                rating: {
                    type: Number,
                    required: true,
                    min: 1,
                    max: 5,
                },
                createdAt: {
                    type: Date,
                    default: Date.now,
                },
            },
        ],
        rating: {
            type: Number,
            default: 0,
        },
        image: {
            type: String,
            required: [true, "Image is required"],
            default: "",
        },
    },
    { timestamps: true }
);

productSchema.index({ title: "text", description: "text", category: "text" });

export const Product = mongoose.model("Product", productSchema);