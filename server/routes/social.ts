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
// Ensure upload directory exists with proper permissions
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true, mode: 0o755 });
}

log("Upload directory configured:", uploadDir);

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    log("Saving file to:", uploadDir);
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const filename = uniqueSuffix + path.extname(file.originalname);
    log("Generated filename:", filename);
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
      log("File type accepted:", file.mimetype);
      cb(null, true);
    } else {
      log("File type rejected:", file.mimetype);
      cb(new Error("Invalid file type. Only JPEG, PNG and WebP are allowed."));
    }
  }
});

// File upload endpoint with auth
router.post("/api/social/upload", authenticateToken, (req, res) => {
  log("Upload request received - User:", req.user?.id);

  upload.single('file')(req, res, async (err) => {
    try {
      if (err) {
        log("Upload error:", err);
        return res.status(400).json({ 
          error: err.message || "Failed to upload file" 
        });
      }

      if (!req.file) {
        log("No file in request");
        return res.status(400).json({ 
          error: "No file uploaded" 
        });
      }

      const fileUrl = `/uploads/${req.file.filename}`;
      const filePath = path.join(uploadDir, req.file.filename);

      // Verify file exists
      if (!fs.existsSync(filePath)) {
        log("File not found after upload:", filePath);
        return res.status(500).json({ 
          error: "File not saved properly" 
        });
      }

      log("File upload successful:", {
        url: fileUrl,
        filename: req.file.filename
      });

      // Set proper content type header
      res.setHeader('Content-Type', 'application/json');
      return res.json({
        success: true,
        url: fileUrl,
        filename: req.file.filename
      });
    } catch (error) {
      log("Unexpected error during upload:", error);
      res.status(500).json({ 
        error: "Internal server error during upload" 
      });
    }
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

    const post = await db.insert(socialPosts).values({
      content: data.content,
      type: data.type,
      mediaUrls: data.mediaUrls || [],
      userId: req.user!.id,
      ...(data.linkUrl ? { metadata: { linkUrl: data.linkUrl } } : {})
    }).returning();

    res.json(post[0]);
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