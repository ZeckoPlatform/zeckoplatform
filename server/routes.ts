import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import { setupAuth, authenticateToken } from "./auth";
import { db } from "@db";
import { leads, users, subscriptions, products, leadResponses, messages } from "@db/schema";
import { eq, and, or, gt, not, sql } from "drizzle-orm";
import { log } from "./vite";
import { comparePasswords, hashPassword } from './auth';
import fs from 'fs';
import express from 'express';
import { createConnectedAccount, retrieveConnectedAccount } from './stripe';
import { sendEmail } from './services/email';
import subscriptionRoutes from './routes/subscriptions';
import invoiceRoutes from './routes/invoices';
import { insertUserSchema } from "@db/schema";
import { fromZodError } from 'zod-validation-error';
import authRoutes from './routes/auth';
import analyticsRoutes from './routes/analytics';
import notificationRoutes from './routes/notifications';
import adminRoutes from './routes/admin';
import documentRoutes from './routes/documents';
import reviewRoutes from './routes/reviews';
import Stripe from 'stripe'; // Added Stripe import

const EARLY_BIRD_PRODUCTS = {
  business: {
    id: 'early_bird_business',
    name: 'Business Early Access',
    description: 'Early bird access to Zecko - Business account',
    price: 1999, // £19.99 in pence
  },
  vendor: {
    id: 'early_bird_vendor',
    name: 'Vendor Early Access',
    description: 'Early bird access to Zecko - Vendor account',
    price: 3499, // £34.99 in pence
  },
};

interface User {
  id: number;
  email: string;
  userType: string;
  subscriptionActive: boolean;
  stripeAccountId?: string;
  stripeAccountStatus?: string;
  profile?: any;
}

declare global {
  namespace Express {
    interface Request {
      user?: User;
      login: any;
      isAuthenticated(): boolean;
      sessionID: string;
    }
  }
}

// Placeholder function - needs actual implementation
async function getUserByUsername(username: string): Promise<[User | null]> {
  const [user] = await db.select().from(users).where(eq(users.username, username));
  return [user || null];
}

