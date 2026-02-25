import stripe from '../config/stripe.config.js';
import Cart from '../models/cart.model.js';
import dotenv from 'dotenv';

dotenv.config();

const COMMISSION_RATE = parseFloat(process.env.TRADEMONK_COMMISSION_RATE) || 0.035;

// Constants for Fee Calculations
const STRIPE_PROCESSING_RATE = 0.032; // ~3.2% estimated Stripe processing fee
const SHIPPING_PER_SELLER = 15.00; // in EUR

const paymentController = {
    // @desc    Create Stripe PaymentIntent for the ENTIRE cart (all sellers)
    // @route   POST /api/v1/payments/create-intent
    // @access  Private
    createPaymentIntent: async (req, res, next) => {
        try {
            // Get ALL cart items (not filtered by seller)
            const cartItems = await Cart.find({ userId: req.user._id }).populate('productId');

            const validItems = cartItems.filter(item => item.productId);
            if (validItems.length === 0) {
                res.status(400);
                throw new Error('Your cart is empty');
            }

            // Calculate total across ALL sellers
            let itemsTotal = 0;
            const sellerTotals = {};

            validItems.forEach(item => {
                const lineTotal = item.productId.price * item.quantity;
                itemsTotal += lineTotal;

                // Track per-seller totals for fee breakdown
                const sellerId = item.productId.seller.userId.toString();
                if (!sellerTotals[sellerId]) {
                    sellerTotals[sellerId] = 0;
                }
                sellerTotals[sellerId] += lineTotal;
            });

            const sellerCount = Object.keys(sellerTotals).length;
            const shippingTotal = sellerCount * SHIPPING_PER_SELLER;

            itemsTotal = parseFloat(itemsTotal.toFixed(2));

            // 1. Buyer pays Items + Shipping.
            const buyerTotal = parseFloat((itemsTotal + shippingTotal).toFixed(2));

            // 2. Estimate Stripe processing fee (approx 3.2%)
            // This is absorbed by the seller.
            const stripeFee = parseFloat((buyerTotal * STRIPE_PROCESSING_RATE).toFixed(2));

            // 3. TradeMonk commission (3.5% of the ITEM COST only, not shipping)
            const platformFee = parseFloat((itemsTotal * COMMISSION_RATE).toFixed(2));

            // 4. Final Seller Net
            // Seller receives the Item Cost + Shipping, MINUS the TradeMonk fee, MINUS Stripe fee
            const sellerNet = parseFloat((itemsTotal + shippingTotal - platformFee - stripeFee).toFixed(2));

            // Convert to cents for Stripe
            const amountInCents = Math.round(buyerTotal * 100);

            // Platform-direct charge — money stays in TradeMonk balance until per-seller transfers
            const paymentIntent = await stripe.paymentIntents.create({
                amount: amountInCents,
                currency: 'eur',
                metadata: {
                    userId: req.user._id.toString(),
                    itemsTotal: itemsTotal.toString(),
                    shippingTotal: shippingTotal.toString(),
                    stripeFee: stripeFee.toString(),
                    platformFee: platformFee.toString(),
                    sellerNet: sellerNet.toString(),
                    sellerCount: sellerCount.toString(),
                },
                automatic_payment_methods: {
                    enabled: true,
                },
            });

            res.status(200).json({
                success: true,
                clientSecret: paymentIntent.client_secret,
                paymentIntentId: paymentIntent.id,
                breakdown: {
                    itemsTotal,
                    stripeFee,
                    shippingTotal,
                    buyerTotal,
                    platformFee,
                    sellerNet,
                    currency: 'EUR',
                    sellerTotals, // { sellerId: amount } for frontend reference
                },
            });
        } catch (error) {
            next(error);
        }
    },
};

export default paymentController;
