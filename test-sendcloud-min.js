import mongoose from 'mongoose';
import dotenv from 'dotenv';
import sendcloudService from './src/services/sendcloud.service.js';

dotenv.config();

async function run() {
    try {
        console.log("Calling SendCloud...");
        const methods = await sendcloudService.getShippingMethods('DE', 'NL', 500);
        const validMethods = methods.filter(m => m.price != null && !isNaN(parseFloat(m.price)));
        const cheapest = validMethods.length > 0
            ? Math.min(...validMethods.map(m => parseFloat(m.price)))
            : 'FALLBACK';
        console.log("Cheapest:", cheapest);
        const cheapestMethod = validMethods.find(m => parseFloat(m.price) === cheapest);
        console.log("Cheapest Method:", cheapestMethod);
    } catch (e) {
        console.error("Error:", e.message);
    } finally {
        process.exit(0);
    }
}
run();
