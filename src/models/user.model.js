import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
    fullName: {
        type: String,
        required: [true, 'Please add a full name'],
        trim: true,
    },
    email: {
        type: String,
        required: [true, 'Please add an email'],
        unique: true,
        lowercase: true,
        match: [
            /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
            'Please add a valid email',
        ],
    },
    password: {
        type: String,
        required: [true, 'Please add a password'],
        minlength: 6,
        select: false, // Don't return password by default
    },
    role: {
        type: String,
        enum: ['buyer', 'seller', 'admin'],
        required: [true, 'Please specify a role'],
    },
    status: {
        type: String,
        enum: ['active', 'suspended'],
        default: 'active',
    },
    accessToken: {
        type: String,
        select: false, // Don't return token by default
    },
    // Stripe Connect (Sellers)
    stripeConnectId: {
        type: String,
    },
    stripeOnboardingComplete: {
        type: Boolean,
        default: false,
    },
    stripePayoutsEnabled: {
        type: Boolean,
        default: false,
    },
    acceptedTerms: {
        type: Boolean,
        default: false,
    },
    // Seller-specific fields
    sellerType: {
        type: String,
        enum: ['private', 'professional'],
    },
    businessName: {
        type: String,
        trim: true,
    },
    registrationNumber: {
        type: String,
        trim: true,
    },
    vatNumber: {
        type: String,
        trim: true,
    },
    businessAddress: {
        type: String,
        trim: true,
    },
    resetPasswordOtp: String,
    resetPasswordOtpExpiry: Date,
}, {
    timestamps: true,
});

// Hash password before saving
userSchema.pre('save', async function () {
    if (!this.isModified('password')) {
        return;
    }

    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

// Method to compare password
userSchema.methods.comparePassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

export default mongoose.model('User', userSchema);
