import express from 'express';
import orderController from '../controllers/order.controller.js';
import { protect, authorize } from '../middlewares/auth.middleware.js';

const router = express.Router();

router.use(protect);

// Order endpoints
router.route('/')
    .get(orderController.getMyOrders)
    .post(orderController.createOrder);

// Seller endpoints (Must be before /:id)
router.route('/seller/report/csv')
    .get(orderController.generateMonthlyCsvReport);

router.route('/seller')
    .get(orderController.getSellerOrders);

// Admin endpoints (Must be before /:id)
router.get('/all', authorize('admin'), orderController.getAllOrders);
router.get('/payment-stats', authorize('admin'), orderController.getPaymentStats);

router.route('/:id/status')
    .patch(orderController.updateOrderStatus);

// Invoice Download Endpoint (Must be before Generic GET /:id)
router.route('/:id/invoice')
    .get(orderController.downloadOrderInvoice);

// By ID endpoint
router.route('/:id')
    .get(orderController.getOrderById);

export default router;
