import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, "Name is required"],
            trim: true,
        },
        email: {
            type: String,
            required: [true, "Email is required"],
            unique: true,
            trim: true,
            lowercase: true,
        },
        password: {
            type: String,
            required: [true, "Password is required"],
        },
        avatar: {
            type: String,
            default: ""
        },
        role: {
            type: String,
            enum: ["ADMIN", "USER"],
            default: "USER"
        },
        isBanned: {
            type: Boolean,
            default: false
        },
        isBlocked: {
            type: Boolean,
            default: false
        },
        banReason: {
            type: String,
            default: ""
        },
    },
    { timeseries: true }
);

export const User = mongoose.model("User", userSchema);