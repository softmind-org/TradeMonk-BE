import express from 'express';
import transferController from '../controllers/transfer.controller.js';
import { protect, authorize } from '../middlewares/auth.middleware.js';

const router = express.Router();

// Transfer routes — seller triggers payout after fulfillment
router.post('/:orderId', protect, authorize('seller', 'admin'), transferController.triggerTransfer);

export default router;
