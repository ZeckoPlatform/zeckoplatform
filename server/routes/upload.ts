import { Router } from "express";
import multer from "multer";
import { authenticateToken } from "../auth";
import { uploadWithModeration } from "../services/content-moderation";
import { log } from "../vite";
import rateLimit from "express-rate-limit";

const router = Router();

// Rate limiting for uploads - 10 images per hour per user
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  message: {
    success: false,
    message: "Too many image uploads. Please try again later."
  }
});

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only images are allowed'));
    }
  }
});

// Upload endpoint with moderation
router.post("/upload", authenticateToken, uploadLimiter, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded"
      });
    }

    // Check if user has required permissions
    const user = req.user;
    if (user?.userType === 'business' && user.verificationStatus !== 'verified') {
      return res.status(403).json({
        success: false,
        message: "Business accounts must be verified before uploading images"
      });
    }

    log(`Processing file upload: ${req.file.originalname}`);
    const result = await uploadWithModeration(req.file);

    return res.json({
      success: true,
      url: result.secure_url
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    log('Error in upload route:', errorMessage);

    return res.status(500).json({
      success: false,
      message: errorMessage === 'Image contains inappropriate content'
        ? "The image contains inappropriate content and cannot be uploaded"
        : "Failed to upload file"
    });
  }
});

export default router;