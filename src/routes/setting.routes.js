import express from 'express';
import settingController from '../controllers/setting.controller.js';
import { protect, authorize } from '../middlewares/auth.middleware.js';

const router = express.Router();

// Get settings (Public)
router.get('/', settingController.getSettings);

// Update/Create setting (Admin only)
router.post('/', protect, authorize('admin'), settingController.updateSetting);

export default router;
