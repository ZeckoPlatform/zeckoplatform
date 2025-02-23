import { Router } from "express";
import { authenticateToken } from "../auth";
import { db } from "@db";
import { socialPosts, users } from "@db/schema";
import { desc, eq, and } from "drizzle-orm";
import { z } from "zod";
import { log } from "../vite";

const router = Router();

// Create a new post
router.post("/social/posts", authenticateToken, async (req, res) => {
  try {
    log('Creating new post with data:', JSON.stringify(req.body));

    const schema = z.object({
      content: z.string().min(1, "Please write something to share"),
      type: z.enum(["update", "article", "success_story", "market_insight", "opportunity"]),
      images: z.array(z.string()).optional()
    });

    const validatedData = schema.parse(req.body);

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
      mediaUrls: validatedData.images || [],
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

    // Get user info for the response
    const [user] = await db.select().from(users).where(eq(users.id, req.user.id));

    const postWithUser = {
      ...post,
      user: user ? {
        id: user.id,
        email: user.email,
        userType: user.userType,
        businessName: user.businessName,
        profile: user.profile
      } : null
    };

    log('Created post successfully:', JSON.stringify(postWithUser));
    return res.status(201).json({
      success: true,
      data: postWithUser
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    log('Error creating post:', errorMessage);

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

// Update a post
router.patch("/social/posts/:id", authenticateToken, async (req, res) => {
  try {
    const postId = parseInt(req.params.id);
    if (isNaN(postId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid post ID"
      });
    }

    const schema = z.object({
      content: z.string().min(1, "Please write something to share"),
      type: z.enum(["update", "article", "success_story", "market_insight", "opportunity"]),
      images: z.array(z.string()).optional()
    });

    const validatedData = schema.parse(req.body);

    // Check post ownership
    const [existingPost] = await db
      .select()
      .from(socialPosts)
      .where(eq(socialPosts.id, postId));

    if (!existingPost) {
      return res.status(404).json({
        success: false,
        message: "Post not found"
      });
    }

    if (existingPost.userId !== req.user?.id && req.user?.userType !== 'admin') {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update this post"
      });
    }

    // Update the post
    const [updatedPost] = await db
      .update(socialPosts)
      .set({
        content: validatedData.content,
        type: validatedData.type,
        mediaUrls: validatedData.images || existingPost.mediaUrls,
        updatedAt: new Date()
      })
      .where(eq(socialPosts.id, postId))
      .returning();

    // Get user info for the response
    const [user] = await db.select().from(users).where(eq(users.id, updatedPost.userId));

    const postWithUser = {
      ...updatedPost,
      user: user ? {
        id: user.id,
        email: user.email,
        userType: user.userType,
        businessName: user.businessName,
        profile: user.profile
      } : null
    };

    return res.json({
      success: true,
      data: postWithUser
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    log('Error updating post:', errorMessage);

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: error.errors[0].message
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to update post"
    });
  }
});

// Delete a post
router.delete("/social/posts/:id", authenticateToken, async (req, res) => {
  try {
    const postId = parseInt(req.params.id);
    if (isNaN(postId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid post ID"
      });
    }

    // Check post ownership
    const [existingPost] = await db
      .select()
      .from(socialPosts)
      .where(eq(socialPosts.id, postId));

    if (!existingPost) {
      return res.status(404).json({
        success: false,
        message: "Post not found"
      });
    }

    if (existingPost.userId !== req.user?.id && req.user?.userType !== 'admin') {
      return res.status(403).json({
        success: false,
        message: "Not authorized to delete this post"
      });
    }

    // Delete the post
    await db.delete(socialPosts).where(eq(socialPosts.id, postId));

    return res.json({
      success: true,
      message: "Post deleted successfully"
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    log('Error deleting post:', errorMessage);

    return res.status(500).json({
      success: false,
      message: "Failed to delete post"
    });
  }
});

// Get posts feed
router.get("/social/posts", async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;

    log(`Fetching posts page ${page} with limit ${limit}`);

    // Get posts with user information
    const posts = await db
      .select({
        post: socialPosts,
        user: {
          id: users.id,
          email: users.email,
          userType: users.userType,
          businessName: users.businessName,
          profile: users.profile
        }
      })
      .from(socialPosts)
      .leftJoin(users, eq(socialPosts.userId, users.id))
      .where(eq(socialPosts.visibility, 'public'))
      .orderBy(desc(socialPosts.createdAt))
      .limit(limit)
      .offset(offset);

    log(`Found ${posts.length} posts`);

    return res.json({
      success: true,
      data: posts.map(({ post, user }) => ({
        ...post,
        user: user ? {
          id: user.id,
          email: user.email,
          userType: user.userType,
          businessName: user.businessName,
          profile: user.profile
        } : null
      }))
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    log('Error fetching posts:', errorMessage);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch posts"
    });
  }
});

export default router;