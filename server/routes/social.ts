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
  destination: uploadDir,
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(null, false);
    }
  }
}).single('file');

// File upload endpoint with auth
router.post("/api/social/upload", authenticateToken, (req, res) => {
  upload(req, res, function(err) {
    res.setHeader('Content-Type', 'application/json');

    if (err) {
      console.error("Upload error:", err);
      return res.status(400).json({
        success: false,
        error: err.message || "File upload failed"
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: "Please upload a valid image file (JPEG, PNG or WebP)"
      });
    }

    const fileUrl = `/uploads/${req.file.filename}`;

    res.json({
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