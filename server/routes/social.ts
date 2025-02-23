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
    log('Received post request:', req.body);

    const schema = z.object({
      content: z.string().min(1, "Please write something to share"),
      type: z.string()
    });

    const validatedData = schema.parse(req.body);
    log('Validated data:', validatedData);

    const [post] = await db.insert(socialPosts).values({
      userId: req.user!.id,
      content: validatedData.content,
      type: validatedData.type,
      mediaUrls: [],
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();

    log('Created post:', post);
    res.setHeader('Content-Type', 'application/json');
    return res.status(201).json({ 
      success: true, 
      data: post 
    });
  } catch (error) {
    console.error("Failed to create post:", error);

    res.setHeader('Content-Type', 'application/json');

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
  try {
    const posts = await db.query.socialPosts.findMany({
      orderBy: [desc(socialPosts.createdAt)],
      with: {
        user: true
      }
    });

    res.setHeader('Content-Type', 'application/json');
    return res.json({
      success: true,
      data: posts
    });
  } catch (error) {
    console.error("Failed to fetch posts:", error);
    res.setHeader('Content-Type', 'application/json');
    return res.status(500).json({ 
      success: false, 
      message: "Failed to fetch posts" 
    });
  }
});

export default router;