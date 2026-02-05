import express from 'express';
import authController from '../controllers/auth.controller.js';
import { protect } from '../middlewares/auth.middleware.js';

import { validate } from '../middlewares/validate.middleware.js';
import {
    registerValidation,
    loginValidation,
    forgotPasswordValidation,
    verifyOtpValidation,
    resetPasswordValidation,
} from '../validations/auth.validation.js';

const router = express.Router();

router.post('/register', registerValidation, validate, authController.register);
router.post('/login', loginValidation, validate, authController.login);
router.post('/forgot-password', forgotPasswordValidation, validate, authController.forgotPassword);
router.post('/verify-otp', verifyOtpValidation, validate, authController.verifyOtp);
router.post('/reset-password', resetPasswordValidation, validate, authController.resetPassword);
router.post('/logout', protect, authController.logout);

export default router;
