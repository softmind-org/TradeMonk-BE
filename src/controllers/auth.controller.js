import authService from '../services/auth.service.js';

const authController = {
    // @desc    Register new user
    // @route   POST /api/v1/auth/register
    // @access  Public
    register: async (req, res, next) => {
        try {
            const user = await authService.register(req.body);
            res.status(201).json({
                success: true,
                data: user,
            });
        } catch (error) {
            if (error.message === 'User already exists') {
                res.status(400);
            }
            next(error);
        }
    },

    // @desc    Authenticate a user
    // @route   POST /api/v1/auth/login
    // @access  Public
    login: async (req, res, next) => {
        try {
            const { email, password } = req.body;

            if (!email || !password) {
                res.status(400);
                throw new Error('Please add all fields');
            }

            const user = await authService.login(email, password);
            res.status(200).json({
                success: true,
                data: user,
            });
        } catch (error) {
            if (error.message === 'Invalid email or password') {
                res.status(401);
            }
            next(error);
        }
    },

    // @desc    Forgot Password
    // @route   POST /api/v1/auth/forgot-password
    // @access  Public
    forgotPassword: async (req, res, next) => {
        try {
            const { email } = req.body;
            if (!email) {
                res.status(400);
                throw new Error('Please provide an email');
            }

            const result = await authService.forgotPassword(email);
            res.status(200).json({
                success: true,
                data: result,
            });
        } catch (error) {
            if (error.message === 'User not found') {
                res.status(404);
            }
            next(error);
        }
    },

    // @desc    Verify OTP
    // @route   POST /api/v1/auth/verify-otp
    // @access  Public
    verifyOtp: async (req, res, next) => {
        try {
            const { email, otp } = req.body;
            if (!email || !otp) {
                res.status(400);
                throw new Error('Please provide email and OTP');
            }

            const result = await authService.verifyOtp(email, otp);
            res.status(200).json({
                success: true,
                data: result,
            });
        } catch (error) {
            if (error.message === 'Invalid OTP or Token Expired') {
                res.status(400);
            }
            next(error);
        }
    },

    // @desc    Reset Password
    // @route   POST /api/v1/auth/reset-password
    // @access  Public
    resetPassword: async (req, res, next) => {
        try {
            const { email, otp, newPassword, confirmPassword } = req.body;
            if (!email || !otp || !newPassword || !confirmPassword) {
                res.status(400);
                throw new Error('Please provide all details');
            }

            const result = await authService.resetPassword(email, otp, newPassword, confirmPassword);
            res.status(200).json({
                success: true,
                data: result,
            });
        } catch (error) {
            if (error.message === 'Invalid OTP or Token Expired' || error.message === 'Passwords do not match') {
                res.status(400);
            }
            next(error);
        }
    },
};

export default authController;
