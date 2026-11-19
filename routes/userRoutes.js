import express from 'express';
import {
  getCurrentUser,
  updateProfile,
  getAllUsers,
  blockUser,
  unblockUser,
} from '../controllers/userController.js';
import { verifyToken } from '../middleware/verifyToken.js';
import { verifyAdmin } from '../middleware/verifyRole.js';

const router = express.Router();

// Current logged in user routes
router.get('/me', verifyToken, getCurrentUser);
router.put('/profile', verifyToken, updateProfile);

// Admin user management routes
router.get('/', verifyToken, verifyAdmin, getAllUsers);
router.patch('/:id/block', verifyToken, verifyAdmin, blockUser);
router.patch('/:id/unblock', verifyToken, verifyAdmin, unblockUser);

export default router;
