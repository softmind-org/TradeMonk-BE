import jwt from 'jsonwebtoken';
import User from '../models/user.model.js';
import sendEmail from '../utils/sendEmail.js';

// Generate JWT Token
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '30d',
    });
};

const authService = {
    // Register User
    register: async (userData) => {
        const { fullName, email, password, role, acceptedTerms, sellerType, businessName, registrationNumber, vatNumber, businessAddress } = userData;

        // Check if user exists
        const userExists = await User.findOne({ email });
        if (userExists) {
            throw new Error('User already exists');
        }

        // Build user data
        const createData = { fullName, email, password, role, acceptedTerms };

        // Attach seller-specific fields only for sellers
        if (role === 'seller') {
            createData.sellerType = sellerType;
            if (sellerType === 'professional') {
                createData.businessName = businessName;
                createData.registrationNumber = registrationNumber;
                createData.vatNumber = vatNumber;
                createData.businessAddress = businessAddress;
            }
        }

        // Create user
        const user = await User.create(createData);

        if (user) {
            const token = generateToken(user._id);

            // Store token in DB (as requested)
            user.accessToken = token;
            await user.save();

            const responseData = {
                _id: user._id,
                fullName: user.fullName,
                email: user.email,
                role: user.role,
                accessToken: token,
            };

            // Include seller-specific fields in response
            if (user.role === 'seller') {
                responseData.sellerType = user.sellerType;
                if (user.sellerType === 'professional') {
                    responseData.businessName = user.businessName;
                    responseData.registrationNumber = user.registrationNumber;
                    responseData.vatNumber = user.vatNumber;
                    responseData.businessAddress = user.businessAddress;
                }
            }

            return responseData;
        } else {
            throw new Error('Invalid user data');
        }
    },

    // Login User
    login: async (email, password) => {
        // Check for user email
        const user = await User.findOne({ email }).select('+password');

        if (user && (await user.comparePassword(password))) {
            // Check if user is suspended
            if (user.status === 'suspended') {
                throw new Error('Account suspended. Please contact support.');
            }

            const token = generateToken(user._id);

            // Update token in DB
            user.accessToken = token;
            await user.save();

            return {
                _id: user._id,
                fullName: user.fullName,
                email: user.email,
                role: user.role,
                accessToken: token,
            };
        } else {
            throw new Error('Invalid email or password');
        }
    },

    // Forgot Password
    forgotPassword: async (email) => {
        const user = await User.findOne({ email });

        if (!user) {
            throw new Error('User not found');
        }

        // Generate 6 digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        user.resetPasswordOtp = otp;
        user.resetPasswordOtpExpiry = Date.now() + 10 * 60 * 1000; // 10 minutes

        await user.save();

        const message = `Your OTP for password reset is: ${otp}\nIt is valid for 10 minutes.`;

        try {
            await sendEmail({
                email: user.email,
                subject: 'Password Reset OTP',
                message,
            });

            return { message: 'Email sent' };
        } catch (error) {
            console.error('Email send failed:', error);

            if (process.env.NODE_ENV === 'development') {
                console.log(`[DEV MODE] OTP for ${user.email}: ${otp}`);
                return { message: 'Email sent (simulated in Dev mode)' };
            }

            user.resetPasswordOtp = undefined;
            user.resetPasswordOtpExpiry = undefined;
            await user.save();

            throw new Error('Email could not be sent');
        }
    },

    // Verify OTP
    verifyOtp: async (email, otp) => {
        const normalizedEmail = email.toLowerCase();
        const normalizedOtp = String(otp);

        console.log(`Verifying OTP for: ${normalizedEmail}, OTP: ${normalizedOtp}`);

        const user = await User.findOne({
            email: normalizedEmail,
            resetPasswordOtp: normalizedOtp,
            resetPasswordOtpExpiry: { $gt: Date.now() },
        });

        if (!user) {
            // Debugging: Check why it failed
            const debugUser = await User.findOne({ email: normalizedEmail });
            if (!debugUser) {
                console.log('Debug: User not found with this email');
            } else {
                console.log(`Debug: User found. DB OTP: ${debugUser.resetPasswordOtp}, DB Expiry: ${debugUser.resetPasswordOtpExpiry}, Current Time: ${new Date()}`);
                if (debugUser.resetPasswordOtp !== normalizedOtp) {
                    console.log('Debug: OTP Mismatch');
                }
                if (debugUser.resetPasswordOtpExpiry <= Date.now()) {
                    console.log('Debug: OTP Expired');
                }
            }

            throw new Error('Invalid OTP or Token Expired');
        }

        return { message: 'OTP Verified' };
    },

    // Reset Password
    resetPassword: async (email, otp, newPassword, confirmPassword) => {
        if (newPassword !== confirmPassword) {
            throw new Error('Passwords do not match');
        }

        const user = await User.findOne({
            email,
            resetPasswordOtp: otp,
            resetPasswordOtpExpiry: { $gt: Date.now() },
        });

        if (!user) {
            throw new Error('Invalid OTP or Token Expired');
        }

        // Set new password
        user.password = newPassword;
        user.resetPasswordOtp = undefined;
        user.resetPasswordOtpExpiry = undefined;

        await user.save();

        return { message: 'Password Reset Successful' };
    },

    // Logout User
    logout: async (userId) => {
        const user = await User.findById(userId);

        if (!user) {
            throw new Error('User not found');
        }

        user.accessToken = undefined;
        await user.save();

        return { message: 'Logged out successfully' };
    },
};

export default authService;
