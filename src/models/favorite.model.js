import mongoose from 'mongoose';

const favoriteSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true,
    },
}, { timestamps: true });

// Compound unique index to prevent duplicate favorites
favoriteSchema.index({ user: 1, product: 1 }, { unique: true });

export default mongoose.model('Favorite', favoriteSchema);
