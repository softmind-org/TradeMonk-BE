import Product from '../models/product.model.js';
import { signImageUrls } from '../utils/s3.utils.js';

const productController = {
    // @desc    Get all products with filtering, sorting and pagination
    // @route   GET /api/v1/products
    // @access  Public
    getProducts: async (req, res, next) => {
        try {
            const { game, condition, minPrice, maxPrice, sort, keyword, page = 1, limit = 20 } = req.query;

            // Build Query
            const query = { status: 'active' };

            if (keyword && keyword.trim() !== '') {
                query.title = { $regex: keyword.trim(), $options: 'i' };
            }

            if (game && game !== 'All') {
                query.gameSystem = game;
            }

            if (condition && condition !== 'ALL') {
                query.condition = condition;
            }

            if (minPrice || maxPrice) {
                query.price = {};
                if (minPrice) query.price.$gte = Number(minPrice);
                if (maxPrice) query.price.$lte = Number(maxPrice);
            }

            // Execute Query with Pagination & Sort
            const products = await Product.find(query)
                .sort(sort || '-createdAt')
                .skip((page - 1) * limit)
                .limit(Number(limit));

            // Get total count for pagination info
            const count = await Product.countDocuments(query);

            // Sign S3 image URLs
            const signedProducts = await signImageUrls(products);

            res.status(200).json({
                success: true,
                count: signedProducts.length,
                total: count,
                totalPages: Math.ceil(count / limit),
                currentPage: Number(page),
                data: signedProducts,
            });
        } catch (error) {
            next(error);
        }
    },

    // @desc    Get logged-in seller's products
    // @route   GET /api/v1/products/me
    // @access  Private (Seller/Admin)
    getMyProducts: async (req, res, next) => {
        try {
            const products = await Product.find({ 'seller.userId': req.user._id })
                .sort('-createdAt');

            // Sign S3 image URLs
            const signedProducts = await signImageUrls(products);

            res.status(200).json({
                success: true,
                count: signedProducts.length,
                data: signedProducts
            });
        } catch (error) {
            next(error);
        }
    },

    // @desc    Get single product
    // @route   GET /api/v1/products/:id
    // @access  Public
    getProductById: async (req, res, next) => {
        try {
            const product = await Product.findById(req.params.id);

            if (!product) {
                res.status(404);
                throw new Error('Product not found');
            }

            // Sign S3 image URLs
            const signedProduct = await signImageUrls(product);

            res.status(200).json({
                success: true,
                data: signedProduct,
            });
        } catch (error) {
            next(error);
        }
    },

    // @desc    Create new product
    // @route   POST /api/v1/products
    // @access  Private (Seller/Admin)
    createProduct: async (req, res, next) => {
        try {
            // Add seller info from the logged-in user
            const sellerInfo = {
                userId: req.user._id,
                name: req.user.fullName,
                sellerType: req.user.sellerType,
                reputation: 'New Seller',
                positiveFeedback: '100%'
            };

            const productData = { ...req.body, seller: sellerInfo };

            // STRICT VALIDATION: Ensure BOTH images are provided
            if (!req.files || !req.files.images || !req.files.backImage) {
                res.status(400);
                throw new Error('Please upload both front and back images for the card.');
            }

            // Handle images upload — store S3 key (not full URL) for private bucket signing
            if (req.files) {
                if (req.files.images) {
                    productData.images = req.files.images.map(file => file.key || file.location);
                }
                if (req.files.backImage) {
                    productData.backImage = req.files.backImage[0].key || req.files.backImage[0].location;
                }
            }

            const product = await Product.create(productData);

            // Return signed URLs in response
            const signedProduct = await signImageUrls(product);

            res.status(201).json({
                success: true,
                data: signedProduct,
            });
        } catch (error) {
            next(error);
        }
    },

    // @desc    Update product
    // @route   PUT /api/v1/products/:id
    // @access  Private (Owner/Admin)
    updateProduct: async (req, res, next) => {
        try {
            let product = await Product.findById(req.params.id);

            if (!product) {
                res.status(404);
                throw new Error('Product not found');
            }

            // Make sure user is product owner or admin
            if (product.seller.userId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
                res.status(403);
                throw new Error('User not authorized to update this product');
            }

            const updateData = { ...req.body };

            // Handle images upload — store S3 key for private bucket signing
            if (req.files) {
                if (req.files.images) {
                    updateData.images = req.files.images.map(file => file.key || file.location);
                }
                if (req.files.backImage) {
                    updateData.backImage = req.files.backImage[0].key || req.files.backImage[0].location;
                }
            }

            product = await Product.findByIdAndUpdate(req.params.id, updateData, {
                new: true,
                runValidators: true,
            });

            // Return signed URLs in response
            const signedProduct = await signImageUrls(product);

            res.status(200).json({
                success: true,
                data: signedProduct,
            });
        } catch (error) {
            next(error);
        }
    },

    // @desc    Delete product
    // @route   DELETE /api/v1/products/:id
    // @access  Private (Owner/Admin)
    deleteProduct: async (req, res, next) => {
        try {
            const product = await Product.findById(req.params.id);

            if (!product) {
                res.status(404);
                throw new Error('Product not found');
            }

            // Make sure user is product owner or admin
            if (product.seller.userId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
                res.status(403);
                throw new Error('User not authorized to delete this product');
            }

            await product.deleteOne();

            res.status(200).json({
                success: true,
                message: 'Product removed',
            });
        } catch (error) {
            next(error);
        }
    },

    // --- ADMIN METHODS ---

    // @desc    Get all listings (admin view — no status filter)
    // @route   GET /api/v1/products/all
    // @access  Private (Admin)
    getAllListings: async (req, res, next) => {
        try {
            const products = await Product.find()
                .sort('-createdAt');

            // Sign S3 image URLs
            const signedProducts = await signImageUrls(products);

            res.status(200).json({
                success: true,
                count: signedProducts.length,
                data: signedProducts,
            });
        } catch (error) {
            next(error);
        }
    },
};

export default productController;

