import dotenv from "dotenv";
dotenv.config();

import http from "node:http";
import express from "express";
import { Server as SocketIOServer } from "socket.io";
import jwt from "jsonwebtoken";
import { createClient } from "redis";
import { createAdapter } from "@socket.io/redis-adapter"; // Fixed typo!
import { createApp } from "./app.js";
import { connectDB } from "./config/db.js";

const PORT = process.env.PORT || 5000;

// 1. Create base HTTP Server
const tempApp = express();
const httpServer = http.createServer(tempApp);

// 2. Initialize Socket.IO Server with CORS
export const io = new SocketIOServer(httpServer, {
    cors: {
        origin: "*",
        methods: ["GET", "POST", "PUT", "DELETE"],
    },
    transports: ["websocket"],
});

// 3. 🌟 CONNECT REDIS ADAPTER (Synchronizes all 3 nodes!):
if (process.env.REDIS_URL) {
    try {
        const pubClient = createClient({ url: process.env.REDIS_URL });
        const subClient = pubClient.duplicate();

        await Promise.all([pubClient.connect(), subClient.connect()]);
        io.adapter(createAdapter(pubClient, subClient));
        console.log("⚡ [Redis Adapter]: Connected! All 3 Nodes are synchronized!");
    } catch (err) {
        console.warn("⚠️ Redis connection failed, falling back to in-memory:", err.message);
    }
}

// 4. Build Express App with `io` injected:
const app = createApp(io);
httpServer.on("request", app);

// 5. WebSocket Connection & Room Management
io.on("connection", (socket) => {
    console.log(`⚡ [WebSocket Connected on Node ${process.env.NODE_APP_INSTANCE || 0}]: ${socket.id}`);

    socket.on("authenticate", (token) => {
        try {
            const secret = process.env.JWT_SECRET || "super_secret_jwt_key_production_2026_xyz";
            const decoded = jwt.verify(token, secret);

            socket.join(`user_${decoded.id}`);
            if (decoded.role === "ADMIN") {
                socket.join("admin_room");
            }

            socket.emit("authenticated", { success: true, message: "Connected to real-time cluster!" });
        } catch (err) {
            socket.emit("auth_error", { message: "Invalid or expired token" });
        }
    });

    socket.on("disconnect", () => {
        console.log(`🔌 [Socket Disconnected]: ${socket.id}`);
    });
});

// 6. Connect Database & Start Server
connectDB().then(() => {
    httpServer.listen(PORT, () => {
        console.log(`====================================================`);
        console.log(`🚀 Node.js Worker #${process.env.NODE_APP_INSTANCE || 0} running on port ${PORT}`);
        console.log(`⚡ WebSocket active on ws://localhost:${PORT}`);
        console.log(`====================================================`);
    });
});