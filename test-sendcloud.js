import mongoose from 'mongoose';
import dotenv from 'dotenv';
import sendcloudService from './src/services/sendcloud.service.js';

dotenv.config();

async function run() {
    try {
        console.log("Calling SendCloud...");
        const methods = await sendcloudService.getShippingMethods('DE', 'NL', 500);
        console.log("Result:", JSON.stringify(methods, null, 2));
    } catch (e) {
        console.error("Error:", e.message);
    }
}
run();
