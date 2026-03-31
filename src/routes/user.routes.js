import express from 'express';
import userController from '../controllers/user.controller.js';
import { protect, authorize } from '../middlewares/auth.middleware.js';
import upload from '../middlewares/upload.middleware.js';

const router = express.Router();

router.use(protect);

// User profile routes
router.route('/profile')
    .get(userController.getProfile)
    .put(upload.single('storeLogo'), userController.updateProfile);

router.route('/')
    .get(authorize('admin'), userController.getUsers)
    .post(authorize('admin'), userController.createUser);

// Seller admin routes (Must be before /:id)
router.get('/sellers', authorize('admin'), userController.getSellers);
router.get('/sellers/:id', authorize('admin'), userController.getSellerDetail);

router.route('/:id')
    .get(authorize('admin'), userController.getUserById);

router.route('/:id/status')
    .patch(authorize('admin'), userController.toggleUserStatus);

export default router;
