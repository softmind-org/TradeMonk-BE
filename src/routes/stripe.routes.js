import express from 'express';
import stripeController from '../controllers/stripe.controller.js';
import { protect, authorize } from '../middlewares/auth.middleware.js';

const router = express.Router();

// All Stripe Connect routes require authentication and seller role
router.post('/connect/account', protect, authorize('seller', 'admin'), stripeController.createConnectAccount);
router.post('/connect/account-link', protect, authorize('seller', 'admin'), stripeController.createAccountLink);
router.post('/connect/account-session', protect, authorize('seller', 'admin'), stripeController.createAccountSession);
router.get('/connect/account-status', protect, authorize('seller', 'admin'), stripeController.getAccountStatus);

// Webhook route is mounted separately in app.js (needs raw body)

export default router;
