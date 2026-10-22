import mongoose from "mongoose";


const notificationSchema = new mongoose.Schema(
    {
        recepient: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        title: {
            type: String,
            required: true
        },
        message: {
            type: String,
            required: true
        },
        type: {
            type: String,
            enum: ["INFO", "SUCCESS", "WARNING", "ALERT"],
            default: "INFO"
        },
        isRead: {
            type: Boolean,
            default: false
        },
    },
    { timestamps: true }
);

export const Notification = mongoose.model("Notification", notificationSchema);