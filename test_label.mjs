import mongoose from 'mongoose';
import dotenv from 'dotenv';
import axios from 'axios';
dotenv.config();

async function testShippingLabel() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const Order = (await import('./src/models/order.model.js')).default;
        const User = (await import('./src/models/user.model.js')).default;
        const sendcloudService = (await import('./src/services/sendcloud.service.js')).default;

        // Find a recent order to test with
        const order = await Order.findOne({}).sort({ createdAt: -1 });
        if (!order) {
            console.log("No orders found in database");
            process.exit(0);
        }

        console.log(`Testing with Order ID: ${order._id}, Order Number: ${order.orderNumber}`);

        // Find the seller
        const seller = await User.findById(order.sellerId);
        if (!seller) {
            console.log("Seller not found");
            process.exit(0);
        }

        console.log(`Seller: ${seller.email}`);

        // Ensure order has a shipping method ID
        if (!order.shippingMethodId) {
            console.log("Order doesn't have shippingMethodId, setting a default one (8 - Unstamped letter)");
            order.shippingMethodId = "8";
            // Set some dummy buyer details just in case
            order.shippingAddress = {
                fullName: "Jane Doe",
                address: "Baker Street 10",
                city: "Amsterdam",
                zipCode: "1012AB",
                country: "NL",
                phone: "+31612345678"
            };
            if (!order.items || order.items.length === 0) {
                 order.items = [{ title: "Test Product", quantity: 1, price: 10 }];
            }
            await order.save();
        }

        console.log("Calling sendcloudService.createParcelAndLabel...");
        const result = await sendcloudService.createParcelAndLabel(order, seller);
        
        console.log("SUCCESS! SendCloud Response:");
        console.log(JSON.stringify(result, null, 2));
        
        await mongoose.disconnect();
        process.exit(0);

    } catch (error) {
        console.error("ERROR:");
        console.error(error.message);
        if (error.response) {
            console.error(JSON.stringify(error.response.data, null, 2));
        }
        await mongoose.disconnect();
        process.exit(1);
    }
}

testShippingLabel();
