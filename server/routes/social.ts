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
    const schema = z.object({
      content: z.string().min(1, "Post content is required"),
      type: z.enum(["update"]).default("update")
    });

    const data = schema.parse(req.body);

    const [post] = await db.insert(socialPosts).values({
      userId: req.user!.id,
      content: data.content,
      type: data.type,
      mediaUrls: [],
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();

    res.json({ success: true, post });
  } catch (error) {
    log('Error creating post:', error);
    res.status(400).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to create post' 
    });
  }
});

// Get posts feed with pagination and user info
router.get("/api/social/posts", async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const posts = await db.query.socialPosts.findMany({
      limit,
      offset,
      orderBy: [desc(socialPosts.createdAt)],
      with: {
        user: true
      }
    });

    const [{ count }] = await db.select({
      count: sql<number>`count(*)::int`
    }).from(socialPosts);

    res.json({
      success: true,
      posts,
      pagination: {
        page,
        limit,
        total: count,
        hasMore: offset + posts.length < count
      }
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