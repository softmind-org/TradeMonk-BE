import express from 'express';
import userRoutes from './user.routes.js';
import authRoutes from './auth.routes.js';
import productRoutes from './product.routes.js';
import favoriteRoutes from './favorite.routes.js';
import cartRoutes from './cart.routes.js';
import paymentRoutes from './payment.routes.js';
import orderRoutes from './order.routes.js';
import stripeRoutes from './stripe.routes.js';
import payoutRoutes from './payout.routes.js';
import categoryRoutes from './category.routes.js';
import settingRoutes from './setting.routes.js';
import shippingRoutes from './shipping.routes.js';

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/products', productRoutes);
router.use('/favorites', favoriteRoutes);
router.use('/cart', cartRoutes);
router.use('/payments', paymentRoutes);
router.use('/orders', orderRoutes);
router.use('/stripe', stripeRoutes);
router.use('/payouts', payoutRoutes);
router.use('/categories', categoryRoutes);
router.use('/settings', settingRoutes);
router.use('/shipping', shippingRoutes);

export default router;
