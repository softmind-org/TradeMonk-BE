import express from 'express';
import favoriteController from '../controllers/favorite.controller.js';
import { protect } from '../middlewares/auth.middleware.js';

const router = express.Router();

// Get user's all favorites
router.get('/', protect, favoriteController.getUserFavorites);

export default router;
