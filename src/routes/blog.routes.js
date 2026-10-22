import { Router } from "express";
import { protect } from "../middlewares/auth.middleware.js";
import {
    createBlog,
    getBlogs,
    getBlogId,
    updateBlog,
    deleteBlog
} from "../controllers/blog.controller.js";
import { validate, createBlogSchema } from "../middlewares/validate.middleware.js";


const router = Router();

router.get("/", getBlogs);
router.get("/:id", getBlogId);

router.post("/", protect, validate(createBlogSchema), createBlog);
router.put("/:id", protect, updateBlog);
router.delete("/:id", protect, deleteBlog);


export default router;
