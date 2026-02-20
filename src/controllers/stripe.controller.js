import stripe from '../config/stripe.config.js';
import User from '../models/user.model.js';
import Order from '../models/order.model.js';
import dotenv from 'dotenv';

dotenv.config();

const stripeController = {
    // @desc    Create Stripe Connect Express account for seller
    // @route   POST /api/v1/stripe/connect/account
    // @access  Private (Seller)
    createConnectAccount: async (req, res, next) => {
        try {
            const user = await User.findById(req.user._id);

            // If seller already has a Connect account, return it
            if (user.stripeConnectId) {
                return res.status(200).json({
                    success: true,
                    message: 'Connect account already exists',
                    stripeConnectId: user.stripeConnectId,
                });
            }

            // Accept country and business type from frontend form
            const { country = 'NL', businessType = 'individual' } = req.body;

            // Create Express account with user-provided details
            const account = await stripe.accounts.create({
                type: 'express',
                country,
                email: user.email,
                capabilities: {
                    card_payments: { requested: true },
                    transfers: { requested: true },
                },
                business_type: businessType,
                metadata: {
                    userId: user._id.toString(),
                },
            });

            // Save Connect account ID to user
            user.stripeConnectId = account.id;
            await user.save();

            res.status(201).json({
                success: true,
                stripeConnectId: account.id,
            });
        } catch (error) {
            next(error);
        }
    },

    // @desc    Generate Stripe Connect onboarding link
    // @route   POST /api/v1/stripe/connect/account-link
    // @access  Private (Seller)
    createAccountLink: async (req, res, next) => {
        try {
            const user = await User.findById(req.user._id);

            if (!user.stripeConnectId) {
                res.status(400);
                throw new Error('No Stripe Connect account found. Create one first.');
            }

            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

            const accountLink = await stripe.accountLinks.create({
                account: user.stripeConnectId,
                refresh_url: `${frontendUrl}/seller/settings?stripe=refresh`,
                return_url: `${frontendUrl}/seller/settings?stripe=success`,
                type: 'account_onboarding',
            });

            res.status(200).json({
                success: true,
                url: accountLink.url,
            });
        } catch (error) {
            next(error);
        }
    },

    // @desc    Get Stripe Connect account status
    // @route   GET /api/v1/stripe/connect/account-status
    // @access  Private (Seller)
    getAccountStatus: async (req, res, next) => {
        try {
            const user = await User.findById(req.user._id);

            if (!user.stripeConnectId) {
                return res.status(200).json({
                    success: true,
                    connected: false,
                    onboardingComplete: false,
                    payoutsEnabled: false,
                });
            }

            // Fetch latest status from Stripe
            const account = await stripe.accounts.retrieve(user.stripeConnectId);

            // Update local DB with latest status
            user.stripeOnboardingComplete = account.details_submitted;
            user.stripePayoutsEnabled = account.payouts_enabled;
            await user.save();

            res.status(200).json({
                success: true,
                connected: true,
                stripeConnectId: user.stripeConnectId,
                onboardingComplete: account.details_submitted,
                payoutsEnabled: account.payouts_enabled,
                chargesEnabled: account.charges_enabled,
            });
        } catch (error) {
            next(error);
        }
    },

    // @desc    Create Account Session for embedded Connect components
    // @route   POST /api/v1/stripe/connect/account-session
    // @access  Private (Seller)
    createAccountSession: async (req, res, next) => {
        try {
            const user = await User.findById(req.user._id);

            if (!user.stripeConnectId) {
                res.status(400);
                throw new Error('No Stripe Connect account found. Create one first.');
            }

            const accountSession = await stripe.accountSessions.create({
                account: user.stripeConnectId,
                components: {
                    account_onboarding: { enabled: true },
                },
            });

            res.status(200).json({
                success: true,
                clientSecret: accountSession.client_secret,
            });
        } catch (error) {
            next(error);
        }
    },

    // @desc    Handle Stripe webhooks
    // @route   POST /api/v1/stripe/webhooks
    // @access  Public (Stripe signature verified)
    handleWebhook: async (req, res) => {
        const sig = req.headers['stripe-signature'];
        const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

        let event;

        try {
            event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
        } catch (err) {
            console.error('⚠️  Webhook signature verification failed:', err.message);
            return res.status(400).send(`Webhook Error: ${err.message}`);
        }

        // Handle events
        switch (event.type) {
            case 'account.updated': {
                const account = event.data.object;
                const userId = account.metadata?.userId;

                if (userId) {
                    await User.findByIdAndUpdate(userId, {
                        stripeOnboardingComplete: account.details_submitted,
                        stripePayoutsEnabled: account.payouts_enabled,
                    });
                    console.log(`✅ Account ${account.id} updated for user ${userId}`);
                }
                break;
            }

            case 'payment_intent.succeeded': {
                const paymentIntent = event.data.object;
                const orderId = paymentIntent.metadata?.orderId;

                if (orderId) {
                    await Order.findByIdAndUpdate(orderId, {
                        paymentStatus: 'paid',
                        orderStatus: 'processing',
                    });
                    console.log(`✅ Payment succeeded for order ${orderId}`);
                }
                break;
            }

            case 'transfer.created': {
                const transfer = event.data.object;
                const orderId = transfer.metadata?.orderId;

                if (orderId) {
                    await Order.findByIdAndUpdate(orderId, {
                        transferStatus: 'transferred',
                        stripeTransferId: transfer.id,
                    });
                    console.log(`✅ Transfer created for order ${orderId}: ${transfer.id}`);
                }
                break;
            }

            case 'transfer.failed': {
                const transfer = event.data.object;
                const orderId = transfer.metadata?.orderId;

                if (orderId) {
                    await Order.findByIdAndUpdate(orderId, {
                        transferStatus: 'pending', // Reset so it can be retried
                    });
                    console.error(`❌ Transfer failed for order ${orderId}: ${transfer.id}`);
                }
                break;
            }

            case 'payout.paid': {
                console.log(`✅ Payout completed: ${event.data.object.id}`);
                break;
            }

            default:
                console.log(`Unhandled event type: ${event.type}`);
        }

        res.status(200).json({ received: true });
    },
};

export default stripeController;
