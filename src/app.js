import express from "express";
import cors from "cors";
import helmet from "helmet";
import path from "node:path";

import authRoutes from "./routes/auth.routes.js";
import blogRoutes from "./routes/blog.routes.js";
import userRoutes from "./routes/user.routes.js";
import adminRoutes from "./routes/admin/admin.routes.js";
import aiRoutes from "./routes/ai.routes.js";
import productRoutes from "./routes/product.routes.js";
import orderRoutes from "./routes/order.routes.js";
import categoryRoutes from "./routes/category.routes.js";
import { autoBroadcast } from "./middlewares/autoBroadcast.middleware.js";

export const createApp = (io) => {
    const app = express();

    // 1. Security & Body Parsers
    app.use(helmet());
    app.use(cors({ origin: "*" }));
    app.use(express.json({ limit: "15mb" }));

    // 2. Static uploads folder
    app.use("/uploads", express.static(path.resolve("./uploads")));

    // 3. 🌟 INJECT `io` INTO EVERY REQUEST BEFORE ANY ROUTES RUN:
    app.use((req, _res, next) => {
        req.io = io;
        next();
    });

    // 4. 🌟 AUTOMATIC BROADCAST FOR EVERY DATABASE MUTATION (POST, PUT, DELETE):
    app.use(autoBroadcast(io));

    // Health check
    app.get("/health", (_req, res) => res.json({ status: "OK", timestamp: new Date() }));

    // 5. Version 1 Routes
    app.use("/v1/api/auth", authRoutes);
    app.use("/v1/api/blogs", blogRoutes);
    app.use("/v1/api/users", userRoutes);
    app.use("/v1/api/admin", adminRoutes);
    app.use("/v1/api/ai", aiRoutes);
    app.use("/v1/api/products", productRoutes);
    app.use("/v1/api/orders", orderRoutes);
    app.use("/v1/api/categories", categoryRoutes);

    return app;
};