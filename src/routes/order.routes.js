import express from 'express';
import orderController from '../controllers/order.controller.js';
import { protect } from '../middlewares/auth.middleware.js';

const router = express.Router();

router.use(protect);

// Order endpoints
router.route('/')
    .get(orderController.getMyOrders)
    .post(orderController.createOrder);

// Seller endpoints (Must be before /:id)
router.route('/seller')
    .get(orderController.getSellerOrders);

router.route('/:id/status')
    .patch(orderController.updateOrderStatus);

// By ID endpoint
router.route('/:id')
    .get(orderController.getOrderById);

export default router;
