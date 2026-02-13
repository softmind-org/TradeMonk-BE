import express from 'express';
import cartController from '../controllers/cart.controller.js';
import { protect } from '../middlewares/auth.middleware.js';

const router = express.Router();

router.use(protect); // All cart routes require authentication

router.route('/')
    .get(cartController.getCart)
    .post(cartController.addToCart);

router.delete('/clear', cartController.clearCart);

router.route('/:id')
    .delete(cartController.removeFromCart);

export default router;
