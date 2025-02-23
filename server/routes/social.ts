import { Router } from "express";
import { authenticateToken } from "../auth";
import { db } from "@db";
import { socialPosts, users } from "@db/schema";
import { desc } from "drizzle-orm";
import { z } from "zod";
import { log } from "../vite";

const router = Router();

// Create a new post
router.post("/api/social/posts", authenticateToken, async (req, res) => {
  try {
    log('Received post request body:', req.body);

    const schema = z.object({
      content: z.string().min(1, "Please write something to share"),
      type: z.literal("update")
    });

    const data = schema.parse(req.body);
    log('Validated data:', data);

    const [post] = await db.insert(socialPosts).values({
      userId: req.user!.id,
      content: data.content,
      type: data.type,
      mediaUrls: [],
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();

    log('Created post:', post);
    res.json({ success: true, post });
  } catch (error) {
    log('Error creating post:', error);
    res.status(400).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to create post' 
    });
  }
});

// Get posts feed
router.get("/api/social/posts", authenticateToken, async (req, res) => {
  try {
    const posts = await db.query.socialPosts.findMany({
      orderBy: [desc(socialPosts.createdAt)],
      with: {
        user: true
      }
    });

    res.json({
      success: true,
      posts
    });
  } catch (error) {
    log('Error fetching posts:', error);
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to fetch posts' 
    });
  }
});

export default router;