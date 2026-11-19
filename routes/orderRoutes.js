import express from 'express';
import {
  createOrder,
  getCustomerOrders,
  getVendorOrders,
  updateOrderStatusByVendor,
  cancelOrderByCustomer,
} from '../controllers/orderController.js';
import { verifyToken } from '../middleware/verifyToken.js';
import { verifyCustomer, verifyVendor } from '../middleware/verifyRole.js';
import {
  verifyOrderVendorOwnership,
  verifyOrderCustomerOwnership,
} from '../middleware/verifyOwnership.js';

const router = express.Router();

// Customer creates an order
router.post('/', verifyToken, verifyCustomer, createOrder);

// Customer gets own orders
router.get('/customer/my-orders', verifyToken, verifyCustomer, getCustomerOrders);

// Customer cancels an order (only if pending)
router.patch(
  '/:id/cancel',
  verifyToken,
  verifyCustomer,
  verifyOrderCustomerOwnership,
  cancelOrderByCustomer
);

// Vendor gets incoming orders
router.get('/vendor/my-orders', verifyToken, verifyVendor, getVendorOrders);

// Vendor accepts/rejects order (only if pending, only once)
router.patch(
  '/:id/status',
  verifyToken,
  verifyVendor,
  verifyOrderVendorOwnership,
  updateOrderStatusByVendor
);

export default router;
