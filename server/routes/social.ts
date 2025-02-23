import { Router } from "express";
import { authenticateToken } from "../auth";
import { db } from "@db";
import { socialPosts } from "@db/schema";
import { eq, desc, sql } from "drizzle-orm";
import { z } from "zod";
import multer from "multer";
import { log } from "../vite";
import { uploadToCloudinary } from "../services/cloudinary";

const router = Router();

// Configure multer for memory storage instead of disk
const upload = multer({
  storage: multer.memoryStorage(),
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
  upload(req, res, async (err) => {
    try {
      if (err instanceof multer.MulterError) {
        log('Multer error during upload:', err);
        return res.status(400).json({
          success: false,
          error: err.message || "File upload failed"
        });
      }

      if (err) {
        log('General error during upload:', err);
        return res.status(400).json({
          success: false,
          error: "File upload failed"
        });
      }

      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: "Please upload a valid image file (JPEG, PNG or WebP)"
        });
      }

      // Upload to Cloudinary
      const result = await uploadToCloudinary(req.file);

      return res.status(200).json({
        success: true,
        url: result.secure_url,
        public_id: result.public_id
      });
    } catch (error) {
      log('Unexpected error during file upload:', error);
      return res.status(500).json({
        success: false,
        error: "An unexpected error occurred during file upload"
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

// Get posts feed with pagination
router.get("/api/social/posts", async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const posts = await db
      .select()
      .from(socialPosts)
      .orderBy(desc(socialPosts.createdAt))
      .limit(limit)
      .offset(offset);

    const total = await db
      .select({ count: sql`count(*)` })
      .from(socialPosts);

    res.json({
      posts,
      pagination: {
        page,
        limit,
        total: total[0].count,
        hasMore: offset + posts.length < total[0].count
      }
    });
  } catch (error) {
    log("Failed to fetch posts:", error);
    res.status(500).json({ error: "Failed to fetch posts" });
  }
});

export default router;