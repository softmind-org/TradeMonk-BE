import express from 'express';
import shippingController from '../controllers/shipping.controller.js';
import { protect, authorize } from '../middlewares/auth.middleware.js';

const router = express.Router();

// GET shipping methods (Public or Protected depending on needs, made public for cart estimation)
router.get('/methods', shippingController.getShippingMethods);

// POST estimate shipping automatically based on rules
router.post('/estimate', shippingController.estimateShipping);

// POST generate label (Seller/Admin)
router.post('/label', protect, authorize('seller', 'admin'), shippingController.generateLabel);

// GET proxy to safely download SendCloud PDF label (Seller/Admin)
router.get('/label/:orderId', protect, authorize('seller', 'admin'), shippingController.downloadLabelProxy);

// GET tracking info (Buyer/Seller/Admin)
router.get('/tracking/:orderId', protect, shippingController.getTrackingInfo);

// POST SendCloud tracking webhook
router.post('/webhook', shippingController.handleWebhook);

export default router;
