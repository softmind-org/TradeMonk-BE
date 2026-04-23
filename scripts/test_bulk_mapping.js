
import Product from '../src/models/product.model.js';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

/**
 * DRY RUN TEST SCRIPT
 * This simulates the bulk controller logic to verify mapping
 */
const testMapping = async () => {
    console.log('🧪 Starting Bulk Mapping Test...');

    const mockRow = {
        title: ' Test Card ',
        collectionName: 'Test Set',
        gameSystem: 'Pokémon',
        price: '99.99',
        condition: 'mint',
        quantity: '5',
        imageUrl: 'https://front.com/img.png',
        backImageUrl: '', // Empty to test fallback
        imageFilename: 'front.jpg',
        backImageFilename: '' // Empty to test fallback
    };

    const sellerInfo = {
        userId: new mongoose.Types.ObjectId(),
        name: 'Test Seller'
    };

    try {
        // Simulating the controller logic exactly
        const productData = {
            title: mockRow.title?.trim(),
            collectionName: mockRow.collectionName?.trim(),
            gameSystem: mockRow.gameSystem?.trim(),
            price: parseFloat(mockRow.price),
            condition: mockRow.condition?.trim()?.toUpperCase(),
            quantity: parseInt(mockRow.quantity) || 1,
            status: 'active',
            seller: sellerInfo
        };

        // Image mapping (Front and Back with Fallback)
        if (mockRow.imageUrl) {
            productData.images = [mockRow.imageUrl.trim()];
        }
        productData.backImage = mockRow.backImageUrl?.trim() || (mockRow.imageUrl?.trim() || '');

        // Filename mapping for later sync
        if (mockRow.imageFilename || mockRow.backImageFilename) {
            productData.metadata = { 
                imageFilename: mockRow.imageFilename?.trim() || '',
                backImageFilename: mockRow.backImageFilename?.trim() || (mockRow.imageFilename?.trim() || '')
            };
        }

        console.log('✅ Final Mapped Object:', JSON.stringify(productData, null, 2));

        // Verification checks
        if (productData.backImage === productData.images[0]) {
            console.log('✅ PASS: Back image correctly fell back to front image.');
        } else {
            console.log('❌ FAIL: Back image fallback failed.');
        }

        if (productData.metadata.backImageFilename === productData.metadata.imageFilename) {
            console.log('✅ PASS: Back filename correctly fell back to front filename.');
        }

        console.log('\n🚀 TEST COMPLETE');
    } catch (err) {
        console.error('❌ MAPPING ERROR:', err);
    }
};

testMapping();
