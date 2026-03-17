import mongoose from 'mongoose';
import dotenv from 'dotenv';
import sendcloudService from './src/services/sendcloud.service.js';

dotenv.config();

async function run() {
    try {
        console.log("=== PHASE 1: Fetching Shipping Methods ===");
        const methods = await sendcloudService.getShippingMethods('DE', 'NL', 500);
        console.log(`Found ${methods.length} methods. Selecting the cheapest one...`);
        
        const validMethods = methods.filter(m => m.price != null && !isNaN(parseFloat(m.price)));
        const cheapestPrice = Math.min(...validMethods.map(m => parseFloat(m.price)));
        const cheapestMethod = validMethods.find(m => parseFloat(m.price) === cheapestPrice);
        
        console.log("\nSelected Method:", cheapestMethod?.name);

        if (!cheapestMethod) {
            throw new Error("No valid shipping methods found to test with.");
        }

        console.log("\n=== PHASE 2: Label Generation (createParcelAndLabel) ===");
        // Mock order document to match what createParcelAndLabel expects
        const mockOrder = {
            orderNumber: `TEST-TM-${Date.now()}`,
            shippingMethodId: cheapestMethod.id.toString(),
            shippingAddress: {
                fullName: "Test User",
                address: "Keizersgracht 123",
                city: "Amsterdam",
                zipCode: "1015AA",
                country: "NL"
            }
        };

        console.log("Creating parcel with mock order...");
        let parcelData;
        try {
            parcelData = await sendcloudService.createParcelAndLabel(mockOrder);
            console.log("Parcel Created Successfully!");
            console.log("- Parcel ID:", parcelData.parcel.id);
            console.log("- Tracking Number:", parcelData.parcel.tracking_number);
            console.log("- Tracking URL:", parcelData.parcel.tracking_url);
            
            if (parcelData.parcel.label) {
                console.log("- Labels available:", Object.keys(parcelData.parcel.label));
            } else {
                console.log("- No labels returned (might require payment method setup in Sendcloud dashboard)");
            }
        } catch (e) {
            console.error("Phase 2 Failed:", e.message);
            console.error("This commonly happens if the Sendcloud account does not have a valid payment method, sender address, or carrier enabled.");
            process.exit(1);
        }

        console.log("\n=== PHASE 3: Tracking Information ===");
        if (parcelData.parcel.tracking_number) {
            console.log(`Fetching tracking for ${parcelData.parcel.tracking_number}...`);
            try {
                const trackingData = await sendcloudService.getTracking(parcelData.parcel.tracking_number);
                console.log("Tracking Data Retrieved Successfully!");
                // console.log(JSON.stringify(trackingData, null, 2));
            } catch (e) {
                // Tracking might not be immediately available right after creation
                console.error("Phase 3 Failed (Tracking API):", e.message);
            }
        } else {
            console.log("Skipping Phase 3 since no tracking number was generated.");
        }

        console.log("\n=== END-TO-END TEST COMPLETE ===");
    } catch (e) {
        console.error("Test execution error:", e.message);
    } finally {
        process.exit(0);
    }
}

run();
