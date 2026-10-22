import { z, ZodError } from "zod";



export const validate = (schema) => {
    return async (req, res, next) => {
        try {
            await schema.parseAsync({
                body: req.body,
                query: req.query,
                params: req.params,
            });
            next();
        } catch (error) {
            if (error instanceof ZodError) {
                return res.status(400).json({
                    success: false,
                    message: "Validation error",
                    errors: error.issues.map((err) => ({
                        field: err.path.slice(1).join("."),
                        message: err.message
                    }))
                });
            }
            return res.status(500).json({
                success: false,
                message: "Internal validation error"
            });
        }
    }
};



export const registerSchema = z.object({
    body: z.object({
        name: z
            .string({ required_error: "Name is required" })
            .trim()
            .min(2, "Name must be at least 2 characters"),
        email: z
            .string({ required_error: "Email is required" })
            .trim()
            .email("Invalid email address format"),
        password: z
            .string({ required_error: "Password is required" })
            .min(8, "Password must be at least 8 characters")
            .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
            .regex(/[0-9]/, "Password must contain at least one number"),
    }),
});


export const verifyOtpSchema = z.object({
    body: z.object({
        email: z
            .string({ required_error: "Email is required" })
            .trim()
            .email("Invalid email address format"),
        otp: z
            .string({ required_error: "OTP is required" })
            .trim()
    })
});


export const loginSchema = z.object({
    body: z.object({
        email: z
            .string({ required_error: "Email is required" })
            .trim()
            .email("Invalid email address format"),
        password: z
            .string({ required_error: "Password is required" })
            .min(1, "Password cannot be empty")
            .trim()
    })
});


export const forgotPasswordSchema = z.object({
    body: z.object({
        email: z
            .string({ required_error: "Email is required" })
            .trim()
            .email("Invalid email address format")
            .min(1, "Email cannot be empty")
            .trim()
    })
});


export const verifyResetOtpSchema = z.object({
    body: z.object({
        otp: z.string({ required_error: "OTP is required" }).trim(),
    })
});


export const resetPasswordSchema = z.object({
    body: z.object({
        newPassword: z
            .string({ required_error: "New Password is required" })
            .min(8, "New password must be at least 8 characters")
            .regex(/[A-Z]/, "New password must contain at least one uppercase letter")
            .regex(/[0-9]/, "New password must contain at least one number")
            .trim()
            .min(1, "New password cannot be empty")
            .trim(),
        forgotToken: z
            .string({ required_error: "ForgotToken is required" })
    })
});


export const changePasswordSchema = z.object({
    body: z.object({
        oldPassword: z
            .string({ required_error: "Old Password is required" })
            .min(1, "Old password cannot be empty"),
        newPassword: z
            .string({ required_error: "New Password is required" })
            .min(8, "New password must be at least 8 characters")
            .regex(/[A-Z]/, "New password must contain at least one uppercase letter")
            .regex(/[0-9]/, "New password must contain at least one number")
            .trim()
            .min(1, "New password cannot be empty")
            .trim()
    })
});


export const createBlogSchema = z.object({
    body: z.object({
        title: z
            .string({ required_error: "Title is required" })
            .trim()
            .min(3, "Title must be at least 3 characters")
            .max(120, "Title cannot exceed 120 characters"),
        content: z
            .string({ required_error: "Content is required" })
            .min(10, "Content must be at least 10 characters"),
        category: z
            .string({ required_error: "Category is required" })
            .trim()
            .min(1, "Category cannot be empty")
    })
});