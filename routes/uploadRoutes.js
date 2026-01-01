import express from 'express';
import { 
  uploadImage, 
  uploadMultipleImages, 
  deleteImage 
} from '../controllers/uploadController.js';
import { protect, adminOnly } from '../middleware/authMiddleware.js';
import { uploadSingle, uploadMultiple, handleUploadError } from '../middleware/uploadMiddleware.js';

const router = express.Router();

router.use(protect);

// Single image upload
router.post('/single', uploadSingle('image'), handleUploadError, uploadImage);

// Multiple images upload
router.post('/multiple', uploadMultiple('images', 10), handleUploadError, uploadMultipleImages);

// Delete image (Admin only)
router.delete('/:publicId', adminOnly, deleteImage);

export default router;