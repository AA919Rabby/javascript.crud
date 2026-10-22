import nodemailer from "nodemailer";

export const sendEmail = async ({ to, subject, html, text }) => {
    try {
        let transporter;

        // Use Gmail if configured, otherwise use free Ethereal sandbox
        if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
            transporter = nodemailer.createTransport({
                service: "gmail",
                auth: {
                    user: process.env.EMAIL_USER,
                    pass: process.env.EMAIL_PASS,
                },
            });
        } else {
            const testAccount = await nodemailer.createTestAccount();
            transporter = nodemailer.createTransport({
                host: testAccount.smtp.host,
                port: testAccount.smtp.port,
                secure: testAccount.smtp.secure,
                auth: {
                    user: testAccount.user,
                    pass: testAccount.pass,
                },
            });
        }

        const mailOptions = {
            from: '"Secure Auth" <no-reply@authsystem.com>',
            to,
            subject,
            text: text || "Your verification OTP code",
            html: html || `<p>${text || "Your verification OTP code"}</p>`,
        };

        const info = await transporter.sendMail(mailOptions);

        const previewUrl = nodemailer.getTestMessageUrl(info);
        if (previewUrl) {
            console.log(`📨 [EMAIL PREVIEW URL]: ${previewUrl}`);
        }

        return info;
    } catch (error) {
        console.error("Nodemailer Sending Error:", error.message);
        throw error;
    }
};