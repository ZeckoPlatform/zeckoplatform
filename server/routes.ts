import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import { setupAuth, authenticateToken } from "./auth";
import { db } from "@db";
import { leads, users, subscriptions, products, leadResponses } from "@db/schema";
import { eq, and, or, gt, not } from "drizzle-orm";
import { log } from "./vite";
import { comparePasswords, hashPassword } from './auth'; // Assuming these functions exist
import fs from 'fs';
import express from 'express';

declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

export function registerRoutes(app: Express): Server {
  setupAuth(app);

  app.use('/api', (req, res, next) => {
    if (req.path.endsWith('/login') || 
        req.path.endsWith('/register') || 
        req.path.endsWith('/auth/verify') || 
        req.method === 'OPTIONS') {
      return next();
    }
    authenticateToken(req, res, next);
  });

  // DELETE /api/leads/:id - Delete a lead
  app.delete("/api/leads/:id", async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const leadId = parseInt(req.params.id);
      const [lead] = await db.select().from(leads).where(eq(leads.id, leadId));

      if (!lead) {
        return res.status(404).json({ message: "Lead not found" });
      }

      if (lead.user_id !== req.user.id) {
        return res.status(403).json({ message: "You can only delete your own leads" });
      }

      await db.delete(leads).where(eq(leads.id, leadId));
      res.json({ message: "Lead deleted successfully" });
    } catch (error) {
      log(`Lead deletion error: ${error instanceof Error ? error.message : String(error)}`);
      console.error('Full error:', error);
      res.status(500).json({ 
        message: "Failed to delete lead",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // PATCH /api/leads/:id - Update a lead
  app.patch("/api/leads/:id", async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const leadId = parseInt(req.params.id);
      const [lead] = await db.select().from(leads).where(eq(leads.id, leadId));

      if (!lead) {
        return res.status(404).json({ message: "Lead not found" });
      }

      if (lead.user_id !== req.user.id) {
        return res.status(403).json({ message: "You can only update your own leads" });
      }

      const [updatedLead] = await db.update(leads)
        .set({
          title: req.body.title,
          description: req.body.description,
          category: req.body.category,
          budget: req.body.budget,
          location: req.body.location,
        })
        .where(eq(leads.id, leadId))
        .returning();

      res.json(updatedLead);
    } catch (error) {
      log(`Lead update error: ${error instanceof Error ? error.message : String(error)}`);
      console.error('Full error:', error);
      res.status(500).json({ 
        message: "Failed to update lead",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // POST /api/leads - Create a new lead
  app.post("/api/leads", async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      log(`Creating lead for user ${req.user.id} (${req.user.userType})`);

      if (req.user.userType !== "free") {
        return res.status(403).json({ message: "Only free users can create leads" });
      }

      // Add expiration date (30 days from now)
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);

      const newLead = {
        user_id: req.user.id,
        title: req.body.title,
        description: req.body.description,
        category: req.body.category,
        budget: parseInt(req.body.budget),
        location: req.body.location,
        status: "open" as const,
        expires_at: expiresAt,
      };

      log(`Attempting to create lead: ${JSON.stringify(newLead)}`);

      const [lead] = await db.insert(leads)
        .values(newLead)
        .returning();

      log(`Lead created successfully: ${JSON.stringify(lead)}`);
      res.status(201).json(lead);
    } catch (error) {
      log(`Lead creation error: ${error instanceof Error ? error.message : String(error)}`);
      console.error('Full error:', error);
      res.status(500).json({ 
        message: "Failed to create lead",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // GET /api/leads - Get all leads (with expiration filter)
  app.get("/api/leads", async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      log(`Fetching leads for user ${req.user.id} (${req.user.userType})`);

      let query = db.select()
        .from(leads)
        .where(
          // Only show non-expired leads
          or(
            eq(leads.status, "closed"),
            gt(leads.expires_at, new Date())
          )
        );

      // If user is "free", only show their own leads
      // For business users, show all active leads
      if (req.user.userType === "free") {
        query = query.where(eq(leads.user_id, req.user.id));
      } else if (req.user.userType === "business") {
        // For business users, only show open leads
        query = query.where(eq(leads.status, "open"));
      }

      let fetchedLeads = await query;

      // For business users, sort leads by match score
      if (req.user.userType === "business" && req.user.profile?.matchPreferences) {
        const { calculateMatchScore } = await import("./utils/matching");
        fetchedLeads = fetchedLeads.map(lead => ({
          ...lead,
          matchScore: calculateMatchScore(lead, req.user),
        })).sort((a, b) => b.matchScore.totalScore - a.matchScore.totalScore);
      }

      log(`Successfully fetched ${fetchedLeads.length} leads`);

      res.json(fetchedLeads);
    } catch (error) {
      log(`Leads fetch error: ${error instanceof Error ? error.message : String(error)}`);
      console.error('Full error:', error);
      res.status(500).json({ 
        message: "Failed to fetch leads",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  app.get("/api/auth/verify", (req, res) => {
    if (req.isAuthenticated() && req.user) {
      log(`Verified auth for user: ${req.user.id}, Session: ${req.sessionID}`);
      res.json({ 
        authenticated: true, 
        user: req.user,
        sessionId: req.sessionID 
      });
    } else {
      log(`Auth verification failed - Session: ${req.sessionID}`);
      res.status(401).json({ authenticated: false });
    }
  });

  app.post("/api/subscriptions", async (req, res) => {
    if (!req.user || !["business", "vendor"].includes(req.user.userType)) {
      return res.status(403).json({ message: "Invalid user type for subscription" });
    }

    try {
      // Check if this is a development/test account
      const isTestAccount = process.env.NODE_ENV === 'development' && req.user.id === 1;

      if (!isTestAccount) {
        // Regular user flow - should include Stripe payment
        return res.status(400).json({ 
          message: "Subscription requires payment processing. Please use the Stripe checkout flow.",
          setupRequired: true
        });
      }

      // Test account flow - direct activation without payment
      const subscription = await db.insert(subscriptions).values({
        user_id: req.user.id,
        tier: req.user.userType as "business" | "vendor",
        status: "active",
        start_date: new Date(),
        end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        auto_renew: true,
        price: req.user.userType === "business" ? 2999 : 4999, // prices in cents
      }).returning();

      await db.update(users)
        .set({
          subscriptionActive: true,
          subscriptionTier: req.user.userType as "business" | "vendor",
          subscriptionEndsAt: subscription[0].end_date,
        })
        .where(eq(users.id, req.user.id));

      res.json(subscription[0]);
    } catch (error) {
      log(`Subscription creation error: ${error instanceof Error ? error.message : String(error)}`);
      console.error('Full error:', error);
      res.status(500).json({ 
        message: "Failed to create subscription",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  app.get("/api/subscriptions/current", async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    try {
      // First get the user's current subscription status
      const [currentUser] = await db.select({
        subscriptionActive: users.subscriptionActive,
        subscriptionTier: users.subscriptionTier,
        subscriptionEndsAt: users.subscriptionEndsAt,
      })
      .from(users)
      .where(eq(users.id, req.user.id));

      // Then get the actual subscription record if it exists
      const [subscription] = await db.select({
        id: subscriptions.id,
        tier: subscriptions.tier,
        status: subscriptions.status,
        start_date: subscriptions.start_date,
        end_date: subscriptions.end_date,
        auto_renew: subscriptions.auto_renew,
        price: subscriptions.price,
      })
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.user_id, req.user.id),
          eq(subscriptions.status, "active")
        )
      )
      .orderBy(subscriptions.start_date, 'desc')
      .limit(1);

      // Return both user subscription status and subscription details
      res.json({
        status: {
          isActive: currentUser.subscriptionActive,
          tier: currentUser.subscriptionTier,
          endsAt: currentUser.subscriptionEndsAt,
        },
        subscription: subscription || null
      });
    } catch (error) {
      log(`Subscription fetch error: ${error instanceof Error ? error.message : String(error)}`);
      console.error('Full error:', error);
      res.status(500).json({ 
        message: "Failed to fetch subscription",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  app.post("/api/subscriptions/cancel", async (req, res) => {
    if(!req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    try {
      const [subscription] = await db.update(subscriptions)
        .set({ status: "cancelled" })
        .where(
          and(
            eq(subscriptions.user_id, req.user.id),
            eq(subscriptions.status, "active")
          )
        )
        .returning();

      if (subscription) {
        await db.update(users)
          .set({
            subscriptionActive: false,
            subscriptionTier: "none",
          })
          .where(eq(users.id, req.user.id));
      }

      res.json(subscription || null);
    } catch (error) {
      log(`Subscription cancellation error: ${error instanceof Error ? error.message : String(error)}`);
      console.error('Full error:', error);
      res.status(500).json({ 
        message: "Failed to cancel subscription",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Update the product creation endpoint to handle decimal prices correctly
  app.post("/api/products", async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      log(`Creating product for user ${req.user.id} (${req.user.userType})`);

      // Convert price from decimal string to cents
      const priceInCents = Math.round(parseFloat(req.body.price) * 100);
      if (isNaN(priceInCents)) {
        log(`Invalid price format: ${req.body.price}`);
        return res.status(400).json({ message: "Invalid price format" });
      }

      log(`Attempting to create product with price: ${priceInCents} cents`);

      const product = await db.insert(products).values({
        vendorId: req.user.id,
        title: req.body.title,
        description: req.body.description,
        price: priceInCents,
        category: req.body.category,
        imageUrl: req.body.imageUrl,
      }).returning();

      // Convert price back to decimal for response
      const productWithDecimalPrice = {
        ...product[0],
        price: (product[0].price / 100).toFixed(2),
      };

      log(`Product created successfully: ${JSON.stringify(productWithDecimalPrice)}`);
      res.json(productWithDecimalPrice);
    } catch (error) {
      log(`Product creation error: ${error instanceof Error ? error.message : String(error)}`);
      console.error('Full error:', error);
      res.status(500).json({ 
        message: "Failed to create product",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  app.get("/api/products", async (req, res) => {
    try {
      const allProducts = await db.query.products.findMany({
        with: {
          vendor: true,
        },
      });
      res.json(allProducts);
    } catch (error) {
      log(`Products retrieval error: ${error}`);
      res.status(500).json({ message: "Failed to retrieve products" });
    }
  });

  app.post("/api/leads/:leadId/responses", async (req, res) => {
    try {
      if (!req.user || req.user.userType !== "business" || !req.user.subscriptionActive) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const response = await db.insert(leadResponses).values({
        ...req.body,
        leadId: parseInt(req.params.leadId),
        businessId: req.user.id,
      }).returning();

      res.json(response[0]);
    } catch (error) {
      log(`Lead response creation error: ${error}`);
      res.status(500).json({ message: "Failed to create lead response" });
    }
  });

  app.patch("/api/leads/:leadId/responses/:responseId", async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const [lead] = await db.select()
        .from(leads)
        .where(eq(leads.id, parseInt(req.params.leadId)));

      if (!lead || lead.userId !== req.user.id) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const [response] = await db.update(leadResponses)
        .set({ status: req.body.status })
        .where(
          and(
            eq(leadResponses.id, parseInt(req.params.responseId)),
            eq(leadResponses.leadId, parseInt(req.params.leadId))
          )
        )
        .returning();

      res.json(response);
    } catch (error) {
      log(`Lead response update error: ${error}`);
      res.status(500).json({ message: "Failed to update lead response" });
    }
  });

  app.patch("/api/users/matching-preferences", async (req, res) => {
    if (!req.user || req.user.userType !== "business") {
      return res.status(403).json({ message: "Only business users can update matching preferences" });
    }

    try {
      const [updatedUser] = await db.update(users)
        .set({
          profile: {
            ...req.user.profile,
            matchPreferences: req.body,
          },
        })
        .where(eq(users.id, req.user.id))
        .returning();

      res.json(updatedUser);
    } catch (error) {
      log(`Matching preferences update error: ${error}`);
      res.status(500).json({ message: "Failed to update matching preferences" });
    }
  });

  // Add these new routes in the registerRoutes function before the return statement
  app.patch("/api/user/password", async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const { currentPassword, newPassword } = req.body;
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: "Both current and new password are required" });
      }

      // Verify current password
      const [user] = await db.select().from(users).where(eq(users.id, req.user.id));
      const isValidPassword = await comparePasswords(currentPassword, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ message: "Current password is incorrect" });
      }

      // Update password
      const hashedPassword = await hashPassword(newPassword);
      const [updatedUser] = await db.update(users)
        .set({ password: hashedPassword })
        .where(eq(users.id, req.user.id))
        .returning();

      res.json({ message: "Password updated successfully" });
    } catch (error) {
      log(`Password update error: ${error instanceof Error ? error.message : String(error)}`);
      res.status(500).json({ message: "Failed to update password" });
    }
  });

  app.patch("/api/user/username", async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const { username } = req.body;
      if (!username) {
        return res.status(400).json({ message: "Username is required" });
      }

      // Check if username is already taken
      const [existingUser] = await db.select()
        .from(users)
        .where(and(
          eq(users.username, username),
          not(eq(users.id, req.user.id))
        ));

      if (existingUser) {
        return res.status(400).json({ message: "Username already taken" });
      }

      // Update username
      const [updatedUser] = await db.update(users)
        .set({ username })
        .where(eq(users.id, req.user.id))
        .returning();

      res.json(updatedUser);
    } catch (error) {
      log(`Username update error: ${error instanceof Error ? error.message : String(error)}`);
      res.status(500).json({ message: "Failed to update username" });
    }
  });

  app.patch("/api/user/profile", async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      log(`Updating profile for user ${req.user.id}`);
      log(`Profile update data: ${JSON.stringify(req.body.profile)}`);

      const [updatedUser] = await db.update(users)
        .set({
          profile: req.body.profile
        })
        .where(eq(users.id, req.user.id))
        .returning();

      log(`Profile updated successfully for user ${req.user.id}`);
      log(`Updated user data: ${JSON.stringify(updatedUser)}`);

      res.json(updatedUser);
    } catch (error) {
      log(`Profile update error: ${error instanceof Error ? error.message : String(error)}`);
      console.error('Full error:', error);
      res.status(500).json({ 
        message: "Failed to update profile",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Update the file upload endpoint with better error handling
  app.post("/api/upload", async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { file, fileName } = req.body;
      if (!file || !fileName) {
        return res.status(400).json({ message: "File and filename are required" });
      }

      log(`Processing file upload for user ${req.user.id}: ${fileName}`);

      // Create uploads directory if it doesn't exist
      const uploadDir = 'uploads';
      if (!fs.existsSync(uploadDir)) {
        log(`Creating uploads directory: ${uploadDir}`);
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      // Generate a unique filename
      const uniqueFileName = `${Date.now()}-${fileName}`;
      const filePath = `${uploadDir}/${uniqueFileName}`;

      try {
        // Decode and save the base64 file
        const buffer = Buffer.from(file, 'base64');
        await fs.promises.writeFile(filePath, buffer);

        // Return the URL that can be used to access the file
        const fileUrl = `/uploads/${uniqueFileName}`;
        log(`File uploaded successfully to ${filePath}`);
        console.log(`File uploaded successfully: ${fileUrl}`);

        res.json({ url: fileUrl });
      } catch (writeError) {
        log(`Error writing file: ${writeError}`);
        console.error('Error writing file:', writeError);
        res.status(500).json({ message: "Failed to write file" });
      }
    } catch (error) {
      log(`File upload error: ${error instanceof Error ? error.message : String(error)}`);
      console.error('File upload error:', error);
      res.status(500).json({ message: "Failed to upload file" });
    }
  });

  // Ensure uploaded files are served statically
  app.use('/uploads', express.static('uploads'));

  const httpServer = createServer(app);
  return httpServer;
}