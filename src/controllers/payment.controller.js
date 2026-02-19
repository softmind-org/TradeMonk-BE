import stripe from '../config/stripe.config.js';
import Cart from '../models/cart.model.js';
import Product from '../models/product.model.js';
import User from '../models/user.model.js';
import dotenv from 'dotenv';

dotenv.config();

const COMMISSION_RATE = parseFloat(process.env.TRADEMONK_COMMISSION_RATE) || 0.035;

// Stripe's EU card fee: 1.5% + €0.25 (approximation for service fee display)
const STRIPE_FEE_PERCENT = 0.015;
const STRIPE_FEE_FIXED = 0.25; // in EUR

const paymentController = {
    // @desc    Create Stripe PaymentIntent with Connect (application fee)
    // @route   POST /api/v1/payments/create-intent
    // @access  Private
    createPaymentIntent: async (req, res, next) => {
        try {
            // Get user's cart items with product details
            const cartItems = await Cart.find({ userId: req.user._id }).populate('productId');

            if (cartItems.length === 0) {
                res.status(400);
                throw new Error('Cart is empty');
            }

            // Recalculate total amount on backend for security
            let itemsTotal = 0;
            const sellerIds = new Set();

            cartItems.forEach(item => {
                if (item.productId) {
                    itemsTotal += item.productId.price * item.quantity;
                    sellerIds.add(item.productId.seller.userId.toString());
                }
            });

            // For now, support single-seller checkout
            if (sellerIds.size > 1) {
                res.status(400);
                throw new Error('Cart contains items from multiple sellers. Please checkout one seller at a time.');
            }

            const sellerId = [...sellerIds][0];

            // Get seller's Stripe Connect account
            const seller = await User.findById(sellerId);

            if (!seller || !seller.stripeConnectId) {
                res.status(400);
                throw new Error('Seller has not set up payment account yet');
            }

            if (!seller.stripeOnboardingComplete) {
                res.status(400);
                throw new Error('Seller payment account is not fully set up');
            }

            // Calculate fees
            // Service Fee (Stripe processing fee, paid by buyer)
            const serviceFee = parseFloat((itemsTotal * STRIPE_FEE_PERCENT + STRIPE_FEE_FIXED).toFixed(2));

            // Total buyer pays
            const buyerTotal = parseFloat((itemsTotal + serviceFee).toFixed(2));

            // TradeMonk commission (3.5% of item price, deducted from seller)
            const platformFee = parseFloat((itemsTotal * COMMISSION_RATE).toFixed(2));

            // Convert to cents for Stripe
            const amountInCents = Math.round(buyerTotal * 100);
            const platformFeeInCents = Math.round(platformFee * 100);

            // Create PaymentIntent with Connect
            const paymentIntent = await stripe.paymentIntents.create({
                amount: amountInCents,
                currency: 'eur',
                application_fee_amount: platformFeeInCents,
                transfer_data: {
                    destination: seller.stripeConnectId,
                },
                metadata: {
                    userId: req.user._id.toString(),
                    sellerId: sellerId,
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
                    itemsTotal: itemsTotal,
                    serviceFee: serviceFee,
                    buyerTotal: buyerTotal,
                    platformFee: platformFee,
                    sellerNet: parseFloat((itemsTotal - platformFee).toFixed(2)),
                    currency: 'EUR',
                },
            });
        } catch (error) {
            next(error);
        }
    },
};

export default paymentController;
