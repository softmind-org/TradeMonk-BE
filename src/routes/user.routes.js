import express from 'express';
import userController from '../controllers/user.controller.js';
import { protect, authorize } from '../middlewares/auth.middleware.js';

const router = express.Router();

router.use(protect);

router.route('/')
    .get(authorize('admin'), userController.getUsers)
    .post(authorize('admin'), userController.createUser);

router.route('/:id')
    .get(authorize('admin'), userController.getUserById);

router.route('/:id/status')
    .patch(authorize('admin'), userController.toggleUserStatus);

export default router;
