import { Router } from "express";
import { db } from "@db";
import { postComments, postReactions, socialPosts } from "@db/schema";
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
router.get("/posts/:postId/comments", async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const postId = parseInt(req.params.postId);
    if (isNaN(postId)) {
      return res.status(400).json({ error: "Invalid post ID" });
    }

    const comments = await db.query.postComments.findMany({
      where: eq(postComments.postId, postId),
      orderBy: desc(postComments.createdAt),
      with: {
        user: {
          columns: {
            id: true,
            profile: true,
            businessName: true,
          }
        }
      }
    });

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
router.post("/posts/:postId/comments", async (req, res) => {
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

    // Check if post exists
    const [post] = await db
      .select()
      .from(socialPosts)
      .where(eq(socialPosts.id, postId));

    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    // Create comment
    const [newComment] = await db.insert(postComments)
      .values({
        postId,
        userId: req.user.id,
        content: moderationResult.filteredText || validatedData.content,
        parentCommentId: validatedData.parentCommentId,
        status: "active"
      })
      .returning();

    // Get comment with user info
    const commentWithUser = await db.query.postComments.findFirst({
      where: eq(postComments.id, newComment.id),
      with: {
        user: {
          columns: {
            id: true,
            profile: true,
            businessName: true,
          }
        }
      }
    });

    res.status(201).json(commentWithUser);
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
router.delete("/comments/:commentId", async (req, res) => {
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
router.post("/posts/:postId/reactions", async (req, res) => {
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

    // Check if post exists
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
      const [updatedReaction] = await db
        .update(postReactions)
        .set({ type })
        .where(eq(postReactions.id, existingReaction.id))
        .returning();
      reaction = updatedReaction;
    } else {
      // Create new reaction
      const [newReaction] = await db
        .insert(postReactions)
        .values({
          postId,
          userId: req.user.id,
          type
        })
        .returning();
      reaction = newReaction;
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
router.delete("/posts/:postId/reactions", async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const postId = parseInt(req.params.postId);
    if (isNaN(postId)) {
      return res.status(400).json({ error: "Invalid post ID" });
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
