import multer from "multer";
import path from "node:path";
import fs from "node:fs";



const productDir = "uploads/products/";
const categoryDir = "uploads/categories/";

[productDir, categoryDir].forEach((dir) => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});


const storage = multer.diskStorage({
    destination: (_req, file, cb) => {
        if (file.fieldname === "categoryImage" || file.fieldname === "image") {
            cb(null, categoryDir);
        } else {
            cb(null, productDir);
        }
    },
    filename: (_req, file, cb) => {
        const ext = path.extname(file.originalname);
        const prefix = file.fieldname.includes("cat") || file.fieldname === "image" ? "cat" : "prod";
        cb(null, `${prefix}-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
    },
});

const fileFilter = (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true)
    } else {
        cb(new Error('Only image files are allowed!'), false);
    }
};


const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter
});


export const uploadProductImages = upload.array("images", 5);
export const uploadCategoryImage = upload.single("image");