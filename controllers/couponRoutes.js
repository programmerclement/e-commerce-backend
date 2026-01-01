import express from 'express';
import {
  getAllCoupons,
  getActiveCoupons,
  getCouponByCode,
  createCoupon,
  updateCoupon,
  deleteCoupon,
  validateCoupon
} from '../controllers/couponController.js';
import { protect, adminOnly } from '../middleware/authMiddleware.js';
import { createCouponValidation } from '../middleware/validationMiddleware.js';

const router = express.Router();

// Public routes
router.get('/active', getActiveCoupons);
router.get('/code/:code', getCouponByCode);

// Protected routes
router.post('/validate', protect, validateCoupon);

// Admin routes
router.get('/', adminOnly, getAllCoupons);
router.post('/', adminOnly, createCouponValidation, createCoupon);
router.put('/:id', adminOnly, updateCoupon);
router.delete('/:id', adminOnly, deleteCoupon);

export default router;