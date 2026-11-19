import express from 'express';
import {
  getMenuItems,
  getMenuItemById,
  createMenuItem,
  getVendorMenuItems,
  updateMenuItem,
  deleteMenuItem,
  updateMenuItemStatus,
} from '../controllers/menuController.js';
import { verifyToken } from '../middleware/verifyToken.js';
import { verifyVendor, verifyAdmin, verifyVendorOrAdmin } from '../middleware/verifyRole.js';
import { verifyMenuItemOwnership } from '../middleware/verifyOwnership.js';

const router = express.Router();

// Public routes
router.get('/', getMenuItems);
router.get('/vendor/my-items', verifyToken, verifyVendor, getVendorMenuItems);
router.get('/:id', getMenuItemById);

// Vendor routes
router.post('/', verifyToken, verifyVendor, createMenuItem);
router.put('/:id', verifyToken, verifyVendorOrAdmin, verifyMenuItemOwnership, updateMenuItem);
router.delete('/:id', verifyToken, verifyVendorOrAdmin, verifyMenuItemOwnership, deleteMenuItem);

// Admin route
router.patch('/:id/status', verifyToken, verifyAdmin, updateMenuItemStatus);

export default router;
