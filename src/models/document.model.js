import mongoose from 'mongoose';


const documentChunkSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: true
        },
        content: {
            type: String,
            required: true
        },
        embedding: {
            type: [Number],
            required: true
        },
    },
    { timestamps: true }
);

export const DocumentChunk = mongoose.model("DocumentChunk", documentChunkSchema);