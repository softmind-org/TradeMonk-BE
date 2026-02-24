import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    sellerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    orderNumber: {
        type: String,
        required: true,
        unique: true
    },
    items: [{
        productId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product'
        },
        title: String,
        price: Number,
        image: String,
        quantity: Number
    }],
    totalAmount: {
        type: Number,
        required: true
    },
    feeBreakdown: {
        itemsTotal: Number,
        serviceFee: Number,
        platformFee: Number,
        sellerNet: Number
    },
    shippingAddress: {
        fullName: { type: String, required: true },
        address: { type: String, required: true },
        city: { type: String, required: true },
        zipCode: { type: String, required: true }
    },
    paymentStatus: {
        type: String,
        enum: ['pending', 'paid', 'failed', 'refunded'],
        default: 'pending'
    },
    orderStatus: {
        type: String,
        enum: ['pending', 'processing', 'confirmed', 'shipped', 'delivered', 'cancelled', 'disputed'],
        default: 'pending'
    },
    transferStatus: {
        type: String,
        enum: ['pending', 'paid', 'transferred', 'refunded'],
        default: 'pending'
    },
    paymentIntentId: {
        type: String,
        required: true
    },
    stripeTransferId: String,
    trackingNumber: String, // Keeping this for backward compatibility, but moving to trackingDetails
    trackingDetails: {
        number: String,
        carrier: String,
        shippedAt: Date
    },
    payoutClearanceDate: Date,
    deliveryDate: Date
}, {
    timestamps: true
});

// Index for efficient queries
orderSchema.index({ userId: 1, createdAt: -1 });
orderSchema.index({ sellerId: 1, createdAt: -1 });

export default mongoose.model('Order', orderSchema);

