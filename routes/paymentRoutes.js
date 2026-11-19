import express from 'express';
import {
  createCheckoutSession,
  handleStripeWebhook,
  confirmPaymentSession,
  getAllTransactions,
} from '../controllers/paymentController.js';
import { verifyToken } from '../middleware/verifyToken.js';
import { verifyVendor, verifyAdmin } from '../middleware/verifyRole.js';

const router = express.Router();

// Vendor checkout session creation
router.post('/create-checkout-session', verifyToken, verifyVendor, createCheckoutSession);

// Confirm / fallback verification on return
router.post('/confirm', verifyToken, verifyVendor, confirmPaymentSession);

// Admin: View all transactions
router.get('/transactions', verifyToken, verifyAdmin, getAllTransactions);

export default router;
