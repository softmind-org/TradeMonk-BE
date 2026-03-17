import dotenv from 'dotenv';
dotenv.config();

async function testBackendSendCloudIntegration() {
    console.log("Loading environment variables...");
    
    // Dynamically import service after dotenv is configured
    const sendcloudService = (await import('./src/services/sendcloud.service.js')).default;
    
    // Mock user/seller
    const mockSeller = {
        _id: "mock_seller_123",
        fullName: "Test Seller",
        storeName: "Test Store",
        warehouseAddress: {
            addressLine1: "Keizersgracht 123",
            city: "Amsterdam",
            postalCode: "1015CJ",
            country: "NL",
            phone: "+31612345678"
        }
    };

    // Mock order
    const mockOrder = {
        _id: "mock_order_123",
        orderNumber: "TM-TEST-FINAL-1",
        shippingMethodId: "8", // Unstamped letter (No service point required)
        shippingAddress: {
            fullName: "Jane Doe",
            address: "Baker Street 10",
            city: "Amsterdam",
            zipCode: "1012AB",
            country: "NL"
        },
        items: [
            {
                _id: "item_1",
                title: "Rare Trading Card",
                quantity: 1,
                price: 50.00
            }
        ]
    };

    try {
        console.log("Calling sendcloudService.createParcelAndLabel()...");
        console.log(`Using Shipping Method ID: ${mockOrder.shippingMethodId} (Unstamped Letter - Home Delivery)`);
        
        const result = await sendcloudService.createParcelAndLabel(mockOrder, mockSeller);
        
        console.log("\n✅ SUCCESS! Backend generated label correctly.");
        console.log("-------------------------------------------------");
        console.log(`Tracking Number: ${result.parcel.tracking_number}`);
        console.log(`Status: ${result.parcel.status.message}`);
        
        if (result.parcel.documents && result.parcel.documents.length > 0) {
            console.log(`Label Document URL: ${result.parcel.documents[0].link}`);
        }
        
        if (result.parcel.tracking_url) {
            console.log(`Public Tracking Page: ${result.parcel.tracking_url}`);
        }
        console.log("-------------------------------------------------\n");
        console.log("Full SendCloud Response available, integration is 100% working.");
        
    } catch (error) {
        console.error("\n❌ ERROR IN BACKEND SERVICE:");
        console.error(error.message);
    }
}

testBackendSendCloudIntegration();
