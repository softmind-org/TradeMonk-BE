import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
    // Core Info
    title: { type: String, required: true, index: true }, // Text Search
    collectionName: { type: String, required: true },     // e.g., "SHINING FATES"
    gameSystem: {
        type: String,
        required: true,
        enum: ['Pokémon', 'Yu-Gi-Oh', 'Magic: The Gathering'],
        index: true
    },

    // Pricing & Status
    price: { type: Number, required: true, index: true }, // For filtering/sorting
    quantity: { type: Number, default: 1 },
    currency: { type: String, default: 'USD' },
    status: { type: String, default: 'active', enum: ['active', 'sold', 'draft'] },

    // Card Details (Filters)
    condition: {
        type: String,
        required: true,
        enum: ['MINT', 'NM', 'LP', 'MP', 'HP', 'DMG']
    },
    rarity: { type: String },                             // e.g., "SECRET RARE"
    authentication: { type: String, default: 'Unverified' }, // e.g., "VERIFIED"

    // Visuals & Badges
    images: [{ type: String }],                           // URLs from Cloudinary/S3
    badges: [{ type: String }],                           // e.g., ["FAST SHIPPING", "TOP RATED"]
    rating: { type: Number, default: 0 },

    // Details
    description: { type: String },

    // Statistics (for Charts)
    marketHistory: [{
        date: Date,
        price: Number
    }],

    // Relationships
    seller: {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        name: String,
        reputation: String,
        positiveFeedback: String
    }
}, { timestamps: true });

// Compound Index for optimized filtering
productSchema.index({ gameSystem: 1, condition: 1, price: 1 });

export default mongoose.model('Product', productSchema);
