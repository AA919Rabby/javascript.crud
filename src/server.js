import dotenv from "dotenv";
dotenv.config();

import http from "node:http";
import { Server as SocketIOServer } from "socket.io";
import app from "./app.js";
import { connectDB } from "./config/db.js";

const PORT = process.env.PORT || 5000;

// 1. Create standard Node HTTP server wrapping our Express app
const httpServer = http.createServer(app);

// 2. Initialize Socket.IO Server on the same HTTP instance
const io = new SocketIOServer(httpServer, {
    cors: {
        origin: "*", // Adjust for your frontend client in production
        methods: ["GET", "POST"],
    },
});

// 3. Inject the `io` instance into every Express request so controllers can emit events!
app.use((req, _res, next) => {
    req.io = io;
    next();
});

// 4. WebSocket Event Listeners
io.on("connection", (socket) => {
    console.log(`⚡ [WebSocket] Client Connected! Socket ID: ${socket.id}`);

    // Custom event listener: Client sends a message
    socket.on("client_message", (data) => {
        console.log(`📩 Message from ${socket.id}:`, data);
        // Broadcast message to everyone connected
        io.emit("server_broadcast", {
            from: socket.id,
            text: data,
            time: new Date(),
        });
    });

    socket.on("disconnect", () => {
        console.log(`🔌 [WebSocket] Client Disconnected: ${socket.id}`);
    });
});

// 5. Connect to MongoDB Atlas first, then start the HTTP + WebSocket server
connectDB().then(() => {
    httpServer.listen(PORT, () => {
        console.log(`====================================================`);
        console.log(`🚀 Production Server running on http://localhost:${PORT}`);
        console.log(`⚡ WebSocket Server active on ws://localhost:${PORT}`);
        console.log(`====================================================`);
    });
});