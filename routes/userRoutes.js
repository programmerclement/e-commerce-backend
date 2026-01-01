import express from 'express';
import {
  getAllUsers,
  getUser,
  updateUser,
  deleteUser,
  updateUserRole,
  addAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
  addToWishlist,
  removeFromWishlist,
  getWishlist,
  getUserStats
} from '../controllers/userController.js';
import { protect, adminOnly } from '../middleware/authMiddleware.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// User profile routes
router.get('/profile', getUser);
router.put('/profile', updateUser);

// Address routes
router.post('/addresses', addAddress);
router.put('/addresses/:addressId', updateAddress);
router.delete('/addresses/:addressId', deleteAddress);
router.put('/addresses/:addressId/default', setDefaultAddress);

// Wishlist routes
router.get('/wishlist', getWishlist);
router.post('/wishlist/:productId', addToWishlist);
router.delete('/wishlist/:productId', removeFromWishlist);

// Admin only routes
router.get('/', adminOnly, getAllUsers);
router.get('/stats', adminOnly, getUserStats);
router.put('/:id/role', adminOnly, updateUserRole);
router.delete('/:id', adminOnly, deleteUser);

export default router;