export function registerRoutes(app: Express): Server {
  setupAuth(app);

  // Register auth routes before middleware
  app.use('/api', authRoutes);

  // Authentication middleware for protected routes
  app.use('/api', (req, res, next) => {
    if (req.path.endsWith('/login') ||
        req.path.endsWith('/register') ||
        req.path.endsWith('/auth/verify') ||
        req.path.endsWith('/auth/reset-password') ||
        req.path.endsWith('/auth/reset-password/confirm') ||
        req.path.endsWith('/vendor/stripe/account') ||
        req.path.endsWith('/vendor/stripe/account/status') ||
        req.method === 'OPTIONS') {
      return next();
    }
    authenticateToken(req, res, next);
  });

  // Register all other route modules
  app.use('/api', subscriptionRoutes);
  app.use('/api', invoiceRoutes);
  app.use('/api', analyticsRoutes);
  app.use('/api', notificationRoutes);
  app.use('/api', adminRoutes);
  app.use('/api', documentRoutes);
  app.use('/api', reviewRoutes);

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

  // GET /api/leads endpoint
  app.get("/api/leads", async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      log(`User type: ${req.user.userType}, Subscription active: ${req.user.subscriptionActive}`);

      // For free users, only show their own leads
      if (req.user.userType === "free") {
        const userLeads = await db.query.leads.findMany({
          where: eq(leads.user_id, req.user.id),
          columns: {
            id: true,
            title: true,
            description: true,
            category: true,
            budget: true,
            location: true,
            status: true,
            expires_at: true,
            created_at: true,
            user_id: true
          },
          with: {
            responses: {
              columns: {
                id: true,
                status: true,
                created_at: true,
                business_id: true
              },
              with: {
                business: {
                  columns: {
                    id: true,
                    username: true,
                    email: true,
                    userType: true,
                    profile: true
                  }
                }
              }
            },
            messages: {
              where: eq(messages.receiver_id, req.user.id),
              columns: {
                id: true,
                content: true,
                read: true,
                created_at: true,
                sender_id: true,
                receiver_id: true
              },
              with: {
                sender: {
                  columns: {
                    id: true,
                    username: true,
                    email: true
                  }
                }
              }
            }
          }
        });

        const processedLeads = userLeads.map(lead => ({
          ...lead,
          unreadMessages: lead.messages?.filter(m => !m.read).length || 0,
          messages: undefined
        }));

        return res.json(processedLeads);
      }

      // For business users, check subscription
      if (req.user.userType === "business") {
        if (!req.user.subscriptionActive) {
          log(`Business user ${req.user.id} attempted to access leads without active subscription`);
          return res.status(403).json({
            message: "Active subscription required to view leads",
            subscriptionRequired: true,
            userType: req.user.userType
          });
        }

        const businessLeads = await db.query.leads.findMany({
          where: eq(leads.status, "open"),
          columns: {
            id: true,
            title: true,
            description: true,
            category: true,
            budget: true,
            location: true,
            status: true,
            expires_at: true,
            created_at: true,
            user_id: true
          },
          with: {
            responses: {
              columns: {
                id: true,
                status: true,
                created_at: true,
                business_id: true
              },
              with: {
                business: {
                  columns: {
                    id: true,
                    username: true,
                    email: true,
                    userType: true,
                    profile: true
                  }
                }
              }
            },
            messages: {
              where: eq(messages.receiver_id, req.user.id),
              columns: {
                id: true,
                content: true,
                read: true,
                created_at: true,
                sender_id: true,
                receiver_id: true
              },
              with: {
                sender: {
                  columns: {
                    id: true,
                    username: true,
                    email: true
                  }
                }
              }
            }
          }
        });

        const processedLeads = businessLeads.map(lead => ({
          ...lead,
          unreadMessages: lead.messages?.filter(m => !m.read).length || 0,
          messages: undefined
        }));

        return res.json(processedLeads);
      }

      // For vendors, return an empty array as they don't need to see leads
      if (req.user.userType === "vendor") {
        return res.json([]);
      }

      res.json([]);
    } catch (error) {
      log(`Leads fetch error: ${error instanceof Error ? error.message : String(error)}`);
      console.error('Full error:', error);
      res.status(500).json({
        message: "Failed to fetch leads",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // POST /api/leads/:leadId/responses - Add subscription check
  app.post("/api/leads/:leadId/responses", async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      // Check for business user type and active subscription
      if (req.user.userType !== "business") {
        return res.status(403).json({ message: "Only business accounts can respond to leads" });
      }

      if (!req.user.subscriptionActive) {
        return res.status(403).json({
          message: "Active subscription required to respond to leads",
          subscriptionRequired: true
        });
      }

      const response = await db.insert(leadResponses).values({
        ...req.body,
        lead_id: parseInt(req.params.leadId),
        business_id: req.user.id,
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

      if (!lead || lead.user_id !== req.user.id) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const [response] = await db.update(leadResponses)
        .set({
          status: req.body.status,
          contactDetails: req.body.contactDetails
        })
        .where(
          and(
            eq(leadResponses.id, parseInt(req.params.responseId)),
            eq(leadResponses.lead_id, parseInt(req.params.leadId))
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

  app.post("/api/leads/:leadId/messages", async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const leadId = parseInt(req.params.leadId);
      const { receiverId, content } = req.body;

      // Verify this is a valid lead
      const [lead] = await db.select()
        .from(leads)
        .where(eq(leads.id, leadId));

      if (!lead) {
        return res.status(404).json({ message: "Lead not found" });
      }

      // Check if user has permission to send messages
      // Either the user is the lead owner or has an accepted response
      log(`Attempting to send message for lead ${leadId}`);
      log(`Current user: ${req.user.id}, Receiver: ${receiverId}`);
      log(`Lead owner: ${lead.user_id}`);

      if (lead.user_id === req.user.id || receiverId === lead.user_id) {
        log(`Permission granted: User is lead owner or sending to lead owner`);
        // User is the lead owner or is sending to lead owner
        const [message] = await db.insert(messages)
          .values({
            lead_id: leadId,
            sender_id: req.user.id,
            receiver_id: receiverId,
            content: content.trim(),
            read: false,
          })
          .returning();

        // Get the full message details with sender and receiver info
        const fullMessage = await db.query.messages.findFirst({
          where: eq(messages.id, message.id),
          with: {
            sender: true,
            receiver: true,
          }
        });

        res.json(fullMessage);
      } else {
        log(`Checking for accepted response...`);
        // Check if user has an accepted response for this lead
        const [response] = await db.select()
          .from(leadResponses)
          .where(
            and(
              eq(leadResponses.lead_id, leadId),
              eq(leadResponses.business_id, req.user.id),
              eq(leadResponses.status, "accepted")
            )
          );

        if (!response) {
          return res.status(403).json({ message: "You don't have permission to send messages for this lead" });
        }

        // Create and return message
        const [message] = await db.insert(messages)
          .values({
            lead_id: leadId,
            sender_id: req.user.id,
            receiver_id: receiverId,
            content: content.trim(),
            read: false,
          })
          .returning();

        // Get the full message details with sender and receiver info
        const fullMessage = await db.query.messages.findFirst({
          where: eq(messages.id, message.id),
          with: {
            sender: true,
            receiver: true,
          }
        });

        res.json(fullMessage);
      }
    } catch (error) {
      log(`Message creation error: ${error instanceof Error ? error.message : String(error)}`);
      console.error('Full error:', error);
      res.status(500).json({
        message: "Failed to send message",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  app.get("/api/leads/:leadId/messages", async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const leadId = parseInt(req.params.leadId);

      // Verify this is a valid lead
      const [lead] = await db.select()
        .from(leads)
        .where(eq(leads.id, leadId));

      if (!lead) {
        return res.status(404).json({ message: "Lead not found" });
      }

      // Check if user has permission to view messages
      const [response] = await db.select()
        .from(leadResponses)
        .leftJoin(leads, eq(leads.id, leadResponses.lead_id))
        .where(
          and(
            eq(leadResponses.lead_id, leadId),
            eq(leadResponses.status, "accepted"),
            or(
              eq(leadResponses.business_id, req.user.id),
              eq(leads.user_id, req.user.id)
            )
          )
        );

      if (!response) {
        return res.status(403).json({ message: "You don't have permission to view messages for this lead" });
      }

      // Get all messages for this lead ordered by creation time
      const messagesList = await db.query.messages.findMany({
        where: eq(messages.lead_id, leadId),
        with: {
          sender: true,
          receiver: true,
        },
        orderBy: (messages, { asc }) => [asc(messages.created_at)],
      });

      res.json(messagesList);
    } catch (error) {
      log(`Messages fetch error: ${error instanceof Error ? error.message : String(error)}`);
      console.error('Full error:', error);
      res.status(500).json({
        message: "Failed to fetch messages",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Update the messages/read endpoint with transaction support and detailed logging
  app.post("/api/leads/:leadId/messages/read", async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const leadId = parseInt(req.params.leadId);
      if (isNaN(leadId)) {
        return res.status(400).json({ message: "Invalid lead ID" });
      }

      log(`Marking messages as read for lead ${leadId} and user ${req.user.id}`);

      // Check if the lead exists
      const [lead] = await db.select()
        .from(leads)
        .where(eq(leads.id, leadId));

      if (!lead) {
        return res.status(404).json({ message: "Lead not found" });
      }

      // First check how many unread messages we have
      const [{ count }] = await db.select({
        count: sql<number>`count(*)`
      })
        .from(messages)
        .where(
          and(
            eq(messages.lead_id, leadId),
            eq(messages.receiver_id, req.user.id),
            eq(messages.read, false)
          )
        );

      log(`Found ${count} unread messages`);

      if (count === 0) {
        return res.json({
          success: true,
          updatedCount: 0,
          message: "No unread messages to update"
        });
      }

      // Update messages
      const [result] = await db.update(messages)
        .set({
          read: true,
          updated_at: new Date()
        })
        .where(
          and(
            eq(messages.lead_id, leadId),
            eq(messages.receiver_id, req.user.id),
            eq(messages.read, false)
          )
        )
        .returning();

      if (!result) {
        log('No messages were updated');
        return res.json({
          success: false,
          message: "Failed to update messages"
        });
      }

      // Verify the update
      const [{ count: verifiedCount }] = await db.select({
        count: sql<number>`count(*)`
      })
        .from(messages)
        .where(
          and(
            eq(messages.lead_id, leadId),
            eq(messages.receiver_id, req.user.id),
            eq(messages.read, true)
          )
        );

      log(`Successfully marked messages as read. Verified count: ${verifiedCount}`);

      res.json({
        success: true,
        updatedCount: count,
        verifiedCount
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      log(`Mark messages read error: ${errorMessage}`);
      console.error('Full error:', error);
      res.status(500).json({
        message: "Failed to mark messages as read",
        error: errorMessage
      });
    }
  });



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

      try {        // Decode and save the base64 file
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

  app.delete("/api/products/:id", async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const productId = parseInt(req.params.id);

      // First check if product exists and belongs to vendor
      const [product] = await db.select()
        .from(products)
        .where(
          and(
            eq(products.id, productId),
            eq(products.vendorId, req.user.id)
          )
        );

      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }

      // Delete the product
      await db.delete(products)
        .where(eq(products.id, productId));

      res.json({ message: "Product deleted successfully" });
    } catch (error) {
      log(`Product deletion error: ${error instanceof Error ? error.message : String(error)}`);
      console.error('Full error:', error);
      res.status(500).json({
        message: "Failed to delete product",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Update the product update endpoint to properly handle decimal prices
  app.patch("/api/products/:id", async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const productId = parseInt(req.params.id);

      // First check if product exists and belongs to vendor
      const [product] = await db.select()
        .from(products)
        .where(
          and(
            eq(products.id, productId),
            eq(products.vendorId, req.user.id)
          )
        );

      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }

      // Convert price from decimal to cents if provided
      let updateData = { ...req.body };
      if (typeof updateData.price !== 'undefined') {
        const priceInDollars = parseFloat(updateData.price);
        if (isNaN(priceInDollars)) {
          return res.status(400).json({ message: "Invalid price format" });
        }
        // Convert dollars to cents (e.g., 3.90 -> 390)
        updateData.price = Math.round(priceInDollars * 100);
        log(`Converting price from ${priceInDollars} dollars to ${updateData.price} cents`);
      }

      const [updatedProduct] = await db.update(products)
        .set(updateData)
        .where(eq(products.id, productId))        .returning();

      // Convert price back to decimal for response
      const responseProduct = {
        ...updatedProduct,
        price: (updatedProduct.price / 100).toFixed(2), // Convert cents back to dollars with 2 decimal places
      };

      log(`Updated product price: ${responseProduct.price} (converted from ${updatedProduct.price} cents)`);
      res.json(responseProduct);
    } catch (error) {
      log(`Product update error: ${error instanceof Error? error.message : String(error)}`);
      console.error('Full error:', error);
      res.status(500).json({
        message: "Failed to update product",        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  app.post("/api/vendor/stripe/account", async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      if (req.user.userType !== "vendor") {
        return res.status(403).json({ message: "Only vendors can create Stripe accounts" });
      }

      const { accountId, onboardingUrl } = await createConnectedAccount(req.body.email);

      // Update user with Stripe account ID
      await db.update(users)
        .set({
          stripeAccountId: accountId,
          stripeAccountStatus: "pending"
        })
        .where(eq(users.id, req.user.id));

      res.json({ onboardingUrl });
    } catch (error) {
      log(`Stripe account creation error: ${error instanceof Error ? error.message : String(error)}`);
      res.status(500).json({
        message: "Failed to create Stripe account",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  app.get("/api/vendor/stripe/account/status", async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      if (!req.user.stripeAccountId) {
        return res.status(404).json({ message: "No Stripe account found" });      }

      const account = await retrieveConnectedAccount(req.user.stripeAccountId);

      // Update local status if needed
      if (account.charges_enabled && req.user.stripeAccountStatus !== "enabled") {
                await db.update(users)
          .set({ stripeAccountStatus: "enabled" })
          .where(eq(users.id, req.user.id));
      }

      res.json({
        status: account.charges_enabled ? "enabled" : "pending",
        details: {
          chargesEnabled: account.charges_enabled,
          payoutsEnabled: account.payouts_enabled,
          detailsSubmitted: account.details_submitted,
        }
      });
    } catch (error) {
      log(`Stripe account status check error: ${error instanceof Error ? error.message : String(error)}`);
      res.status(500).json({
        message: "Failedto check Stripe account status",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  app.post("/api/register", async (req, res, next) => {
    const result = insertUserSchema.safeParse(req.body);
    if (!result.success) {
      const error = fromZodError(result.error);
      return res.status(400).send(error.toString());
    }

    try {
      // Check for existing user by email
      const [existingUser] = await getUserByUsername(result.data.username);
      if (existingUser) {
        return res.status(400).send("Username already exists");
      }

      // For business/vendor accounts, check for duplicate business credentials
      if (result.data.userType === "business" || result.data.userType === "vendor") {
        const existingBusiness = await db.select()
          .from(users)
          .where(
            or(
              result.data.companyNumber ? eq(users.companyNumber, result.data.companyNumber) : undefined,
              result.data.vatNumber ? eq(users.vatNumber, result.data.vatNumber) : undefined,
              result.data.utrNumber ? eq(users.utrNumber, result.data.utrNumber) : undefined
            )
          )
          .limit(1);

        if (existingBusiness.length > 0) {
          return res.status(400).json({
            error: "Business already registered",
            message: "A business account with these credentials already exists."
          });
        }
      }

      const [user] = await db
        .insert(users)
        .values({
          ...result.data,
          password: await hashPassword(result.data.password),
          verificationStatus: result.data.userType === "free" ? "verified" : "pending",
          businessVerified: result.data.userType === "free",
        })
        .returning();

      req.login(user, (err) => {
        if (err) return next(err);
        res.status(201).json(user);
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({
        error: "Registration failed",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  app.post("/api/early-bird/create-checkout", async (req, res) => {
    try {
      const { email, companyName, userType, businessType, companyNumber, utrNumber } = req.body;

      console.log('Creating early bird checkout session:', {
        email,
        userType,
        businessType,
        companyNumber,
        utrNumber,
      });

      if (!process.env.STRIPE_SECRET_KEY) {
        throw new Error("STRIPE_SECRET_KEY is required");
      }

      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
      const productConfig = EARLY_BIRD_PRODUCTS[userType];

      // Ensure the product exists in Stripe
      let product;
      try {
        product = await stripe.products.retrieve(productConfig.id);
      } catch (error) {
        console.log('Creating new Stripe product for:', userType);
        product = await stripe.products.create({
          id: productConfig.id,
          name: productConfig.name,
          description: productConfig.description,
        });
      }

      // Create or retrieve the price
      let price;
      const prices = await stripe.prices.list({
        product: product.id,
        active: true,
        type: 'recurring',
        recurring: { interval: 'month' },
      });

      if (prices.data.length > 0) {
        price = prices.data[0];
      } else {
        console.log('Creating new Stripe price for:', userType);
        price = await stripe.prices.create({
          product: product.id,
          unit_amount: productConfig.price,
          currency: 'gbp',
          recurring: {
            interval: 'month',
          },
        });
      }

      console.log('Creating checkout session with price:', price.id);

      // Create a checkout session
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price: price.id,
            quantity: 1,
          },
        ],
        mode: 'subscription',
        success_url: `${process.env.HOST_URL}/early-bird/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.HOST_URL}/early-bird`,
        customer_email: email,
        metadata: {
          userType,
          companyName,
          businessType: businessType || null,
          companyNumber: companyNumber || null,
          utrNumber: utrNumber || null,
        },
      });

      console.log('Checkout session created:', session.id);
      res.json({ url: session.url });
    } catch (error) {
      console.error('Error creating checkout session:', error);
      res.status(500).json({
        message: error instanceof Error ? error.message : 'Failed to create checkout session',
      });
    }
  });

  app.get("/api/early-bird/success", async (req, res) => {
    try {
      const { session_id } = req.query;

      if (!session_id || typeof session_id !== 'string') {
        throw new Error('Invalid session ID');
      }

      if (!process.env.STRIPE_SECRET_KEY) {
        throw new Error("STRIPE_SECRET_KEY is required");
      }

      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

      // Retrieve the checkout session
      const session = await stripe.checkout.sessions.retrieve(session_id);
      const metadata = session.metadata;

      if (!session?.metadata || !session.customer_email) {
        throw new Error('Invalid session data');
      }

      // Create the user account
      const [user] = await db.insert(users)
        .values({
          email: session.customer_email,
          username: session.customer_email.split('@')[0],
          userType: metadata.userType as 'business' | 'vendor',
          password: await hashPassword(Math.random().toString(36).slice(-8)),
          stripeCustomerId: session.customer as string,
          profile: {
            companyName: metadata.companyName,
            businessType: metadata.businessType,
            companyNumber: metadata.companyNumber,
            utrNumber: metadata.utrNumber,
          },
          subscriptionActive: true,
          subscriptionTier: metadata.userType,
        })
        .returning();

      // Create subscription record
      await db.insert(subscriptions)
        .values({
          user_id: user.id,
          stripe_subscription_id: session.subscription as string,
          status: 'active',
          tier: metadata.userType,
          start_date: new Date(),
          auto_renew: true,
        });

      res.redirect('/auth/login?registered=true');
    } catch (error) {
      console.error('Error processing successful payment:', error);
      res.redirect('/early-bird?error=registration-failed');
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}