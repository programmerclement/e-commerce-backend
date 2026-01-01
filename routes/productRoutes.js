import express from 'express';
import { 
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  getFeaturedProducts,
  getProductsOnSale,
  getNewArrivals,
  getBestSellers,
  updateStock,
  getProductsByCategory
} from '../controllers/productController.js';
import { protect, adminOnly } from '../middleware/authMiddleware.js';
import { createProductValidation } from '../middleware/validationMiddleware.js';

const router = express.Router();

// Public routes
router.get('/', getProducts);
router.get('/featured', getFeaturedProducts);
router.get('/on-sale', getProductsOnSale);
router.get('/new-arrivals', getNewArrivals);
router.get('/best-sellers', getBestSellers);
router.get('/category/:categoryId', getProductsByCategory);
router.get('/:id', getProduct);

// Protected routes (Admin only)
router.post('/', protect, adminOnly, createProductValidation, createProduct);
router.put('/:id', protect, adminOnly, updateProduct);
router.delete('/:id', protect, adminOnly, deleteProduct);
router.put('/:id/stock', protect, adminOnly, updateStock);

export default router;