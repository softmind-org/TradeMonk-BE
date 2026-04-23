import express from 'express';
import productController from '../controllers/product.controller.js';
import favoriteController from '../controllers/favorite.controller.js';
import { protect, authorize } from '../middlewares/auth.middleware.js';
import upload, { csvUpload } from '../middlewares/upload.middleware.js';
import bulkController from '../controllers/bulk.controller.js';

const router = express.Router();

router.route('/')
    .get(productController.getProducts)
    .post(
        protect,
        authorize('seller', 'admin'),
        upload.fields([
            { name: 'images', maxCount: 5 },
            { name: 'backImage', maxCount: 1 }
        ]),
        productController.createProduct
    );

router.get('/me', protect, authorize('seller', 'admin'), productController.getMyProducts);
router.post('/bulk-upload', protect, authorize('seller', 'admin'), csvUpload.single('file'), bulkController.bulkUploadProducts);

// Admin endpoints (Must be before /:id)
router.get('/all', protect, authorize('admin'), productController.getAllListings);

router.route('/:id')
    .get(productController.getProductById)
    .put(
        protect,
        authorize('seller', 'admin'),
        upload.fields([
            { name: 'images', maxCount: 5 },
            { name: 'backImage', maxCount: 1 }
        ]),
        productController.updateProduct
    )
    .delete(protect, authorize('seller', 'admin'), productController.deleteProduct);

// Favorite routes
router.route('/:id/favorite')
    .get(protect, favoriteController.checkFavorite)
    .post(protect, favoriteController.toggleFavorite);

export default router;
