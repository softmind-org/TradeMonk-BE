import mongoose from 'mongoose';
import dotenv from 'dotenv';
import sendcloudService from './src/services/sendcloud.service.js';

dotenv.config();

async function run() {
    try {
        console.log("=== PHASE 1: Fetching Shipping Methods ===");
        const methods = await sendcloudService.getShippingMethods('DE', 'NL', 500);
        
        // Find a standard package method that usually provides tracking (e.g. DPD, DHL, not 'unstamped letter')
        const trackedMethods = methods.filter(m => 
            m.price != null && 
            !isNaN(parseFloat(m.price)) && 
            !m.name.toLowerCase().includes("letter") &&
            !m.name.toLowerCase().includes("brief") // German for letter
        );
        
        const methodToTest = trackedMethods.length > 0 ? trackedMethods[0] : methods[0];
        
        console.log("\nSelected Method:", methodToTest?.name, "- Price:", methodToTest?.price);

        if (!methodToTest) {
            throw new Error("No valid shipping methods found to test with.");
        }

        console.log("\n=== PHASE 2: Label Generation (createParcelAndLabel) ===");
        const mockOrder = {
            orderNumber: `TEST-TM-${Date.now()}`,
            shippingMethodId: methodToTest.id.toString(),
            shippingAddress: {
                fullName: "Test User",
                address: "Keizersgracht 123",
                city: "Amsterdam",
                zipCode: "1015AA",
                country: "NL"
            }
        };

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
                console.log("- No labels returned.");
            }
        } catch (e) {
            console.error("Phase 2 Failed:", e.message);
            process.exit(1);
        }

        console.log("\n=== PHASE 3: Tracking Information ===");
        if (parcelData.parcel.tracking_number) {
            console.log(`Fetching tracking for ${parcelData.parcel.tracking_number}...`);
            try {
                const trackingData = await sendcloudService.getTracking(parcelData.parcel.tracking_number);
                console.log("Tracking Data Retrieved Successfully!");
                console.log("- Current Status:", trackingData.tracking?.status?.message || "Unknown");
            } catch (e) {
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
