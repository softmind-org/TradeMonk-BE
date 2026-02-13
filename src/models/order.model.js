import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema({
    userId: {
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
    shippingAddress: {
        fullName: { type: String, required: true },
        address: { type: String, required: true },
        city: { type: String, required: true },
        zipCode: { type: String, required: true }
    },
    paymentStatus: {
        type: String,
        enum: ['pending', 'paid', 'failed'],
        default: 'pending'
    },
    orderStatus: {
        type: String,
        enum: ['grading', 'shipped', 'delivered'],
        default: 'grading'
    },
    paymentIntentId: {
        type: String,
        required: true
    }
}, {
    timestamps: true
});

export default mongoose.model('Order', orderSchema);
