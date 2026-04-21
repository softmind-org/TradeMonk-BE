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
        shippingFee: Number,
        stripeFee: Number,
        platformFee: Number, // Gross (Inclusive of VAT)
        platformFeeNet: Number, // Net (Excl. VAT)
        platformFeeVat: Number, // 21% VAT portion
        sellerNet: Number
    },
    shippingAddress: {
        fullName: { type: String, required: true },
        address: { type: String, required: true },
        city: { type: String, required: true },
        zipCode: { type: String, required: true },
        country: { type: String, required: true }
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
    
    // --- SendCloud Shipping Fields ---
    shippingMethodId: String, // ID of method selected during checkout
    shippingMethodName: String, // E.g., 'DPD Home'
    sendcloudParcelId: Number, // SendCloud's internal parcel ID
    trackingUrl: String, // SendCloud tracking URL link
    labelUrl: String, // Link to the generated PDF label
    // ---------------------------------
    
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

