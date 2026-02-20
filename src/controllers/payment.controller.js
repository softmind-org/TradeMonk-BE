import stripe from '../config/stripe.config.js';
import Cart from '../models/cart.model.js';
import dotenv from 'dotenv';

dotenv.config();

const COMMISSION_RATE = parseFloat(process.env.TRADEMONK_COMMISSION_RATE) || 0.035;

// Stripe's EU card fee: 1.5% + €0.25 (approximation for service fee display)
const STRIPE_FEE_PERCENT = 0.015;
const STRIPE_FEE_FIXED = 0.25; // in EUR

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

            itemsTotal = parseFloat(itemsTotal.toFixed(2));

            // Service Fee (Stripe processing fee, paid by buyer)
            const serviceFee = parseFloat((itemsTotal * STRIPE_FEE_PERCENT + STRIPE_FEE_FIXED).toFixed(2));

            // Total buyer pays
            const buyerTotal = parseFloat((itemsTotal + serviceFee).toFixed(2));

            // TradeMonk commission (3.5% of item price, deducted from sellers on transfer)
            const platformFee = parseFloat((itemsTotal * COMMISSION_RATE).toFixed(2));

            // What sellers will receive in total after transfers
            const sellerNet = parseFloat((itemsTotal - platformFee).toFixed(2));

            // Convert to cents for Stripe
            const amountInCents = Math.round(buyerTotal * 100);

            // Platform-direct charge — money stays in TradeMonk balance until per-seller transfers
            const paymentIntent = await stripe.paymentIntents.create({
                amount: amountInCents,
                currency: 'eur',
                metadata: {
                    userId: req.user._id.toString(),
                    itemsTotal: itemsTotal.toString(),
                    platformFee: platformFee.toString(),
                    sellerNet: sellerNet.toString(),
                    sellerCount: Object.keys(sellerTotals).length.toString(),
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
                    serviceFee,
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
