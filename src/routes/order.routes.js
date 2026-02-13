import express from 'express';
import orderController from '../controllers/order.controller.js';
import { protect } from '../middlewares/auth.middleware.js';

const router = express.Router();

router.use(protect);

router.route('/')
    .get(orderController.getMyOrders)
    .post(orderController.createOrder);

router.route('/:id')
    .get(orderController.getOrderById);

export default router;
