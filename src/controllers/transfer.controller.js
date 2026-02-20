import stripe from '../config/stripe.config.js';
import Order from '../models/order.model.js';
import User from '../models/user.model.js';
import dotenv from 'dotenv';

dotenv.config();

const transferController = {
    // @desc    Trigger transfer to seller after fulfillment
    // @route   POST /api/v1/transfers/:orderId
    // @access  Private (Seller — order's seller only)
    triggerTransfer: async (req, res, next) => {
        try {
            const order = await Order.findById(req.params.orderId);

            if (!order) {
                res.status(404);
                throw new Error('Order not found');
            }

            // Only the seller of this order can trigger transfer
            if (order.sellerId.toString() !== req.user._id.toString()) {
                res.status(403);
                throw new Error('Not authorized — only the seller can trigger transfer');
            }

            // Must be paid and not yet transferred
            if (order.paymentStatus !== 'paid') {
                res.status(400);
                throw new Error('Order is not paid yet');
            }

            if (order.transferStatus !== 'pending') {
                res.status(400);
                throw new Error(`Transfer already ${order.transferStatus}`);
            }

            // Order must be shipped or delivered
            if (!['shipped', 'delivered'].includes(order.orderStatus)) {
                res.status(400);
                throw new Error('Order must be shipped or delivered before transfer');
            }

            // Get seller's Stripe Connect account
            const seller = await User.findById(order.sellerId);

            if (!seller || !seller.stripeConnectId) {
                res.status(400);
                throw new Error('Seller has not completed Stripe Connect setup');
            }

            // Calculate transfer amount (sellerNet from feeBreakdown)
            const sellerNet = order.feeBreakdown?.sellerNet;
            if (!sellerNet || sellerNet <= 0) {
                res.status(400);
                throw new Error('Invalid fee breakdown — cannot calculate transfer amount');
            }

            const transferAmountCents = Math.round(sellerNet * 100);

            // Create Stripe Transfer from platform to seller
            const transfer = await stripe.transfers.create({
                amount: transferAmountCents,
                currency: 'eur',
                destination: seller.stripeConnectId,
                transfer_group: order.orderNumber,
                metadata: {
                    orderId: order._id.toString(),
                    orderNumber: order.orderNumber,
                    sellerId: seller._id.toString(),
                },
            });

            // Update order with transfer details
            order.stripeTransferId = transfer.id;
            order.transferStatus = 'transferred';
            await order.save();

            res.status(200).json({
                success: true,
                message: 'Transfer completed successfully',
                data: {
                    transferId: transfer.id,
                    amount: sellerNet,
                    currency: 'EUR',
                    orderNumber: order.orderNumber,
                    transferStatus: 'transferred',
                }
            });
        } catch (error) {
            next(error);
        }
    },
};

export default transferController;
