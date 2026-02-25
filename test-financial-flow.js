import mongoose from 'mongoose';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';

dotenv.config();

const API_URL = 'http://localhost:5000/api/v1';

async function runTest() {
    try {
        console.log("--- Starting Financial Flow Test ---");

        // 1. Connect to DB to find a test user and product
        await mongoose.connect(process.env.MONGO_URI);
        const db = mongoose.connection.db;

        const buyer = await db.collection('users').findOne({ role: 'buyer' });
        const product = await db.collection('products').findOne({});

        if (!buyer || !product) {
            console.error("Missing test data");
            process.exit(1);
        }

        const token = jwt.sign({ id: buyer._id }, process.env.JWT_SECRET, { expiresIn: '1h' });

        // Save token to DB to pass the single-session auth.middleware check
        await db.collection('users').updateOne(
            { _id: buyer._id },
            { $set: { accessToken: token } }
        );

        console.log(`Testing with Buyer: ${buyer.email}`);
        console.log(`Product: ${product.title} (Price: €${product.price})`);

        // 2. Clear existing cart
        await db.collection('carts').deleteMany({ userId: buyer._id });

        // 3. Add to Cart
        await db.collection('carts').insertOne({
            userId: buyer._id,
            productId: product._id,
            quantity: 1,
            addedAt: new Date()
        });

        // 4. Create Payment Intent
        console.log("\nCalling /payments/create-intent...");
        const response = await fetch(`${API_URL}/payments/create-intent`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({})
        });

        const data = await response.json();

        if (!response.ok) {
            console.error("API returned error:", data);
            process.exit(1);
        }

        console.log("\n--- Payment Intent Response ---");
        console.dir(data.breakdown, { depth: null });

        // 5. Verify Math
        const expectedItemsTotal = product.price * 1;
        const expectedShipping = 1 * 15.00; // 1 seller
        const expectedBuyerTotal = expectedItemsTotal + expectedShipping;
        const expectedStripeFee = parseFloat((expectedBuyerTotal * 0.032).toFixed(2));
        const expectedPlatformFee = parseFloat((expectedItemsTotal * 0.035).toFixed(2));
        const expectedSellerNet = parseFloat((expectedItemsTotal + expectedShipping - expectedPlatformFee - expectedStripeFee).toFixed(2));

        console.log("\n--- Math Verification ---");
        let passed = true;

        const check = (name, actual, expected) => {
            const match = Math.abs(actual - expected) < 0.01;
            console.log(`${match ? '✅' : '❌'} ${name} | Actual: ${actual} | Expected: ${expected}`);
            if (!match) passed = false;
        };

        check('Items Total', data.breakdown.itemsTotal, expectedItemsTotal);
        check('Shipping Total', data.breakdown.shippingTotal, expectedShipping);
        check('Buyer Total', data.breakdown.buyerTotal, expectedBuyerTotal);
        check('Stripe Fee (~3.2%)', data.breakdown.stripeFee, expectedStripeFee);
        check('TradeMonk Fee (3.5% of Item)', data.breakdown.platformFee, expectedPlatformFee);
        check('Seller Net', data.breakdown.sellerNet, expectedSellerNet);

        if (passed) {
            console.log("\n✅ ALL FINANCIAL MATH IS CORRECT!");
        } else {
            console.log("\n❌ MATH MISMATCH DETECTED!");
        }

        // 6. Test Order Creation
        console.log("\nCalling /orders to create the order...");
        const orderResponse = await fetch(`${API_URL}/orders`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                items: [{
                    productId: product._id,
                    title: product.title,
                    price: product.price,
                    image: product.images[0],
                    quantity: 1
                }],
                totalAmount: expectedBuyerTotal,
                sellerId: product.seller.userId,
                feeBreakdown: {
                    itemsTotal: expectedItemsTotal,
                    shippingFee: expectedShipping,
                    stripeFee: expectedStripeFee,
                    platformFee: expectedPlatformFee,
                    sellerNet: expectedSellerNet
                },
                shippingAddress: {
                    fullName: "Test Buyer",
                    address: "123 Main St",
                    city: "Amsterdam",
                    zipCode: "1011"
                },
                paymentIntentId: data.paymentIntentId || "pi_test_123"
            })
        });

        const orderData = await orderResponse.json();
        if (orderResponse.ok) {
            console.log('✅ Order created successfully!');
            console.log('Order Details:', {
                orderNumber: orderData.data.orderNumber,
                feeBreakdown: orderData.data.feeBreakdown
            });
        } else {
            console.error('❌ Failed to create order:', orderData);
        }

    } catch (err) {
        console.error("Test failed:", err);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
}

runTest();
