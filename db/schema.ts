import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { relations } from "drizzle-orm";

export enum UserType {
  FREE = 'free',
  BUSINESS = 'business',
  VENDOR = 'vendor'
}

export enum SubscriptionTier {
  NONE = 'none',
  BUSINESS = 'business',
  VENDOR = 'vendor'
}

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").unique().notNull(),
  password: text("password").notNull(),
  userType: text("user_type", { enum: ["free", "business", "vendor"] }).notNull().default("free"),
  subscriptionActive: boolean("subscription_active").default(false),
  subscriptionTier: text("subscription_tier", { enum: ["none", "business", "vendor"] }).default("none"),
  subscriptionEndsAt: timestamp("subscription_ends_at"),
  profile: jsonb("profile").$type<{
    name?: string;
    description?: string;
    categories?: string[];
    location?: string;
    matchPreferences?: {
      preferredCategories?: string[];
      locationPreference?: string[];
      budgetRange?: { min: number; max: number };
    };
    // Vendor specific fields
    services?: string[];
    portfolio?: Array<{
      title: string;
      description: string;
      imageUrl?: string;
      completionDate?: string;
    }>;
    ratings?: Array<{
      rating: number;
      comment?: string;
      date: string;
    }>;
    averageRating?: number;
  }>(),
});

export const leads = pgTable("leads", {
  id: serial("id").primaryKey(),
  user_id: integer("user_id").references(() => users.id).notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(),
  budget: integer("budget"),
  location: text("location"),
  status: text("status", { enum: ["open", "closed", "in_progress"] }).default("open"),
  created_at: timestamp("created_at").defaultNow(),
  expires_at: timestamp("expires_at"),
});

export const leadResponses = pgTable("lead_responses", {
  id: serial("id").primaryKey(),
  lead_id: integer("lead_id").references(() => leads.id).notNull(),
  business_id: integer("business_id").references(() => users.id).notNull(),
  proposal: text("proposal").notNull(),
  price: integer("price"),
  status: text("status", { enum: ["pending", "accepted", "rejected"] }).default("pending"),
  created_at: timestamp("created_at").defaultNow(),
});

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  lead_id: integer("lead_id").references(() => leads.id).notNull(),
  sender_id: integer("sender_id").references(() => users.id).notNull(),
  receiver_id: integer("receiver_id").references(() => users.id).notNull(),
  content: text("content").notNull(),
  read: boolean("read").default(false),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

export const subscriptions = pgTable("subscriptions", {
  id: serial("id").primaryKey(),
  user_id: integer("user_id").references(() => users.id).notNull(),
  tier: text("tier", { enum: ["business", "vendor"] }).notNull(),
  status: text("status", { enum: ["active", "cancelled", "expired"] }).notNull(),
  start_date: timestamp("start_date").notNull().defaultNow(),
  end_date: timestamp("end_date").notNull(),
  auto_renew: boolean("auto_renew").default(true),
  price: integer("price").notNull(),
});

export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  vendorId: integer("vendor_id").references(() => users.id).notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  price: integer("price").notNull(),
  category: text("category").notNull(),
  imageUrl: text("image_url"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const usersRelations = relations(users, ({ many }) => ({
  leads: many(leads),
  products: many(products),
  leadResponses: many(leadResponses),
  subscriptions: many(subscriptions),
  sentMessages: many(messages, { relationName: "sentMessages" }),
  receivedMessages: many(messages, { relationName: "receivedMessages" }),
}));

export const subscriptionsRelations = relations(subscriptions, ({ one }) => ({
  user: one(users, {
    fields: [subscriptions.user_id],
    references: [users.id],
  }),
}));

export const leadsRelations = relations(leads, ({ one, many }) => ({
  user: one(users, {
    fields: [leads.user_id],
    references: [users.id],
  }),
  responses: many(leadResponses),
  messages: many(messages),
}));

export const productsRelations = relations(products, ({ one }) => ({
  vendor: one(users, {
    fields: [products.vendorId],
    references: [users.id],
  }),
}));

export const leadResponsesRelations = relations(leadResponses, ({ one }) => ({
  lead: one(leads, {
    fields: [leadResponses.lead_id],
    references: [leads.id],
  }),
  business: one(users, {
    fields: [leadResponses.business_id],
    references: [users.id],
  }),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  lead: one(leads, {
    fields: [messages.lead_id],
    references: [leads.id],
  }),
  sender: one(users, {
    fields: [messages.sender_id],
    references: [users.id],
    relationName: "sentMessages",
  }),
  receiver: one(users, {
    fields: [messages.receiver_id],
    references: [users.id],
    relationName: "receivedMessages",
  }),
}));

export const insertUserSchema = createInsertSchema(users);
export const selectUserSchema = createSelectSchema(users);
export const insertSubscriptionSchema = createInsertSchema(subscriptions);
export const selectSubscriptionSchema = createSelectSchema(subscriptions);
export const insertLeadSchema = createInsertSchema(leads);
export const selectLeadSchema = createSelectSchema(leads);
export const insertMessageSchema = createInsertSchema(messages);
export const selectMessageSchema = createSelectSchema(messages);

export type InsertUser = typeof users.$inferInsert;
export type SelectUser = typeof users.$inferSelect;
export type InsertSubscription = typeof subscriptions.$inferInsert;
export type SelectSubscription = typeof subscriptions.$inferSelect;
export type InsertLead = typeof leads.$inferInsert;
export type SelectLead = typeof leads.$inferSelect;
export type InsertMessage = typeof messages.$inferInsert;
export type SelectMessage = typeof messages.$inferSelect;