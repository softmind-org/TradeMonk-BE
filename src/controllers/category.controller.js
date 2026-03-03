import Category from '../models/category.model.js';

const categoryController = {
    // @desc    Get all categories
    // @route   GET /api/v1/categories
    // @access  Public
    getAll: async (req, res, next) => {
        try {
            const categories = await Category.find().sort('name');

            res.status(200).json({
                success: true,
                data: categories,
            });
        } catch (error) {
            next(error);
        }
    },

    // @desc    Create new category
    // @route   POST /api/v1/categories
    // @access  Private (Admin)
    create: async (req, res, next) => {
        try {
            const { name, slug, description } = req.body;

            if (!name || !slug) {
                res.status(400);
                throw new Error('Name and slug are required');
            }

            const category = await Category.create({ name, slug, description });

            res.status(201).json({
                success: true,
                data: category,
            });
        } catch (error) {
            // Handle duplicate key error
            if (error.code === 11000) {
                res.status(400);
                error.message = 'A category with that name or slug already exists';
            }
            next(error);
        }
    },

    // @desc    Update category
    // @route   PUT /api/v1/categories/:id
    // @access  Private (Admin)
    update: async (req, res, next) => {
        try {
            const category = await Category.findById(req.params.id);

            if (!category) {
                res.status(404);
                throw new Error('Category not found');
            }

            const updated = await Category.findByIdAndUpdate(
                req.params.id,
                req.body,
                { new: true, runValidators: true }
            );

            res.status(200).json({
                success: true,
                data: updated,
            });
        } catch (error) {
            if (error.code === 11000) {
                res.status(400);
                error.message = 'A category with that name or slug already exists';
            }
            next(error);
        }
    },

    // @desc    Toggle category status (enabled/disabled)
    // @route   PATCH /api/v1/categories/:id/status
    // @access  Private (Admin)
    toggleStatus: async (req, res, next) => {
        try {
            const { status } = req.body;

            if (!['enabled', 'disabled'].includes(status)) {
                res.status(400);
                throw new Error('Status must be "enabled" or "disabled"');
            }

            const category = await Category.findById(req.params.id);

            if (!category) {
                res.status(404);
                throw new Error('Category not found');
            }

            category.status = status;
            await category.save();

            res.status(200).json({
                success: true,
                data: category,
            });
        } catch (error) {
            next(error);
        }
    },

    // @desc    Delete category
    // @route   DELETE /api/v1/categories/:id
    // @access  Private (Admin)
    remove: async (req, res, next) => {
        try {
            const category = await Category.findById(req.params.id);

            if (!category) {
                res.status(404);
                throw new Error('Category not found');
            }

            await category.deleteOne();

            res.status(200).json({
                success: true,
                message: 'Category deleted successfully.',
            });
        } catch (error) {
            next(error);
        }
    },
};

export default categoryController;
