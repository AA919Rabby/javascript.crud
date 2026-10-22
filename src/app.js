import express from "express";
import cors from "cors";
import helmet from "helmet";
import path from "node:path";
import orderRoutes from "./routes/order.routes.js";
import authRoutes from "./routes/auth.routes.js";
import blogRoutes from "./routes/blog.routes.js";
import userRoutes from "./routes/user.routes.js";
import adminRoutes from "./routes/admin/admin.routes.js";
import aiRoutes from "./routes/ai.routes.js";
import productRoutes from "./routes/product.routes.js";

const app = express();

app.use(helmet());
app.use(cors({ origin: "*" }));
app.use(express.json({ limit: "15mb" }));

// Static uploads
app.use("/uploads", express.static(path.resolve("./uploads")));

// Health check
app.get("/health", (_req, res) => res.json({ status: "OK" }));

// Version 1 Routes
app.use("/v1/api/auth", authRoutes);
app.use("/v1/api/blogs", blogRoutes);
app.use("/v1/api/users", userRoutes);
app.use("/v1/api/admin", adminRoutes); // 🌟 Combines with /login to make /v1/api/admin/login
app.use("/v1/api/ai", aiRoutes);
app.use("/v1/api/products", productRoutes);
app.use("/v1/api/orders", orderRoutes); //Order routes

export default app;