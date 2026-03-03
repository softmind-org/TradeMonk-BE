import express from 'express';
import categoryController from '../controllers/category.controller.js';
import { protect, authorize } from '../middlewares/auth.middleware.js';

const router = express.Router();

router.route('/')
    .get(categoryController.getAll)                                    // Public
    .post(protect, authorize('admin'), categoryController.create);     // Admin

router.route('/:id')
    .put(protect, authorize('admin'), categoryController.update)       // Admin
    .delete(protect, authorize('admin'), categoryController.remove);   // Admin

router.patch('/:id/status', protect, authorize('admin'), categoryController.toggleStatus); // Admin

export default router;
