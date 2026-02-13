import express from 'express';
import paymentController from '../controllers/payment.controller.js';
import { protect } from '../middlewares/auth.middleware.js';

const router = express.Router();

router.use(protect);

router.post('/create-intent', paymentController.createPaymentIntent);

export default router;
