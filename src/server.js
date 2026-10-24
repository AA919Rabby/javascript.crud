import dotenv from "dotenv";
dotenv.config();

import http from "node:http";
import { Server as SocketIOServer } from "socket.io";
import jwt from "jsonwebtoken";
import app from "./app.js";
import { connectDB } from "./config/db.js";

const PORT = process.env.PORT || 5000;

// 1. Create HTTP Server
const httpServer = http.createServer(app);

// 2. Initialize Socket.IO Server with CORS
export const io = new SocketIOServer(httpServer, {
    cors: {
        origin: "*", // In production, specify your frontend URL
        methods: ["GET", "POST"],
    },
});

// 3. Inject `io` into every Express `req` so controllers can broadcast events!
app.use((req, _res, next) => {
    req.io = io;
    next();
});

// 4. WebSocket Connection & Room Management
io.on("connection", (socket) => {
    console.log(`⚡ [WebSocket Connected]: ${socket.id}`);

    // 🌟 Authentication Event: Client joins their private room or admin room
    socket.on("authenticate", (token) => {
        try {
            const secret = process.env.JWT_SECRET || "super_secret_jwt_key_production_2026_xyz";
            const decoded = jwt.verify(token, secret);

            // Join user's private personal room
            socket.join(`user_${decoded.id}`);
            console.log(`👤 User joined private room: user_${decoded.id}`);

            // If user is Admin, join the privileged admin room!
            if (decoded.role === "ADMIN") {
                socket.join("admin_room");
                console.log(`👑 Admin joined privileged room: admin_room`);
            }

            socket.emit("authenticated", { success: true, message: "Connected to real-time updates!" });
        } catch (err) {
            socket.emit("auth_error", { message: "Invalid token for WebSocket connection" });
        }
    });

    socket.on("disconnect", () => {
        console.log(`🔌 [WebSocket Disconnected]: ${socket.id}`);
    });
});

// 5. Connect Database & Start Server
connectDB().then(() => {
    httpServer.listen(PORT, () => {
        console.log(`====================================================`);
        console.log(`🚀 Production Server running on http://localhost:${PORT}`);
        console.log(`⚡ WebSocket Server active on ws://localhost:${PORT}`);
        console.log(`====================================================`);
    });
});