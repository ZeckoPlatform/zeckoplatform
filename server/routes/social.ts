import { Router } from "express";
import { db } from "@db";
import { socialPosts, users, postComments, postReactions } from "@db/schema";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";

const router = Router();

// Create a new post
router.post("/api/social/posts", async (req, res) => {
  try {
    const schema = z.object({
      content: z.string().min(1),
      type: z.enum(["update", "article", "success_story", "market_insight", "opportunity"]),
      mediaUrls: z.array(z.string()).optional(),
    });

    const data = schema.parse(req.body);
    const post = await db.insert(socialPosts).values({
      ...data,
      userId: req.user!.id,
    }).returning();

    res.json(post[0]);
  } catch (error) {
    console.error("Failed to create post:", error);
    res.status(400).json({ error: "Failed to create post" });
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
