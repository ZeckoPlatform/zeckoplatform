import { Router } from "express";
import { authenticateToken } from "../auth";
import { db } from "@db";
import { socialPosts } from "@db/schema";
import { desc } from "drizzle-orm";
import { z } from "zod";
import { log } from "../vite";

const router = Router();

// Create a new post
router.post("/social/posts", authenticateToken, async (req, res) => {
  try {
    log('Received post request with body: ' + JSON.stringify(req.body));

    const schema = z.object({
      content: z.string().min(1, "Please write something to share"),
      type: z.enum(["update", "article", "success_story", "market_insight", "opportunity"])
    });

    const validatedData = schema.parse(req.body);

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
      log('Failed to create post - no post returned');
      return res.status(500).json({
        success: false,
        message: "Failed to create post"
      });
    }

    log('Created post successfully: ' + JSON.stringify(post));
    return res.status(201).json({ 
      success: true, 
      data: post 
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    log('Error creating post: ' + errorMessage);

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
router.get("/social/posts", authenticateToken, async (req, res) => {
  try {
    const posts = await db.select().from(socialPosts).orderBy(desc(socialPosts.createdAt));

    return res.json({
      success: true,
      data: posts
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    log('Error fetching posts: ' + errorMessage);
    return res.status(500).json({ 
      success: false, 
      message: "Failed to fetch posts" 
    });
  }
});

export default router;