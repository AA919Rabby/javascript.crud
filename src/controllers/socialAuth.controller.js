import { OAuth2Client } from "google-auth-library";
import jwt from "jsonwebtoken";
import jwksClient from "jwks-rsa";
import { User } from "../models/user.model.js";

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Apple JWKS Client to fetch Apple's public verification keys
const appleClient = jwksClient({
    jwksUri: "https://appleid.apple.com/auth/keys",
});

function getAppleKey(header, callback) {
    appleClient.getSigningKey(header.kid, (err, key) => {
        if (err) return callback(err);
        const signingKey = key.getPublicKey();
        callback(null, signingKey);
    });
}

// Helper: Generates your platform's standard JWT session token
const issueJwtSession = (user) => {
    const secret = process.env.JWT_SECRET || "super_secret_jwt_key_production_2026_xyz";
    return jwt.sign(
        { id: user._id, email: user.email, role: user.role },
        secret,
        { expiresIn: "7d" }
    );
};

// ========================================================
// 1. GOOGLE SIGN-IN (POST /v1/api/auth/google)
// ========================================================
export const googleSignIn = async (req, res) => {
    try {
        const { idToken } = req.body;

        if (!idToken) {
            return res.status(400).json({ success: false, message: "Google idToken is required" });
        }

        // Step A: Verify the token with Google
        const ticket = await googleClient.verifyIdToken({
            idToken,
            audience: process.env.GOOGLE_CLIENT_ID,
        });

        const payload = ticket.getPayload();
        if (!payload || !payload.email_verified) {
            return res.status(400).json({ success: false, message: "Google account email is not verified" });
        }

        const { sub: googleId, email, name, picture } = payload;
        const cleanEmail = email.toLowerCase().trim();

        // Step B: Find or Create User
        let user = await User.findOne({ email: cleanEmail });

        if (user) {
            if (user.isBanned || user.isBlocked) {
                return res.status(403).json({ success: false, message: "Your account is deactivated or banned" });
            }
            // Link Google ID if registered with local before
            if (!user.googleId) {
                user.googleId = googleId;
                if (!user.avatar && picture) user.avatar = picture;
                await user.save();
            }
        } else {
            // First-time user: automatically register
            user = await User.create({
                name: name || "Google User",
                email: cleanEmail,
                avatar: picture || "",
                authProvider: "GOOGLE",
                googleId,
            });
        }

        // Step C: Issue platform token
        const token = issueJwtSession(user);

        return res.status(200).json({
            success: true,
            message: "Google authentication successful",
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                avatar: user.avatar,
                role: user.role,
            },
        });
    } catch (error) {
        console.error("Google Auth Error:", error.message || error);
        return res.status(401).json({ success: false, message: "Invalid Google token" });
    }
};

// ========================================================
// 2. APPLE SIGN-IN (POST /v1/api/auth/apple)
// ========================================================
export const appleSignIn = async (req, res) => {
    try {
        const { identityToken, user: appleUserData } = req.body;

        if (!identityToken) {
            return res.status(400).json({ success: false, message: "Apple identityToken is required" });
        }

        // Step A: Cryptographically verify Apple's identityToken
        const decodedToken = await new Promise((resolve, reject) => {
            jwt.verify(
                identityToken,
                getAppleKey,
                {
                    algorithms: ["RS256"],
                    issuer: "https://appleid.apple.com",
                    audience: process.env.APPLE_CLIENT_ID,
                },
                (err, decoded) => {
                    if (err) return reject(err);
                    resolve(decoded);
                }
            );
        });

        const { sub: appleId, email } = decodedToken;
        const cleanEmail = (email || `${appleId}@privaterelay.appleid.com`).toLowerCase().trim();

        // Step B: Find or Create User
        let user = await User.findOne({ email: cleanEmail });

        if (user) {
            if (user.isBanned || user.isBlocked) {
                return res.status(403).json({ success: false, message: "Your account is deactivated or banned" });
            }
            if (!user.appleId) {
                user.appleId = appleId;
                await user.save();
            }
        } else {
            // Apple only sends name on the VERY FIRST sign-in
            let fullName = "Apple User";
            if (appleUserData && appleUserData.name) {
                const { firstName, lastName } = appleUserData.name;
                fullName = `${firstName || ""} ${lastName || ""}`.trim() || "Apple User";
            }

            user = await User.create({
                name: fullName,
                email: cleanEmail,
                authProvider: "APPLE",
                appleId,
            });
        }

        // Step C: Issue platform token
        const token = issueJwtSession(user);

        return res.status(200).json({
            success: true,
            message: "Apple authentication successful",
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
            },
        });
    } catch (error) {
        console.error("Apple Auth Error:", error.message || error);
        return res.status(401).json({ success: false, message: "Invalid Apple token" });
    }
};



