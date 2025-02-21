import { Router } from "express";
import { db } from "@db";
import { socialPosts, users, postComments, postReactions } from "@db/schema";
import { eq, desc, and } from "drizzle-orm";
import { z } from "zod";
import multer from "multer";
import path from "path";
import fs from "fs";

const router = Router();

// Configure multer for handling file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(process.cwd(), 'uploads');
    // Create uploads directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
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
});

// Auth middleware for upload endpoint
const requireAuth = (req: any, res: any, next: any) => {
  if (!req.user) {
    return res.status(401).json({ error: "Authentication required" });
  }
  next();
};

// File upload endpoint with auth
router.post("/api/upload", requireAuth, upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    // Generate the URL for the uploaded file
    const fileUrl = `/uploads/${req.file.filename}`;

    res.json({
      url: fileUrl,
      filename: req.file.filename
    });
  } catch (error) {
    console.error("Error uploading file:", error);
    res.status(500).json({ 
      error: "Failed to upload file",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

// Create a new post
router.post("/api/social/posts", async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const schema = z.object({
      content: z.string().min(1),
      type: z.enum(["update", "article", "success_story", "market_insight", "opportunity"]),
      mediaUrls: z.array(z.string()).optional(),
      linkUrl: z.string().url().optional(),
    });

    const data = schema.parse(req.body);

    const post = await db.insert(socialPosts).values({
      userId: req.user.id,
      content: data.content,
      type: data.type,
      mediaUrls: data.mediaUrls || [],
      metadata: data.linkUrl ? { linkUrl: data.linkUrl } : undefined
    }).returning();

    res.json(post[0]);
  } catch (error) {
    console.error("Failed to create post:", error);
    res.status(400).json({ 
      error: "Failed to create post",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

// Get posts feed
router.get("/api/social/posts", async (req, res) => {
  try {
    const posts = await db.query.socialPosts.findMany({
      with: {
        author: {
          columns: {
            id: true,
            email: true,
            businessName: true,
          },
        },
      },
      orderBy: desc(socialPosts.createdAt),
      limit: 20,
    });

    res.json(posts);
  } catch (error) {
    console.error("Failed to fetch posts:", error);
    res.status(500).json({ error: "Failed to fetch posts" });
  }
});

// Add a reaction to a post
router.post("/api/social/posts/:postId/reactions", async (req, res) => {
  try {
    const schema = z.object({
      type: z.enum(["like", "celebrate", "support", "insightful"]),
    });

    const { type } = schema.parse(req.body);
    const postId = parseInt(req.params.postId);

    const existingReaction = await db.query.postReactions.findFirst({
      where: eq(postReactions.postId, postId),
      and: eq(postReactions.userId, req.user!.id),
    });

    if (existingReaction) {
      return res.status(400).json({ error: "Already reacted to this post" });
    }

    const reaction = await db.insert(postReactions).values({
      postId,
      userId: req.user!.id,
      type,
    }).returning();

    res.json(reaction[0]);
  } catch (error) {
    console.error("Failed to add reaction:", error);
    res.status(400).json({ error: "Failed to add reaction" });
  }
});

// Add a comment to a post
router.post("/api/social/posts/:postId/comments", async (req, res) => {
  try {
    const schema = z.object({
      content: z.string().min(1),
      parentCommentId: z.number().optional(),
    });

    const data = schema.parse(req.body);
    const postId = parseInt(req.params.postId);

    const comment = await db.insert(postComments).values({
      ...data,
      postId,
      userId: req.user!.id,
    }).returning();

    res.json(comment[0]);
  } catch (error) {
    console.error("Failed to add comment:", error);
    res.status(400).json({ error: "Failed to add comment" });
  }
});

// Get comments for a post
router.get("/api/social/posts/:postId/comments", async (req, res) => {
  try {
    const postId = parseInt(req.params.postId);

    const comments = await db.query.postComments.findMany({
      where: eq(postComments.postId, postId),
      with: {
        author: {
          columns: {
            id: true,
            email: true,
            businessName: true,
          },
        },
      },
      orderBy: desc(postComments.createdAt),
    });

    res.json(comments);
  } catch (error) {
    console.error("Failed to fetch comments:", error);
    res.status(500).json({ error: "Failed to fetch comments" });
  }
});

export default router;