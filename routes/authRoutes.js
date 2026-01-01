import express from 'express';
import { 
  register, 
  login, 
  logout, 
  getMe, 
  updateProfile, 
  updatePassword, 
  forgotPassword, 
  resetPassword,
  verifyEmail,
  resendVerification
} from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';
import { 
  registerValidation, 
  loginValidation, 
  updateProfileValidation 
} from '../middleware/validationMiddleware.js';

const router = express.Router();

// Public routes
router.post('/register', registerValidation, register);
router.post('/login', loginValidation, login);
router.post('/forgot-password', forgotPassword);
router.put('/reset-password/:token', resetPassword);
router.get('/verify-email/:token', verifyEmail);

// Protected routes
router.get('/logout', protect, logout);
router.get('/me', protect, getMe);
router.put('/update-profile', protect, updateProfileValidation, updateProfile);
router.put('/update-password', protect, updatePassword);
router.post('/resend-verification', protect, resendVerification);

export default router;