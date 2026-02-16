import Stripe from 'stripe';
import Cart from '../models/cart.model.js';
import Product from '../models/product.model.js';
import dotenv from 'dotenv';
dotenv.config();

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

if (!stripeSecretKey) {
    console.error('STRIPE_SECRET_KEY is missing in .env file');
}

const stripe = new Stripe(stripeSecretKey || 'sk_test_placeholder');

const paymentController = {
    // @desc    Create Stripe PaymentIntent
    // @route   POST /api/v1/payments/create-intent
    // @access  Private
    createPaymentIntent: async (req, res, next) => {
        try {
            // Get user's cart items
            const cartItems = await Cart.find({ userId: req.user._id }).populate('productId');

            if (cartItems.length === 0) {
                res.status(400);
                throw new Error('Cart is empty');
            }

            // Recalculate total amount on backend for security
            let totalAmount = 0;
            cartItems.forEach(item => {
                if (item.productId) {
                    totalAmount += item.productId.price * item.quantity;
                }
            });

            // Convert to cents for Stripe
            const amountInCents = Math.round(totalAmount * 100);

            // Create PaymentIntent
            const paymentIntent = await stripe.paymentIntents.create({
                amount: amountInCents,
                currency: 'eur',
                metadata: {
                    userId: req.user._id.toString()
                },
                automatic_payment_methods: {
                    enabled: true,
                },
            });

            res.status(200).json({
                success: true,
                clientSecret: paymentIntent.client_secret,
                amount: totalAmount
            });
        } catch (error) {
            next(error);
        }
    }
};

export default paymentController;
