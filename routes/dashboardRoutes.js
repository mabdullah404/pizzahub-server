import express from 'express';
import {
  getVendorStats,
  getCustomerStats,
  getAdminStats,
} from '../controllers/dashboardController.js';
import { verifyToken } from '../middleware/verifyToken.js';
import { verifyVendor, verifyCustomer, verifyAdmin } from '../middleware/verifyRole.js';

const router = express.Router();

router.get('/vendor', verifyToken, verifyVendor, getVendorStats);
router.get('/customer', verifyToken, verifyCustomer, getCustomerStats);
router.get('/admin', verifyToken, verifyAdmin, getAdminStats);

export default router;
