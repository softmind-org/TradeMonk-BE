import Product from '../models/product.model.js';

const productController = {
    // @desc    Get all products with filtering, sorting and pagination
    // @route   GET /api/v1/products
    // @access  Public
    getProducts: async (req, res, next) => {
        try {
            const { game, condition, minPrice, maxPrice, sort, page = 1, limit = 20 } = req.query;

            // Build Query
            const query = { status: 'active' };

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

            res.status(200).json({
                success: true,
                count: products.length,
                total: count,
                totalPages: Math.ceil(count / limit),
                currentPage: Number(page),
                data: products,
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

            res.status(200).json({
                success: true,
                data: product,
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
                // In a real app, you might fetch reputation from a User/Profile model
                reputation: 'New Seller',
                positiveFeedback: '100%'
            };

            const product = await Product.create({
                ...req.body,
                seller: sellerInfo,
            });

            res.status(201).json({
                success: true,
                data: product,
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

            product = await Product.findByIdAndUpdate(req.params.id, req.body, {
                new: true,
                runValidators: true,
            });

            res.status(200).json({
                success: true,
                data: product,
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
};

export default productController;
