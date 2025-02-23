import { Router } from "express";
import multer from "multer";
import { authenticateToken } from "../auth";
import { uploadToCloudinary } from "../services/cloudinary";
import { log } from "../vite";

const router = Router();

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

// Upload endpoint
router.post("/upload", authenticateToken, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded"
      });
    }

    log(`Processing file upload: ${req.file.originalname}`);
    const result = await uploadToCloudinary(req.file);

    return res.json({
      success: true,
      url: result.secure_url
    });
  } catch (error) {
    log('Error in upload route:', error);
    return res.status(500).json({
      success: false,
      message: "Failed to upload file"
    });
  }
});

export default router;
