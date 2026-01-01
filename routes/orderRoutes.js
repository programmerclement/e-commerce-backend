import express from 'express';
import { 
  createOrder,
  getOrders,
  getOrder,
  updateOrderStatus,
  cancelOrder,
  getMyOrders,
  getOrderById
} from '../controllers/orderController.js';
import { protect, adminOnly } from '../middleware/authMiddleware.js';
import { createOrderValidation } from '../middleware/validationMiddleware.js';

const router = express.Router();

// All order routes require authentication
router.use(protect);

// User routes
router.post('/', createOrderValidation, createOrder);
router.get('/my-orders', getMyOrders);
router.get('/:id', getOrderById);
router.put('/:id/cancel', cancelOrder);

// Admin routes
router.get('/', adminOnly, getOrders);
router.get('/admin/:id', adminOnly, getOrder);
router.put('/:id/status', adminOnly, updateOrderStatus);

export default router;