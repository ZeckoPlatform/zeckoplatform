import { Router } from "express";
import { authenticateToken } from "../auth";
import { db } from "@db";
import { socialPosts } from "@db/schema";
import { desc, sql } from "drizzle-orm";
import { z } from "zod";
import { log } from "../vite";

const router = Router();

// Create a new post
router.post("/api/social/posts", authenticateToken, async (req, res) => {
  try {
    const schema = z.object({
      content: z.string().min(1),
      type: z.string(),
      mediaUrls: z.array(z.string()).default([])
    });

    const data = schema.parse(req.body);

    const [post] = await db.insert(socialPosts).values({
      content: data.content,
      type: data.type,
      mediaUrls: data.mediaUrls,
      userId: req.user!.id,
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

// Get posts feed with pagination
router.get("/api/social/posts", async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const [posts, totalResult] = await Promise.all([
      db.select()
        .from(socialPosts)
        .orderBy(desc(socialPosts.createdAt))
        .limit(limit)
        .offset(offset),
      db.select({ count: sql<number>`count(*)::int` })
        .from(socialPosts)
    ]);

    res.json({
      success: true,
      posts,
      pagination: {
        page,
        limit,
        total: totalResult[0].count,
        hasMore: offset + posts.length < totalResult[0].count
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