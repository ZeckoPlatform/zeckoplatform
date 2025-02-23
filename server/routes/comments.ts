import { Router } from "express";
import { db } from "@db";
import { postComments, postReactions, socialPosts, users } from "@db/schema";
import { z } from "zod";
import { eq, and, desc } from "drizzle-orm";
import { moderateText } from "../services/content-moderation";

const router = Router();

// Schema for comment creation/editing
const commentSchema = z.object({
  content: z.string().min(1, "Comment cannot be empty").max(1000, "Comment is too long"),
  parentCommentId: z.number().optional(),
});

// Get comments for a post
router.get("/social/posts/:postId/comments", async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const postId = parseInt(req.params.postId);
    if (isNaN(postId)) {
      return res.status(400).json({ error: "Invalid post ID" });
    }

    // Updated query to use the correct column names
    const comments = await db
      .select({
        id: postComments.id,
        content: postComments.content,
        createdAt: postComments.createdAt,
        user: {
          id: users.id,
          email: users.email,
          userType: users.userType,
          businessName: users.businessName,
          profile: users.profile,
        },
      })
      .from(postComments)
      .innerJoin(users, eq(users.id, postComments.userId))
      .where(eq(postComments.postId, postId))
      .orderBy(desc(postComments.createdAt));

    res.json(comments);
  } catch (error) {
    console.error("Error fetching comments:", error);
    res.status(500).json({
      error: "Failed to fetch comments",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

// Create a new comment
router.post("/social/posts/:postId/comments", async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const postId = parseInt(req.params.postId);
    if (isNaN(postId)) {
      return res.status(400).json({ error: "Invalid post ID" });
    }

    const validatedData = commentSchema.parse(req.body);

    // Moderate comment content
    const moderationResult = moderateText(validatedData.content);
    if (!moderationResult.isAcceptable) {
      return res.status(400).json({
        error: "Comment contains inappropriate content",
        details: moderationResult.message
      });
    }

    // Check if post exists and get current engagement
    const [post] = await db
      .select()
      .from(socialPosts)
      .where(eq(socialPosts.id, postId));

    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    // Create comment
    const [newComment] = await db
      .insert(postComments)
      .values({
        postId,
        userId: req.user.id,
        content: moderationResult.filteredText || validatedData.content,
        parentCommentId: validatedData.parentCommentId,
        status: "active"
      })
      .returning();

    // Update post engagement to increment comment count
    const currentEngagement = post.engagement || { views: 0, likes: 0, comments: 0, shares: 0 };
    await db
      .update(socialPosts)
      .set({
        engagement: {
          ...currentEngagement,
          comments: (currentEngagement.comments || 0) + 1
        }
      })
      .where(eq(socialPosts.id, postId));

    // Fetch the created comment with user info
    const commentWithUser = await db
      .select({
        id: postComments.id,
        content: postComments.content,
        createdAt: postComments.createdAt,
        user: {
          id: users.id,
          email: users.email,
          userType: users.userType,
          businessName: users.businessName,
          profile: users.profile,
        },
      })
      .from(postComments)
      .innerJoin(users, eq(users.id, postComments.userId))
      .where(eq(postComments.id, newComment.id))
      .limit(1);

    res.status(201).json(commentWithUser[0]);
  } catch (error) {
    console.error("Error creating comment:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: "Validation failed",
        details: error.errors
      });
    }
    res.status(500).json({
      error: "Failed to create comment",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

// Delete a comment (soft delete by changing status to "hidden")
router.delete("/social/comments/:commentId", async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const commentId = parseInt(req.params.commentId);
    if (isNaN(commentId)) {
      return res.status(400).json({ error: "Invalid comment ID" });
    }

    // Check if comment exists and belongs to user
    const [comment] = await db
      .select()
      .from(postComments)
      .where(
        and(
          eq(postComments.id, commentId),
          eq(postComments.userId, req.user.id)
        )
      );

    if (!comment) {
      return res.status(404).json({ error: "Comment not found or unauthorized" });
    }

    // Soft delete by updating status
    const [updatedComment] = await db
      .update(postComments)
      .set({ status: "hidden" })
      .where(eq(postComments.id, commentId))
      .returning();

    //Update post engagement to decrement comment count
    await db
      .update(socialPosts)
      .set({ engagement: { ...(comment.post.engagement || { views: 0, likes: 0, comments: 0, shares: 0 }), comments: Math.max(0, (comment.post.engagement?.comments || 0) -1)}})
      .where(eq(socialPosts.id, comment.postId));

    res.json(updatedComment);
  } catch (error) {
    console.error("Error deleting comment:", error);
    res.status(500).json({
      error: "Failed to delete comment",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

// Add or update reaction
router.post("/social/posts/:postId/reactions", async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const postId = parseInt(req.params.postId);
    if (isNaN(postId)) {
      return res.status(400).json({ error: "Invalid post ID" });
    }

    const { type } = req.body;
    if (!["like", "celebrate", "support", "insightful"].includes(type)) {
      return res.status(400).json({ error: "Invalid reaction type" });
    }

    // Check if post exists and get current engagement
    const [post] = await db
      .select()
      .from(socialPosts)
      .where(eq(socialPosts.id, postId));

    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    // Check if reaction already exists
    const [existingReaction] = await db
      .select()
      .from(postReactions)
      .where(
        and(
          eq(postReactions.postId, postId),
          eq(postReactions.userId, req.user.id)
        )
      );

    let reaction;
    if (existingReaction) {
      // Update existing reaction
      [reaction] = await db
        .update(postReactions)
        .set({ type })
        .where(eq(postReactions.id, existingReaction.id))
        .returning();
    } else {
      // Create new reaction
      [reaction] = await db
        .insert(postReactions)
        .values({
          postId,
          userId: req.user.id,
          type
        })
        .returning();

      // Update post engagement to increment reaction count
      const currentEngagement = post.engagement || { views: 0, likes: 0, comments: 0, shares: 0 };
      await db
        .update(socialPosts)
        .set({
          engagement: {
            ...currentEngagement,
            likes: (currentEngagement.likes || 0) + 1
          }
        })
        .where(eq(socialPosts.id, postId));
    }

    res.json(reaction);
  } catch (error) {
    console.error("Error managing reaction:", error);
    res.status(500).json({
      error: "Failed to manage reaction",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

// Remove reaction
router.delete("/social/posts/:postId/reactions", async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const postId = parseInt(req.params.postId);
    if (isNaN(postId)) {
      return res.status(400).json({ error: "Invalid post ID" });
    }

    // Get current post engagement
    const [post] = await db
      .select()
      .from(socialPosts)
      .where(eq(socialPosts.id, postId));

    if (post) {
      // Update post engagement to decrement reaction count
      const currentEngagement = post.engagement || { views: 0, likes: 0, comments: 0, shares: 0 };
      await db
        .update(socialPosts)
        .set({
          engagement: {
            ...currentEngagement,
            likes: Math.max(0, (currentEngagement.likes || 0) - 1)
          }
        })
        .where(eq(socialPosts.id, postId));
    }

    // Delete the reaction
    await db
      .delete(postReactions)
      .where(
        and(
          eq(postReactions.postId, postId),
          eq(postReactions.userId, req.user.id)
        )
      );

    res.json({ success: true });
  } catch (error) {
    console.error("Error removing reaction:", error);
    res.status(500).json({
      error: "Failed to remove reaction",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

export default router;