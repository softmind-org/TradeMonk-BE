import express from 'express';
import userRoutes from './user.routes.js';
import authRoutes from './auth.routes.js';
import productRoutes from './product.routes.js';
import favoriteRoutes from './favorite.routes.js';

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/products', productRoutes);
router.use('/favorites', favoriteRoutes);

export default router;
