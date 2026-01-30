import Favorite from '../models/favorite.model.js';
import Product from '../models/product.model.js';

const favoriteController = {
    // @desc    Toggle favorite status for a product
    // @route   POST /api/v1/products/:id/favorite
    // @access  Private
    toggleFavorite: async (req, res, next) => {
        try {
            const productId = req.params.id;
            const userId = req.user._id;

            // Check if product exists
            const product = await Product.findById(productId);
            if (!product) {
                res.status(404);
                throw new Error('Product not found');
            }

            // Check if already favorited
            const existingFavorite = await Favorite.findOne({ user: userId, product: productId });

            if (existingFavorite) {
                // Remove from favorites
                await existingFavorite.deleteOne();
                res.status(200).json({
                    success: true,
                    isFavorited: false,
                    message: 'Product removed from favorites',
                });
            } else {
                // Add to favorites
                await Favorite.create({ user: userId, product: productId });
                res.status(201).json({
                    success: true,
                    isFavorited: true,
                    message: 'Product added to favorites',
                });
            }
        } catch (error) {
            next(error);
        }
    },

    // @desc    Get all favorites for logged-in user
    // @route   GET /api/v1/favorites
    // @access  Private
    getUserFavorites: async (req, res, next) => {
        try {
            const userId = req.user._id;

            const favorites = await Favorite.find({ user: userId })
                .populate('product')
                .sort('-createdAt');

            res.status(200).json({
                success: true,
                count: favorites.length,
                data: favorites.map(fav => fav.product),
            });
        } catch (error) {
            next(error);
        }
    },

    // @desc    Check if a product is favorited by the user
    // @route   GET /api/v1/products/:id/favorite
    // @access  Private
    checkFavorite: async (req, res, next) => {
        try {
            const productId = req.params.id;
            const userId = req.user._id;

            const favorite = await Favorite.findOne({ user: userId, product: productId });

            res.status(200).json({
                success: true,
                isFavorited: !!favorite,
            });
        } catch (error) {
            next(error);
        }
    },
};

export default favoriteController;
