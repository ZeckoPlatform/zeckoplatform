import { Router } from "express";
import { authenticateToken } from "../auth";
import { db } from "@db";
import { socialPosts } from "@db/schema";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";
import multer from "multer";
import path from "path";
import fs from "fs";
import { log } from "../vite";

const router = Router();

// Configure multer for handling file uploads
const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true, mode: 0o755 });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const filename = uniqueSuffix + path.extname(file.originalname);
    cb(null, filename);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Only JPEG, PNG and WebP are allowed."));
    }
  }
}).single('file');

// File upload endpoint with auth
router.post("/api/social/upload", authenticateToken, (req, res) => {
  upload(req, res, function(err) {
    // Set JSON content type for all responses
    res.setHeader('Content-Type', 'application/json');

    if (err instanceof multer.MulterError) {
      // A Multer error occurred when uploading
      log("Multer error:", err);
      return res.status(400).json({
        success: false,
        error: err.message
      });
    } else if (err) {
      // An unknown error occurred
      log("Upload error:", err);
      return res.status(400).json({
        success: false,
        error: err.message || "File upload failed"
      });
    }

    // Check if file exists in request
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: "No file uploaded"
      });
    }

    const fileUrl = `/uploads/${req.file.filename}`;
    const filePath = path.join(uploadDir, req.file.filename);

    // Verify file was saved
    if (!fs.existsSync(filePath)) {
      return res.status(500).json({
        success: false,
        error: "File was not saved properly"
      });
    }

    // Return success response
    return res.json({
      success: true,
      url: fileUrl,
      filename: req.file.filename
    });
  });
});

// Create a new post
router.post("/api/social/posts", authenticateToken, async (req, res) => {
  try {
    const schema = z.object({
      content: z.string().min(1),
      type: z.enum(["update", "article", "success_story", "market_insight", "opportunity"]),
      mediaUrls: z.array(z.string()).optional(),
      linkUrl: z.string().url().optional(),
    });

    const data = schema.parse(req.body);

    const [post] = await db.insert(socialPosts).values({
      content: data.content,
      type: data.type,
      mediaUrls: data.mediaUrls || [],
      userId: req.user!.id,
      ...(data.linkUrl ? { metadata: { linkUrl: data.linkUrl } } : {})
    }).returning();

    res.json(post);
  } catch (error) {
    log("Failed to create post:", error);
    res.status(400).json({ 
      error: "Failed to create post",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

// Get posts feed
router.get("/api/social/posts", async (req, res) => {
  try {
    const posts = await db.select().from(socialPosts).orderBy(desc(socialPosts.createdAt)).limit(20);
    res.json(posts);
  } catch (error) {
    log("Failed to fetch posts:", error);
    res.status(500).json({ error: "Failed to fetch posts" });
  }
});

export default router;