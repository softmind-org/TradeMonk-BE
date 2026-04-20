import express from 'express';
import payoutController from '../controllers/payout.controller.js';
import { protect, authorize } from '../middlewares/auth.middleware.js';

const router = express.Router();

// Payout routes — seller gets balance and triggers payout
router.get('/balance', protect, authorize('seller', 'admin'), payoutController.getPayoutBalance);
router.get('/history', protect, authorize('seller', 'admin'), payoutController.getPayoutHistory);
router.post('/request', protect, authorize('seller', 'admin'), payoutController.requestPayout);

export default router;
