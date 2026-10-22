import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';


export const connectDB = async () => {
    try {
        const uri = process.env.MONGO_URI;
        if (!uri) {
            throw new Error("No Mongo URI found");
        }
        const conn = await mongoose.connect(uri, {
            serverSelectionTimeoutMS: 5000,
        });
        console.log("=======================");
        console.log("Connected to MongoDB");
        console.log("=======================");
    } catch (e) {
        console.log(e);
        process.exit(1);
    }
};