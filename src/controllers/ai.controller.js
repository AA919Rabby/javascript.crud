import fs from "node:fs";
import { GoogleGenAI } from "@google/genai";
import { Product } from "../models/product.model.js";
import { DocumentChunk } from "../models/document.model.js";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Helper to convert uploaded local image to Gemini inlineData format
function fileToGenerativePart(filePath, mimeType) {
    return {
        inlineData: {
            data: Buffer.from(fs.readFileSync(filePath)).toString("base64"),
            mimeType,
        },
    };
}

// ========================================================
// 1. VISUAL PRODUCT RECOGNITION & AVAILABILITY CHECK
// User uploads an image & asks: "Is this product available?"
// ========================================================
export const checkProductByImage = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: "Please upload a product photo" });
        }

        const userPrompt = req.body.prompt || "Identify what product this is in 3 to 5 words.";
        const imagePart = fileToGenerativePart(req.file.path, req.file.mimetype);

        // Step A: Use Gemini Vision to detect and classify the product
        const visionResponse = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: [
                imagePart,
                `Identify the physical object in this image. Give ONLY the clean product name and its category. Query: ${userPrompt}`,
            ],
        });

        const identifiedName = visionResponse.text.trim();

        // Step B: Search MongoDB inventory for matching items
        const matchingProducts = await Product.find({
            $text: { $search: identifiedName },
        }).limit(3);

        // Clean up temporary search image
        try { fs.unlinkSync(req.file.path); } catch (_) { }

        // Step C: Determine availability
        if (matchingProducts.length > 0 && matchingProducts[0].stock > 0) {
            const best = matchingProducts[0];
            return res.status(200).json({
                success: true,
                available: true,
                message: `Yes! "${best.title}" is available in our store!`,
                details: {
                    id: best._id,
                    title: best.title,
                    price: best.price,
                    stock: best.stock,
                    rating: best.rating,
                    category: best.category,
                },
            });
        }

        return res.status(200).json({
            success: true,
            available: false,
            message: `No, we do not currently have "${identifiedName}" in stock.`,
            detectedItem: identifiedName,
        });
    } catch (error) {
        console.error("AI Product Search Error:", error);
        return res.status(500).json({ success: false, message: error.message || "Vision AI failed" });
    }
};

// ========================================================
// 2. IN-APP AGENTIC ASSISTANT (Chat & Application Helper)
// Answers questions about platform features, usage, and orders
// ========================================================
export const appAssistantChat = async (req, res) => {
    try {
        const { message } = req.body;
        if (!message) {
            return res.status(400).json({ success: false, message: "Message is required" });
        }

        // Retrieve internal knowledge base / manual chunks
        const docs = await DocumentChunk.find().limit(5);
        const knowledgeBase = docs.map((d) => `${d.title}: ${d.content}`).join("\n\n");

        const systemPrompt = `
You are the dedicated AI Assistant built inside this application.
Your goal is to help users navigate the platform, explain features, and resolve questions.

Platform Knowledge Base:
"""
${knowledgeBase}
"""

User Message: "${message}"

Instructions:
- Be polite, direct, and concise.
- If the question is about how to use the app, provide step-by-step guidance.
`;

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: systemPrompt,
        });

        return res.status(200).json({
            success: true,
            reply: response.text,
        });
    } catch (error) {
        console.error("Assistant Error:", error);
        return res.status(500).json({ success: false, message: "Assistant processing error" });
    }
};