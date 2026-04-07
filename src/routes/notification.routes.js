import express from 'express';
import notificationController from '../controllers/notification.controller.js';
import { protect } from '../middlewares/auth.middleware.js';

const router = express.Router();

router.use(protect);

// Get my notifications (with unread count)
router.get('/', notificationController.getMyNotifications);

// Mark all read — must come BEFORE /:id/read to avoid route conflict
router.patch('/read-all', notificationController.markAllRead);

// Mark single read
router.patch('/:id/read', notificationController.markOneRead);

export default router;
