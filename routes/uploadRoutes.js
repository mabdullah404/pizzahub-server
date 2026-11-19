import express from 'express';
import { uploadMiddleware, uploadToImgBB } from '../services/imgbbService.js';
import { verifyToken } from '../middleware/verifyToken.js';

const router = express.Router();

/**
 * Upload Image endpoint
 * Protected by verifyToken
 */
router.post('/', verifyToken, (req, res) => {
  uploadMiddleware(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ success: false, message: err.message });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please select an image file to upload.' });
    }

    try {
      const imageUrl = await uploadToImgBB(req.file.buffer, req.file.originalname);
      res.json({
        success: true,
        message: 'Image uploaded successfully!',
        url: imageUrl,
      });
    } catch (error) {
      console.error('❌ [upload] Error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Image upload failed.',
      });
    }
  });
});

export default router;
