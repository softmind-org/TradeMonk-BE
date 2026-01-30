import express from 'express';
import productController from '../controllers/product.controller.js';
import favoriteController from '../controllers/favorite.controller.js';
import { protect, authorize } from '../middlewares/auth.middleware.js';

const router = express.Router();

router.route('/')
    .get(productController.getProducts)
    .post(protect, authorize('seller', 'admin'), productController.createProduct);

router.route('/:id')
    .get(productController.getProductById)
    .put(protect, authorize('seller', 'admin'), productController.updateProduct)
    .delete(protect, authorize('seller', 'admin'), productController.deleteProduct);

// Favorite routes
router.route('/:id/favorite')
    .get(protect, favoriteController.checkFavorite)
    .post(protect, favoriteController.toggleFavorite);

export default router;
