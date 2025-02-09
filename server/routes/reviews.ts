import { Router } from "express";
import { authenticateToken } from "../auth";
import { db } from "@db";
import { reviews, reviewVotes, reputationScores, users } from "@db/schema";
import { eq, and, avg, count } from "drizzle-orm";
import { z } from "zod";

const router = Router();

// Create a new review
router.post("/reviews", authenticateToken, async (req, res) => {
  try {
    const { targetId, rating, content } = req.body;

    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Validate input
    if (rating < 1 || rating > 5) {
      return res.status(400).json({ message: "Rating must be between 1 and 5" });
    }

    // Check if user has already reviewed this target
    const [existingReview] = await db
      .select()
      .from(reviews)
      .where(
        and(
          eq(reviews.userId, req.user.id),
          eq(reviews.targetId, targetId)
        )
      );

    if (existingReview) {
      return res.status(400).json({ message: "You have already reviewed this user" });
    }

    // Create review
    const [review] = await db
      .insert(reviews)
      .values({
        userId: req.user.id,
        targetId,
        rating,
        content,
      })
      .returning();

    // Update reputation score
    await updateReputationScore(targetId);

    res.status(201).json(review);
  } catch (error) {
    console.error("Review creation error:", error);
    res.status(500).json({ message: "Failed to create review" });
  }
});

// Get reviews for a user
router.get("/reviews/:userId", async (req, res) => {
  try {
    const userReviews = await db.query.reviews.findMany({
      where: eq(reviews.targetId, parseInt(req.params.userId)),
      with: {
        author: true,
      },
      orderBy: (reviews, { desc }) => [desc(reviews.createdAt)],
    });

    res.json(userReviews);
  } catch (error) {
    console.error("Reviews fetch error:", error);
    res.status(500).json({ message: "Failed to fetch reviews" });
  }
});

// Moderate a review (admin only)
router.patch("/reviews/:reviewId/moderate", authenticateToken, async (req, res) => {
  try {
    if (!req.user?.userType.includes("admin")) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    const { status, moderationNotes } = req.body;

    const [review] = await db
      .update(reviews)
      .set({
        status,
        moderationNotes,
        moderatedBy: req.user.id,
        updatedAt: new Date(),
      })
      .where(eq(reviews.id, parseInt(req.params.reviewId)))
      .returning();

    if (review) {
      await updateReputationScore(review.targetId);
    }

    res.json(review);
  } catch (error) {
    console.error("Review moderation error:", error);
    res.status(500).json({ message: "Failed to moderate review" });
  }
});

// Vote on a review
router.post("/reviews/:reviewId/vote", authenticateToken, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { voteType } = req.body;

    if (!["helpful", "unhelpful"].includes(voteType)) {
      return res.status(400).json({ message: "Invalid vote type" });
    }

    // Check if user has already voted
    const [existingVote] = await db
      .select()
      .from(reviewVotes)
      .where(
        and(
          eq(reviewVotes.reviewId, parseInt(req.params.reviewId)),
          eq(reviewVotes.userId, req.user.id)
        )
      );

    if (existingVote) {
      // Update existing vote
      const [vote] = await db
        .update(reviewVotes)
        .set({ voteType })
        .where(eq(reviewVotes.id, existingVote.id))
        .returning();
      return res.json(vote);
    }

    // Create new vote
    const [vote] = await db
      .insert(reviewVotes)
      .values({
        reviewId: parseInt(req.params.reviewId),
        userId: req.user.id,
        voteType,
      })
      .returning();

    res.status(201).json(vote);
  } catch (error) {
    console.error("Review vote error:", error);
    res.status(500).json({ message: "Failed to vote on review" });
  }
});

// Get reputation score for a user
router.get("/reputation/:userId", async (req, res) => {
  try {
    const [reputation] = await db
      .select()
      .from(reputationScores)
      .where(eq(reputationScores.userId, parseInt(req.params.userId)));

    if (!reputation) {
      return res.status(404).json({ message: "Reputation score not found" });
    }

    res.json(reputation);
  } catch (error) {
    console.error("Reputation fetch error:", error);
    res.status(500).json({ message: "Failed to fetch reputation score" });
  }
});

// Helper function to update reputation score
async function updateReputationScore(userId: number) {
  try {
    // Calculate metrics
    const result = await db
      .select({
        avgRating: avg(reviews.rating),
        totalReviews: count(reviews.id),
      })
      .from(reviews)
      .where(
        and(
          eq(reviews.targetId, userId),
          eq(reviews.status, "approved")
        )
      );

    const { avgRating, totalReviews } = result[0];

    // Calculate response and completion rates (placeholder logic)
    const responseRate = 0.8; // This should be calculated based on actual response data
    const completionRate = 0.9; // This should be calculated based on actual completion data

    // Calculate overall score (weighted average)
    const weights = {
      rating: 0.4,
      response: 0.3,
      completion: 0.3,
    };

    const overallScore =
      (Number(avgRating) / 5) * weights.rating +
      responseRate * weights.response +
      completionRate * weights.completion;

    // Update or create reputation score
    await db
      .insert(reputationScores)
      .values({
        userId,
        overallScore,
        totalReviews,
        averageRating: avgRating || 0,
        responseRate,
        completionRate,
      })
      .onConflictDoUpdate({
        target: [reputationScores.userId],
        set: {
          overallScore,
          totalReviews,
          averageRating: avgRating || 0,
          responseRate,
          completionRate,
          updatedAt: new Date(),
        },
      });
  } catch (error) {
    console.error("Reputation update error:", error);
    throw error;
  }
}

export default router;
