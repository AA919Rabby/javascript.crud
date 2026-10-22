import { Blog } from "../models/blog.model.js";



export const createBlog = async (req, res) => {
    try {
        const { title, content, category } = req.body;
        if (!title || !content || !category) {
            return res.status(400).json({
                status: false,
                message: "All field is required."
            });
        }
        const newBlog = await Blog.create({
            title,
            content,
            category: category || "General",
            author: req.user.id
        });
        const populatedBlog = await newBlog.populate("author", "name email");
        if (res.io) {
            req.io.emit("new_blog_published", populatedBlog);
        }
        return res.status(201).json({
            status: true,
            message: "Blog created successfully",
            data: populatedBlog
        });
    } catch (error) {
        console.error("Create blog error:", error.message || error);
        return res.status(500).json({
            status: false,
            message: "Internal server error"
        });
    }
};



export const getBlogs = async (req, res) => {
    try {
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 6;
        const search = req.query.search ? req.query.search.trim() : "";
        const category = req.query.category ? req.query.category.trim() : "";
        const query = {};
        if (search) {
            query.$or = [
                { title: { $regex: search, $options: "i" } },
                { content: { $regex: search, $options: "i" } },
            ];
        }
        if (category) {
            query.category = { $regex: category, $options: "i" };
        }
        const skip = (page - 1) * limit;
        const [blogs, totalBlogs] = await Promise.all([
            Blog.find(query)
                .populate("author", "name email")
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            Blog.countDocuments(query)
        ]);
        const totalPages = Math.ceil(totalBlogs / limit);
        return res.status(200).json({
            status: true,
            pagination: {
                totalBlogs,
                totalPages,
                currentPage: page,
                limit,
                hasnextPage: page < totalPages,
                hasPreviousPage: page > 1,
            },
            data: blogs
        });
    } catch (error) {
        console.error("Get blogs error:", error.message || error);
        return res.status(500).json({
            status: false,
            message: "Internal server error"
        });
    }
};


export const getBlogId = async (req, res) => {
    try {
        const blog = await Blog.findById(req.params.id).populate("author", "name email");
        if (!blog) {
            return res.status(404).json({
                status: false,
                message: "Blog not found"
            });
        }
        return res.status(200).json({
            status: true,
            data: blog
        });
    } catch (error) {
        return res.status(500).json({
            status: false,
            message: "Internal server error"
        });
    }
};


export const updateBlog = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, content, category } = req.body;
        const blog = await Blog.findById(id);
        if (!blog) {
            return res.status(404).json({
                status: false,
                message: "Blog not found"
            });
        }
        if (blog.author.toString() !== req.user.id) {
            return res.status(403).json({
                status: false,
                message: "You are not authorized to update this blog post",
            });
        }
        if (title) blog.title = title;
        if (content) blog.content = content;
        if (category) blog.category = category;
        const updatedBlog = await blog.save();
        return res.status(200).json({
            status: true,
            message: "Blog updated successfully",
            data: updatedBlog
        });
    } catch (error) {
        console.error("Update blog error:", error.message || error);
        return res.status(500).json({
            status: false,
            message: "Internal server error"
        });
    }
};


export const deleteBlog = async (req, res) => {
    try {
        const { id } = req.params;
        const blog = await Blog.findById(id);
        if (!blog) {
            return res.status(404).json({
                status: false,
                message: "Blog not found"
            });
        }
        if (blog.author.toString() !== req.user.id) {
            return res.status(403).json({
                status: false,
                message: "You are not authorized to delete this blog post"
            });
        }
        await Blog.findByIdAndDelete(id);
        return res.status(200).json({
            status: true,
            message: "Blog deleted successfully"
        });
    } catch (error) {
        console.error("Delete blog error", error.message || error);
        return res.status(500).json({
            status: false,
            message: "Internal server error"
        });
    }
};