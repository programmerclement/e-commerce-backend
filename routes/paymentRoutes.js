import express from 'express';
import { 
  createPaymentIntent,
  confirmPayment,
  createMobilePayment,
  verifyMobilePayment,
  getPaymentMethods
} from '../controllers/paymentController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.post('/create-intent', createPaymentIntent);
router.post('/confirm', confirmPayment);
router.post('/mobile/create', createMobilePayment);
router.post('/mobile/verify', verifyMobilePayment);
router.get('/methods', getPaymentMethods);

export default router;