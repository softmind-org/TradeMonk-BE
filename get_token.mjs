import mongoose from 'mongoose';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
dotenv.config();

async function generateTestToken() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const User = (await import('./src/models/user.model.js')).default;
        
        // Find admin user
        const admin = await User.findOne({ role: 'admin' });
        if (!admin) {
            console.log("No admin found");
            process.exit(1);
        }
        
        // Use the same token generation logic as auth.controller.js
        const token = jwt.sign({ id: admin._id }, process.env.JWT_SECRET, {
            expiresIn: '30d'
        });
        
        // Find an order to test with
        const Order = (await import('./src/models/order.model.js')).default;
        const order = await Order.findOne({ status: { $in: ['processing', 'pending'] } }).sort({ createdAt: -1 });
        
        console.log(`export TOKEN="${token}"`);
        if (order) {
            console.log(`export ORDER_ID="${order._id}"`);
        } else {
            console.log("No pending/processing orders found");
        }
        
    } catch (error) {
         console.error(error.message);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
}

generateTestToken();
