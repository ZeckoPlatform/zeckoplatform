import { Router } from "express";
import { authenticateToken } from "../auth";
import { db } from "@db";
import { socialPosts } from "@db/schema";
import { desc } from "drizzle-orm";
import { z } from "zod";
import { log } from "../vite";

const router = Router();

// Create a new post
router.post("/api/social/posts", authenticateToken, async (req, res) => {
  res.setHeader('Content-Type', 'application/json');

  try {
    log('Received post request:', req.body);

    const schema = z.object({
      content: z.string().min(1, "Please write something to share"),
      type: z.enum(["update", "article", "success_story", "market_insight", "opportunity"])
    });

    const validatedData = schema.parse(req.body);
    log('Validated data:', validatedData);

    // Ensure req.user exists
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated"
      });
    }

    const [post] = await db.insert(socialPosts).values({
      content: validatedData.content,
      type: validatedData.type,
      userId: req.user.id,
      mediaUrls: [],
      visibility: "public",
      status: "published",
      engagement: { views: 0, likes: 0, comments: 0, shares: 0 },
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();

    if (!post) {
      return res.status(500).json({
        success: false,
        message: "Failed to create post"
      });
    }

    log('Created post:', post);
    return res.status(201).json({ 
      success: true, 
      data: post 
    });
  } catch (error) {
    log('Error creating post:', error);

    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        success: false, 
        message: error.errors[0].message 
      });
    }

    return res.status(500).json({ 
      success: false, 
      message: "Failed to create post. Please try again." 
    });
  }
});

// Get posts feed
router.get("/api/social/posts", authenticateToken, async (req, res) => {
  res.setHeader('Content-Type', 'application/json');

  try {
    const posts = await db.query.socialPosts.findMany({
      orderBy: [desc(socialPosts.createdAt)],
      with: {
        user: true
      }
    });

    return res.json({
      success: true,
      data: posts
    });
  } catch (error) {
    log('Error fetching posts:', error);
    return res.status(500).json({ 
      success: false, 
      message: "Failed to fetch posts" 
    });
  }
});

export default router;