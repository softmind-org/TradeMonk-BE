import mongoose from 'mongoose';

const cartSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
    },
    quantity: {
        type: Number,
        required: true,
        min: [1, 'Quantity cannot be less than 1'],
        max: [10, 'Max 10 items per product allowed'],
        default: 1
    }
}, {
    timestamps: true
});

// Ensure a user can only have one entry per product in their cart
cartSchema.index({ userId: 1, productId: 1 }, { unique: true });

export default mongoose.model('Cart', cartSchema);
