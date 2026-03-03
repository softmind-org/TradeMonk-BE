import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Category name is required'],
        unique: true,
        trim: true,
    },
    slug: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
    },
    description: {
        type: String,
        default: '',
    },
    status: {
        type: String,
        enum: ['enabled', 'disabled'],
        default: 'enabled',
    },
}, {
    timestamps: true,
});

// Index for fast lookups by slug and status
// Index for fast filtering by status
categorySchema.index({ status: 1 });

export default mongoose.model('Category', categorySchema);
