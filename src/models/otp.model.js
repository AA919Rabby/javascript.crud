import mongoose from "mongoose";


const otpSchema = new mongoose.Schema(
    {
        email: {
            type: String,
            required: true,
            lowercase: true,
            trim: true,
        },
        otpHash: {
            type: String,
            required: true,
        },
        purpose: {
            type: String,
            enum: ["REGISTRATION", "PASSWORD-RESET"],
            required: true,
        },
        tempData: {
            name: String,
            passwordHash: String,
        },
        createdAt: {
            type: Date,
            default: Date.now,
            expires: 600
        },
    },
    { timestamps: false }
);
export const OTP = mongoose.model("OTP", otpSchema);