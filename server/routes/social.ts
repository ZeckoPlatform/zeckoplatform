import { Router } from "express";
import { db } from "@db";
import { socialPosts } from "@db/schema";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";
import multer from "multer";
import path from "path";
import fs from "fs";
import { log } from "../vite";
import { authenticateToken } from "../auth";

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
      const error = new Error("Invalid file type. Only JPEG, PNG and WebP are allowed.") as any;
      error.name = "INVALID_FILE_TYPE";
      cb(error);
    }
  }
});

// File upload endpoint with auth
router.post("/api/upload", authenticateToken, (req, res) => {
  log("Upload request received - User:", req.user?.id);

  upload.single('file')(req, res, (err) => {
    if (err) {
      log("Upload error:", err);
      if (err.name === "INVALID_FILE_TYPE") {
        return res.status(400).json({ error: err.message });
      }
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: "File size should be less than 5MB" });
      }
      return res.status(500).json({ error: "Failed to upload file", details: err.message });
    }

    if (!req.file) {
      log("No file in request");
      return res.status(400).json({ error: "No file uploaded" });
    }

    try {
      // Store the file URL relative to the uploads directory
      const fileUrl = `/uploads/${req.file.filename}`;
      log("File uploaded successfully:", fileUrl);

      // Ensure the file exists after upload
      const filePath = path.join(uploadDir, req.file.filename);
      if (!fs.existsSync(filePath)) {
        throw new Error(`File not found after upload: ${filePath}`);
      }

      res.json({
        url: fileUrl,
        filename: req.file.filename
      });
    } catch (error) {
      log("Error processing uploaded file:", error);
      res.status(500).json({ 
        error: "Failed to process uploaded file",
        details: error instanceof Error ? error.message : "Unknown error"
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
      userId: req.user!.id,
      content: data.content,
      type: data.type,
      mediaUrls: data.mediaUrls || [],
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
    const posts = await db.query.socialPosts.findMany({
      orderBy: desc(socialPosts.createdAt),
      limit: 20,
    });

    res.json(posts);
  } catch (error) {
    log("Failed to fetch posts:", error);
    res.status(500).json({ error: "Failed to fetch posts" });
  }
});

export default router;