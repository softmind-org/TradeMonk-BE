import Cart from '../models/cart.model.js';
import Product from '../models/product.model.js';

const cartController = {
    // @desc    Get user cart
    // @route   GET /api/v1/cart
    // @access  Private
    getCart: async (req, res, next) => {
        try {
            const cartItems = await Cart.find({ userId: req.user._id }).populate('productId');

            res.status(200).json({
                success: true,
                count: cartItems.length,
                data: cartItems
            });
        } catch (error) {
            next(error);
        }
    },

    // @desc    Add or update item in cart
    // @route   POST /api/v1/cart
    // @access  Private
    addToCart: async (req, res, next) => {
        try {
            const { productId, quantity = 1 } = req.body;

            // Check if product exists
            const product = await Product.findById(productId);
            if (!product) {
                res.status(404);
                throw new Error('Product not found');
            }

            // Check if item already in cart
            let cartItem = await Cart.findOne({ userId: req.user._id, productId });

            if (cartItem) {
                cartItem.quantity = quantity;
                await cartItem.save();
            } else {
                cartItem = await Cart.create({
                    userId: req.user._id,
                    productId,
                    quantity
                });
            }

            res.status(200).json({
                success: true,
                data: cartItem
            });
        } catch (error) {
            next(error);
        }
    },

    // @desc    Remove item from cart
    // @route   DELETE /api/v1/cart/:id
    // @access  Private
    removeFromCart: async (req, res, next) => {
        try {
            const cartItem = await Cart.findOne({ _id: req.params.id, userId: req.user._id });

            if (!cartItem) {
                res.status(404);
                throw new Error('Item not found in cart');
            }

            await cartItem.deleteOne();

            res.status(200).json({
                success: true,
                message: 'Item removed from cart'
            });
        } catch (error) {
            next(error);
        }
    },

    // @desc    Clear entire cart
    // @route   DELETE /api/v1/cart/clear
    // @access  Private
    clearCart: async (req, res, next) => {
        try {
            await Cart.deleteMany({ userId: req.user._id });

            res.status(200).json({
                success: true,
                message: 'Cart cleared'
            });
        } catch (error) {
            next(error);
        }
    }
};

export default cartController;
