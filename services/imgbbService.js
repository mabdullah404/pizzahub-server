import multer from 'multer';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, WEBP, and GIF images are allowed.'));
    }
  },
});

export const uploadMiddleware = upload.single('image');

/**
 * Uploads an image buffer to ImgBB API using IMGBB_API_KEY
 */
export async function uploadToImgBB(fileBuffer, originalName = 'pizza.jpg') {
  const apiKey = process.env.IMGBB_API_KEY;

  if (!apiKey) {
    console.warn('⚠️ IMGBB_API_KEY is not configured in pizzahub-server/.env. Using base64 placeholder.');
    // Return base64 data uri as fallback until key is added
    return `data:image/jpeg;base64,${fileBuffer.toString('base64')}`;
  }

  const base64Data = fileBuffer.toString('base64');
  const formData = new FormData();
  formData.append('image', base64Data);
  formData.append('name', originalName);

  const response = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
    method: 'POST',
    body: formData,
  });

  const data = await response.json();

  if (!data.success) {
    throw new Error(data.error?.message || 'Failed to upload image to ImgBB.');
  }

  return data.data.image?.url || data.data.url || data.data.display_url;
}
