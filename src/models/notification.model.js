import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true
        },
        role: {
            type: String,
            enum: ['buyer', 'seller', 'admin'],
            required: true
        },
        type: {
            type: String,
            required: true,
            // buyer: order_placed, order_confirmed, order_shipped, order_delivered
            // seller: new_sale, payout_processed
            // admin: new_seller, new_order, payout_failed
        },
        title: {
            type: String,
            required: true
        },
        message: {
            type: String,
            required: true
        },
        isRead: {
            type: Boolean,
            default: false
        },
        metadata: {
            type: mongoose.Schema.Types.Mixed,
            default: {}
        }
    },
    { timestamps: true }
);

// Efficient queries: sorted by latest, filtered by user
notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, isRead: 1 });

export default mongoose.model('Notification', notificationSchema);
