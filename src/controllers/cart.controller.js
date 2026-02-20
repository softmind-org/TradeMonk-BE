import Cart from '../models/cart.model.js';
import Product from '../models/product.model.js';
import { getSignedImageUrl } from '../utils/s3.utils.js';

const cartController = {
    // @desc    Get user cart grouped by seller
    // @route   GET /api/v1/cart
    // @access  Private
    getCart: async (req, res, next) => {
        try {
            const cartItems = await Cart.find({ userId: req.user._id }).populate('productId');

            // Group items by seller
            const sellerMap = {};
            let itemsTotal = 0;

            cartItems.forEach(item => {
                if (!item.productId) return; // skip if product deleted
                const sellerId = item.productId.seller.userId.toString();
                const sellerName = item.productId.seller.name || 'Unknown Seller';

                if (!sellerMap[sellerId]) {
                    sellerMap[sellerId] = {
                        sellerId,
                        sellerName,
                        items: [],
                        subtotal: 0
                    };
                }

                const lineTotal = item.productId.price * item.quantity;
                sellerMap[sellerId].items.push({
                    _id: item._id,
                    productId: item.productId,
                    quantity: item.quantity,
                    lineTotal
                });
                sellerMap[sellerId].subtotal += lineTotal;
                itemsTotal += lineTotal;
            });

            // Round subtotals and sign S3 image URLs
            const sellers = await Promise.all(
                Object.values(sellerMap).map(async (s) => {
                    // Sign product images for each item
                    const signedItems = await Promise.all(
                        s.items.map(async (item) => {
                            const product = item.productId.toObject ? item.productId.toObject() : { ...item.productId };
                            // Sign images array
                            if (product.images && Array.isArray(product.images)) {
                                product.images = await Promise.all(
                                    product.images.map(url => getSignedImageUrl(url))
                                );
                            }
                            if (product.backImage) {
                                product.backImage = await getSignedImageUrl(product.backImage);
                            }
                            return { ...item, productId: product };
                        })
                    );
                    return {
                        ...s,
                        items: signedItems,
                        subtotal: parseFloat(s.subtotal.toFixed(2))
                    };
                })
            );

            res.status(200).json({
                success: true,
                sellers,
                itemsTotal: parseFloat(itemsTotal.toFixed(2)),
                totalItems: cartItems.length
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

