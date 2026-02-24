import stripe from '../config/stripe.config.js';
import Order from '../models/order.model.js';
import User from '../models/user.model.js';
import dotenv from 'dotenv';

dotenv.config();

const payoutController = {
    // @desc    Get seller's payout balance and eligible orders
    // @route   GET /api/v1/payouts/balance
    // @access  Private (Seller)
    getPayoutBalance: async (req, res, next) => {
        try {
            const sellerId = req.user._id;

            // Fetch orders that are shipped OR delivered, AND have not been paid out yet
            const eligibleOrders = await Order.find({
                sellerId,
                transferStatus: 'pending',
                orderStatus: { $in: ['shipped', 'delivered'] }
            });

            let availableBalance = 0;
            let pendingBalance = 0;
            const now = new Date();
            const payoutEligibleOrders = [];

            eligibleOrders.forEach(order => {
                const sellerNet = order.feeBreakdown?.sellerNet || 0;

                // If Delivered, it's immediately available
                if (order.orderStatus === 'delivered') {
                    availableBalance += sellerNet;
                    payoutEligibleOrders.push(order);
                }
                // If Shipped, check if clearance date has passed
                else if (order.orderStatus === 'shipped' && order.payoutClearanceDate) {
                    if (now >= new Date(order.payoutClearanceDate)) {
                        availableBalance += sellerNet;
                        payoutEligibleOrders.push(order);
                    } else {
                        pendingBalance += sellerNet;
                    }
                }
            });

            res.status(200).json({
                success: true,
                data: {
                    availableBalance: parseFloat(availableBalance.toFixed(2)),
                    pendingBalance: parseFloat(pendingBalance.toFixed(2)),
                    eligibleOrders: payoutEligibleOrders
                }
            });
        } catch (error) {
            next(error);
        }
    },

    // @desc    Request a manual payout transfer to Connected Stripe Account
    // @route   POST /api/v1/payouts/request
    // @access  Private (Seller)
    requestPayout: async (req, res, next) => {
        try {
            const sellerId = req.user._id;

            // 1. Verify seller has a connected Stripe account
            const seller = await User.findById(sellerId);
            if (!seller || !seller.stripeConnectId) {
                res.status(400);
                throw new Error('Please connect your Stripe account first');
            }

            // 2. Fetch eligible orders (delivered OR shipped and clearance passed)
            const now = new Date();
            const eligibleOrders = await Order.find({
                sellerId,
                transferStatus: 'pending',
                $or: [
                    { orderStatus: 'delivered' },
                    {
                        orderStatus: 'shipped',
                        payoutClearanceDate: { $lte: now }
                    }
                ]
            });

            if (eligibleOrders.length === 0) {
                res.status(400);
                throw new Error('No funds available for payout yet');
            }

            // 3. Calculate total payout
            let totalPayout = 0;
            const orderIds = [];
            eligibleOrders.forEach(order => {
                totalPayout += order.feeBreakdown?.sellerNet || 0;
                orderIds.push(order._id);
            });

            if (totalPayout <= 0) {
                res.status(400);
                throw new Error('Calculated payout amount is invalid');
            }

            // 4. Create Stripe Transfer (Admin Platform to Seller Connected Account)
            const transfer = await stripe.transfers.create({
                amount: Math.round(totalPayout * 100), // convert to cents
                currency: 'eur',
                destination: seller.stripeConnectId,
                description: `Payout for ${eligibleOrders.length} orders`,
                metadata: {
                    sellerId: sellerId.toString(),
                    ordersCount: eligibleOrders.length.toString()
                }
            });

            // 5. Update orders status
            await Order.updateMany(
                { _id: { $in: orderIds } },
                {
                    $set: {
                        transferStatus: 'paid',
                        stripeTransferId: transfer.id
                    }
                }
            );

            res.status(200).json({
                success: true,
                message: `Successfully transferred €${totalPayout.toFixed(2)} to your account`,
                data: {
                    transferId: transfer.id,
                    amount: totalPayout,
                    ordersProcessed: eligibleOrders.length
                }
            });

        } catch (error) {
            next(error);
        }
    }
};

export default payoutController;
