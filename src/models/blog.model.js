import mongoose from "mongoose";


const blogSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, "Title is required"],
        trim: true,
        minlength: 3,
        maxlength: 100,
    },
    content: {
        type: String,
        required: [true, "Content is required"],
        trim: true,
        minlength: 3,
    },
    category: {
        type: String,
        default: "general",
        trim: true,
    },
    author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: [true, "Author is required"],
    }
},
    { timestamps: true },
);

blogSchema.index({ title: "text", content: "text" });

export const Blog = mongoose.model("Blog", blogSchema);