// import { OAuth2Client } from "google-auth-library";
// import jwt from "jsonwebtoken";
// import jwksClient from "jwks-rsa";
// import { User } from "../models/user.model.js";

// const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// const issueJwtSession = (user) => {
//     const secret = process.env.JWT_SECRET || "super_secret_jwt_key_production_2026_xyz";
//     return jwt.sign(
//         { id: user._id, email: user.email, role: user.role },
//         secret,
//         { expiresIn: "7d" }
//     );
// };

// // ========================================================
// // 1. GOOGLE SIGN-IN
// // ========================================================
// export const googleSignIn = async (req, res) => {
//     try {
//         const { idToken } = req.body;
//         if (!idToken) {
//             return res.status(400).json({ success: false, message: "idToken is required" });
//         }

//         // 🌟 DEV TESTING BYPASS (Test without Google Console credentials!)
//         if (idToken === "TEST_GOOGLE_TOKEN") {
//             let user = await User.findOne({ email: "google_tester@gmail.com" });
//             if (!user) {
//                 user = await User.create({
//                     name: "Google Test User",
//                     email: "google_tester@gmail.com",
//                     authProvider: "GOOGLE",
//                     avatar: "https://lh3.googleusercontent.com/test.png",
//                 });
//             }
//             const token = issueJwtSession(user);
//             return res.status(200).json({
//                 success: true,
//                 message: "Google sign-in successful (Dev Mode)",
//                 token,
//                 user: { id: user._id, name: user.name, email: user.email, avatar: user.avatar },
//             });
//         }

//         // Real Production Google Verification:
//         const ticket = await googleClient.verifyIdToken({
//             idToken,
//             audience: process.env.GOOGLE_CLIENT_ID,
//         });
//         const payload = ticket.getPayload();
//         const cleanEmail = payload.email.toLowerCase().trim();

//         let user = await User.findOne({ email: cleanEmail });
//         if (!user) {
//             user = await User.create({
//                 name: payload.name || "Google User",
//                 email: cleanEmail,
//                 avatar: payload.picture || "",
//                 authProvider: "GOOGLE",
//                 googleId: payload.sub,
//             });
//         }

//         const token = issueJwtSession(user);
//         return res.status(200).json({ success: true, token, user });
//     } catch (error) {
//         console.error("Google Auth Error:", error.message || error);
//         return res.status(401).json({ success: false, message: "Invalid Google token" });
//     }
// };

// // ========================================================
// // 2. APPLE SIGN-IN
// // ========================================================
// export const appleSignIn = async (req, res) => {
//     try {
//         const { identityToken } = req.body;
//         if (!identityToken) {
//             return res.status(400).json({ success: false, message: "identityToken is required" });
//         }

//         // 🌟 DEV TESTING BYPASS (Test Apple Login without paying $99 to Apple!)
//         if (identityToken === "TEST_APPLE_TOKEN") {
//             let user = await User.findOne({ email: "apple_tester@privaterelay.appleid.com" });
//             if (!user) {
//                 user = await User.create({
//                     name: "Apple Test User",
//                     email: "apple_tester@privaterelay.appleid.com",
//                     authProvider: "APPLE",
//                 });
//             }
//             const token = issueJwtSession(user);
//             return res.status(200).json({
//                 success: true,
//                 message: "Apple sign-in successful (Dev Mode)",
//                 token,
//                 user: { id: user._id, name: user.name, email: user.email },
//             });
//         }

//         // Real Production Apple Token Verification (When you have Apple Developer Account)
//         return res.status(400).json({ success: false, message: "Live Apple verification requires configured Apple Client ID" });
//     } catch (error) {
//         console.error("Apple Auth Error:", error.message || error);
//         return res.status(401).json({ success: false, message: "Invalid Apple token" });
//     }
// };
