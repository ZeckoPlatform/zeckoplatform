import { pgTable, text, serial, integer, boolean, timestamp, jsonb, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { relations } from "drizzle-orm";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").unique().notNull(),
  username: text("username").unique().notNull(),
  password: text("password").notNull(),
  userType: text("user_type", { enum: ["free", "business", "vendor", "admin"] }).notNull().default("free"),
  superAdmin: boolean("super_admin").default(false),
  subscriptionActive: boolean("subscription_active").default(false),
  subscriptionTier: text("subscription_tier", { enum: ["none", "business", "vendor"] }).default("none"),
  subscriptionEndsAt: timestamp("subscription_ends_at"),
  stripeAccountId: text("stripe_account_id"),
  stripeAccountStatus: text("stripe_account_status", {
    enum: ["pending", "enabled", "disabled"]
  }).default("pending"),
  active: boolean("active").default(true),
  deactivatedAt: timestamp("deactivated_at"),
  businessVerified: boolean("business_verified").default(false),
  businessName: text("business_name"),
  companyNumber: text("company_number").unique(),
  vatNumber: text("vat_number").unique(),
  utrNumber: text("utr_number").unique(),
  verificationStatus: text("verification_status", {
    enum: ["pending", "verified", "rejected"]
  }).default("pending"),
  twoFactorEnabled: boolean("two_factor_enabled").default(false),
  twoFactorSecret: text("two_factor_secret"),
  backupCodes: jsonb("backup_codes").$type<string[]>(),
  resetPasswordToken: text("reset_password_token"),
  resetPasswordExpiry: timestamp("reset_password_expiry"),
  verificationDocuments: jsonb("verification_documents").$type<{
    companyDoc?: string;
    vatDoc?: string;
    utrDoc?: string;
    additionalDocs?: string[];
  }>(),
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
  status: text("status", {
    enum: ["trial", "active", "paused", "cancelled", "expired"]
  }).notNull(),
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

export const invoices = pgTable("invoices", {
  id: serial("id").primaryKey(),
  user_id: integer("user_id").references(() => users.id).notNull(),
  stripe_invoice_id: text("stripe_invoice_id").notNull(),
  amount: integer("amount").notNull(),
  status: text("status", {
    enum: ["draft", "open", "paid", "void", "uncollectible"]
  }).notNull(),
  currency: text("currency").notNull(),
  billing_reason: text("billing_reason").notNull(),
  invoice_pdf: text("invoice_pdf"),
  hosted_invoice_url: text("hosted_invoice_url"),
  created_at: timestamp("created_at").defaultNow(),
  paid_at: timestamp("paid_at"),
  period_start: timestamp("period_start"),
  period_end: timestamp("period_end"),
  metadata: jsonb("metadata"),
});

export const notificationPreferences = pgTable("notification_preferences", {
  id: serial("id").primaryKey(),
  user_id: integer("user_id").references(() => users.id).notNull(),
  renewal_reminder: boolean("renewal_reminder").default(true),
  reminder_days_before: integer("reminder_days_before").default(7),
  invoice_available: boolean("invoice_available").default(true),
  payment_failed: boolean("payment_failed").default(true),
});

export const emailTemplates = pgTable("email_templates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  subject: text("subject").notNull(),
  htmlContent: text("html_content").notNull(),
  textContent: text("text_content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const newsletters = pgTable("newsletters", {
  id: serial("id").primaryKey(),
  subject: text("subject").notNull(),
  htmlContent: text("html_content").notNull(),
  textContent: text("text_content").notNull(),
  status: text("status", {
    enum: ["draft", "scheduled", "sent", "failed"]
  }).notNull().default("draft"),
  scheduledFor: timestamp("scheduled_for"),
  sentAt: timestamp("sent_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  metadata: jsonb("metadata").$type<{
    recipientCount?: number;
    openRate?: number;
    clickRate?: number;
  }>(),
});

export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  type: text("type", {
    enum: ["info", "success", "warning", "error"]
  }).notNull(),
  read: boolean("read").default(false),
  link: text("link"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const vendorTransactions = pgTable("vendor_transactions", {
  id: serial("id").primaryKey(),
  vendor_id: integer("vendor_id").references(() => users.id).notNull(),
  stripe_transfer_id: text("stripe_transfer_id").notNull(),
  amount: integer("amount").notNull(),
  status: text("status", {
    enum: ["pending", "paid", "failed"]
  }).notNull(),
  currency: text("currency").notNull().default("gbp"),
  transfer_date: timestamp("transfer_date"),
  stripe_charge_id: text("stripe_charge_id"),
  product_details: jsonb("product_details").$type<{
    name: string;
    quantity: number;
    unit_price: number;
  }>(),
  customer_details: jsonb("customer_details").$type<{
    email?: string;
    name?: string;
    location?: string;
  }>(),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

export const analyticsLogs = pgTable("analytics_logs", {
  id: serial("id").primaryKey(),
  user_id: integer("user_id", { mode: 'number' }).references(() => users.id),
  event_type: text("event_type", {
    enum: ["login", "lead_view", "lead_response", "message_sent", "subscription_changed"]
  }).notNull(),
  metadata: jsonb("metadata"),
  created_at: timestamp("created_at").defaultNow(),
  ip_address: text("ip_address"),
  user_agent: text("user_agent"),
});

export const leadAnalytics = pgTable("lead_analytics", {
  id: serial("id").primaryKey(),
  lead_id: integer("lead_id").references(() => leads.id).notNull(),
  views: integer("views").default(0),
  responses: integer("responses").default(0),
  conversion_rate: numeric("conversion_rate").default(0),
  avg_response_time: integer("avg_response_time"),
  status_changes: jsonb("status_changes").$type<{
    timestamp: string;
    from: string;
    to: string;
  }[]>(),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

export const businessAnalytics = pgTable("business_analytics", {
  id: serial("id").primaryKey(),
  business_id: integer("business_id").references(() => users.id).notNull(),
  total_leads_viewed: integer("total_leads_viewed").default(0),
  total_responses: integer("total_responses").default(0),
  successful_conversions: integer("successful_conversions").default(0),
  total_revenue: numeric("total_revenue").default(0),
  avg_response_time: integer("avg_response_time"),
  rating: numeric("rating").default(0),
  activity_score: integer("activity_score").default(0),
  period_start: timestamp("period_start").notNull(),
  period_end: timestamp("period_end").notNull(),
  metrics: jsonb("metrics").$type<{
    response_rate: number;
    conversion_rate: number;
    revenue_growth: number;
    customer_satisfaction: number;
  }>(),
});

export const revenueAnalytics = pgTable("revenue_analytics", {
  id: serial("id").primaryKey(),
  user_id: integer("user_id").references(() => users.id).notNull(),
  period_type: text("period_type", { enum: ["daily", "weekly", "monthly", "yearly"] }).notNull(),
  period_start: timestamp("period_start").notNull(),
  period_end: timestamp("period_end").notNull(),
  total_revenue: numeric("total_revenue").default(0),
  subscription_revenue: numeric("subscription_revenue").default(0),
  transaction_count: integer("transaction_count").default(0),
  avg_transaction_value: numeric("avg_transaction_value").default(0),
  revenue_breakdown: jsonb("revenue_breakdown").$type<{
    services: number;
    subscriptions: number;
    other: number;
  }>(),
  created_at: timestamp("created_at").defaultNow(),
});

export const trialHistory = pgTable("trial_history", {
  id: serial("id").primaryKey(),
  email: text("email").notNull(),
  company_number: text("company_number"),
  vat_number: text("vat_number"),
  utr_number: text("utr_number"),
  trial_start_date: timestamp("trial_start_date").notNull(),
  trial_end_date: timestamp("trial_end_date").notNull(),
  user_type: text("user_type", { enum: ["business", "vendor"] }).notNull(),
  created_at: timestamp("created_at").defaultNow(),
});

export const usersRelations = relations(users, ({ many }) => ({
  leads: many(leads),
  products: many(products),
  leadResponses: many(leadResponses),
  subscriptions: many(subscriptions),
  sentMessages: many(messages, { relationName: "sentMessages" }),
  receivedMessages: many(messages, { relationName: "receivedMessages" }),
  invoices: many(invoices),
  notificationPreferences: many(notificationPreferences),
  vendorTransactions: many(vendorTransactions),
  analyticsLogs: many(analyticsLogs),
  businessAnalytics: many(businessAnalytics),
  revenueAnalytics: many(revenueAnalytics),
  notifications: many(notifications),
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

export const invoicesRelations = relations(invoices, ({ one }) => ({
  user: one(users, {
    fields: [invoices.user_id],
    references: [users.id],
  }),
}));

export const notificationPreferencesRelations = relations(notificationPreferences, ({ one }) => ({
  user: one(users, {
    fields: [notificationPreferences.user_id],
    references: [users.id],
  }),
}));

export const vendorTransactionsRelations = relations(vendorTransactions, ({ one }) => ({
  vendor: one(users, {
    fields: [vendorTransactions.vendor_id],
    references: [users.id],
  }),
}));

export const analyticsLogsRelations = relations(analyticsLogs, ({ one }) => ({
  user: one(users, {
    fields: [analyticsLogs.user_id],
    references: [users.id],
  }),
}));

export const leadAnalyticsRelations = relations(leadAnalytics, ({ one }) => ({
  lead: one(leads, {
    fields: [leadAnalytics.lead_id],
    references: [leads.id],
  }),
}));

export const businessAnalyticsRelations = relations(businessAnalytics, ({ one }) => ({
  business: one(users, {
    fields: [businessAnalytics.business_id],
    references: [users.id],
  }),
}));

export const revenueAnalyticsRelations = relations(revenueAnalytics, ({ one }) => ({
  user: one(users, {
    fields: [revenueAnalytics.user_id],
    references: [users.id],
  }),
}));

export const trialHistoryRelations = relations(trialHistory, ({ one }) => ({
  user: one(users, {
    fields: [trialHistory.email],
    references: [users.id],
  }),
}));

export const emailTemplatesRelations = relations(emailTemplates, ({ many }) => ({
  newsletters: many(newsletters),
}));

export const newslettersRelations = relations(newsletters, ({ one }) => ({
  template: one(emailTemplates),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
}));

export const insertUserSchema = createInsertSchema(users, {
  email: z.string().email("Please enter a valid email address"),
  username: z.string().min(3, "Username must be at least 3 characters").max(30, "Username must be less than 30 characters"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  userType: z.enum(["free", "business", "vendor", "admin"]),
  businessName: z.string().optional(),
  companyNumber: z.string()
    .regex(/^[A-Z0-9]{8}$/, "Invalid company registration number format")
    .optional(),
  vatNumber: z.string()
    .regex(/^GB[0-9]{9}$/, "Invalid UK VAT number format")
    .optional(),
  utrNumber: z.string()
    .regex(/^[0-9]{10}$/, "Invalid UTR number format")
    .optional(),
  twoFactorEnabled: z.boolean().optional(),
}).refine((data) => {
  if (data.userType === "business") {
    return data.businessName && data.companyNumber;
  }
  if (data.userType === "vendor") {
    return data.businessName && data.utrNumber;
  }
  return true;
}, {
  message: (data) =>
    data.userType === "business"
      ? "Business accounts require business name and company number"
      : "Vendor accounts require business name and UTR number",
});

export const selectUserSchema = createSelectSchema(users);
export const insertSubscriptionSchema = createInsertSchema(subscriptions);
export const selectSubscriptionSchema = createSelectSchema(subscriptions);
export const insertLeadSchema = createInsertSchema(leads);
export const selectLeadSchema = createSelectSchema(leads);
export const insertMessageSchema = createInsertSchema(messages);
export const selectMessageSchema = createSelectSchema(messages);
export const insertInvoiceSchema = createInsertSchema(invoices);
export const selectInvoiceSchema = createSelectSchema(invoices);
export const insertNotificationPreferencesSchema = createInsertSchema(notificationPreferences);
export const selectNotificationPreferencesSchema = createSelectSchema(notificationPreferences);
export const insertVendorTransactionSchema = createInsertSchema(vendorTransactions);
export const selectVendorTransactionSchema = createSelectSchema(vendorTransactions);

export const insertAnalyticsLogSchema = createInsertSchema(analyticsLogs);
export const selectAnalyticsLogSchema = createSelectSchema(analyticsLogs);
export const insertLeadAnalyticsSchema = createInsertSchema(leadAnalytics);
export const selectLeadAnalyticsSchema = createSelectSchema(leadAnalytics);
export const insertBusinessAnalyticsSchema = createInsertSchema(businessAnalytics);
export const selectBusinessAnalyticsSchema = createSelectSchema(businessAnalytics);
export const insertRevenueAnalyticsSchema = createInsertSchema(revenueAnalytics);
export const selectRevenueAnalyticsSchema = createSelectSchema(revenueAnalytics);

export const insertEmailTemplateSchema = createInsertSchema(emailTemplates);
export const selectEmailTemplateSchema = createSelectSchema(emailTemplates);
export const insertNewsletterSchema = createInsertSchema(newsletters);
export const selectNewsletterSchema = createSelectSchema(newsletters);
export const insertNotificationSchema = createInsertSchema(notifications);
export const selectNotificationSchema = createSelectSchema(notifications);



export type InsertUser = typeof users.$inferInsert;
export type SelectUser = typeof users.$inferSelect;
export type InsertSubscription = typeof subscriptions.$inferInsert;
export type SelectSubscription = typeof subscriptions.$inferSelect;
export type InsertLead = typeof leads.$inferInsert;
export type SelectLead = typeof leads.$inferSelect;
export type InsertMessage = typeof messages.$inferInsert;
export type SelectMessage = typeof messages.$inferSelect;
export type SubscriptionWithPayment = typeof subscriptions.$inferSelect;
export type InsertInvoice = typeof invoices.$inferInsert;
export type SelectInvoice = typeof invoices.$inferSelect;
export type InsertNotificationPreferences = typeof notificationPreferences.$inferInsert;
export type SelectNotificationPreferences = typeof notificationPreferences.$inferSelect;
export type InsertVendorTransaction = typeof vendorTransactions.$inferInsert;
export type SelectVendorTransaction = typeof vendorTransactions.$inferSelect;
export type InsertAnalyticsLog = typeof analyticsLogs.$inferInsert;
export type SelectAnalyticsLog = typeof analyticsLogs.$inferSelect;
export type InsertLeadAnalytics = typeof leadAnalytics.$inferInsert;
export type SelectLeadAnalytics = typeof leadAnalytics.$inferSelect;
export type InsertBusinessAnalytics = typeof businessAnalytics.$inferInsert;
export type SelectBusinessAnalytics = typeof businessAnalytics.$inferSelect;
export type InsertRevenueAnalytics = typeof revenueAnalytics.$inferInsert;
export type SelectRevenueAnalytics = typeof revenueAnalytics.$inferSelect;

export type InsertEmailTemplate = typeof emailTemplates.$inferInsert;
export type SelectEmailTemplate = typeof emailTemplates.$inferSelect;
export type InsertNewsletter = typeof newsletters.$inferInsert;
export type SelectNewsletter = typeof newsletters.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;
export type SelectNotification = typeof notifications.$inferSelect;


export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  title: text("title").notNull(),
  description: text("description"),
  filePath: text("file_path").notNull(),
  fileType: text("file_type").notNull(),
  fileSize: integer("file_size").notNull(),
  isPublic: boolean("is_public").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  metadata: jsonb("metadata").$type<{
    originalName: string;
    contentType: string;
    tags?: string[];
  }>(),
});

export const documentVersions = pgTable("document_versions", {
  id: serial("id").primaryKey(),
  documentId: integer("document_id").references(() => documents.id).notNull(),
  version: integer("version").notNull(),
  filePath: text("file_path").notNull(),
  fileSize: integer("file_size").notNull(),
  createdBy: integer("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  changeLog: text("change_log"),
});

export const documentAccess = pgTable("document_access", {
  id: serial("id").primaryKey(),
  documentId: integer("document_id").references(() => documents.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  accessLevel: text("access_level", {
    enum: ["view", "edit", "admin"]
  }).notNull(),
  grantedBy: integer("granted_by").references(() => users.id).notNull(),
  grantedAt: timestamp("granted_at").defaultNow(),
  expiresAt: timestamp("expires_at"),
});

export const documentsRelations = relations(documents, ({ one, many }) => ({
  owner: one(users, {
    fields: [documents.userId],
    references: [users.id],
  }),
  versions: many(documentVersions),
  access: many(documentAccess),
}));

export const documentVersionsRelations = relations(documentVersions, ({ one }) => ({
  document: one(documents, {
    fields: [documentVersions.documentId],
    references: [documents.id],
  }),
  creator: one(users, {
    fields: [documentVersions.createdBy],
    references: [users.id],
  }),
}));

export const documentAccessRelations = relations(documentAccess, ({ one }) => ({
  document: one(documents, {
    fields: [documentAccess.documentId],
    references: [documents.id],
  }),
  user: one(users, {
    fields: [documentAccess.userId],
    references: [users.id],
  }),
  grantor: one(users, {
    fields: [documentAccess.grantedBy],
    references: [users.id],
  }),
}));

export const insertDocumentSchema = createInsertSchema(documents);
export const selectDocumentSchema = createSelectSchema(documents);
export const insertDocumentVersionSchema = createInsertSchema(documentVersions);
export const selectDocumentVersionSchema = createSelectSchema(documentVersions);
export const insertDocumentAccessSchema = createInsertSchema(documentAccess);
export const selectDocumentAccessSchema = createSelectSchema(documentAccess);

export type InsertDocument = typeof documents.$inferInsert;
export type SelectDocument = typeof documents.$inferSelect;
export type InsertDocumentVersion = typeof documentVersions.$inferInsert;
export type SelectDocumentVersion = typeof documentVersions.$inferSelect;
export type InsertDocumentAccess = typeof documentAccess.$inferInsert;
export type SelectDocumentAccess = typeof documentAccess.$inferSelect;

export const reviews = pgTable("reviews", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  targetId: integer("target_id").references(() => users.id).notNull(),
  rating: integer("rating").notNull(),
  content: text("content").notNull(),
  status: text("status", {
    enum: ["pending", "approved", "rejected"]
  }).default("pending"),
  moderatedBy: integer("moderated_by").references(() => users.id),
  moderationNotes: text("moderation_notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const reviewVotes = pgTable("review_votes", {
  id: serial("id").primaryKey(),
  reviewId: integer("review_id").references(() => reviews.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  voteType: text("vote_type", { enum: ["helpful", "unhelpful"] }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const reputationScores = pgTable("reputation_scores", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  overallScore: numeric("overall_score").notNull().default("0"),
  totalReviews: integer("total_reviews").notNull().default(0),
  averageRating: numeric("average_rating").notNull().default("0"),
  responseRate: numeric("response_rate").notNull().default("0"),
  completionRate: numeric("completion_rate").notNull().default("0"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const reviewsRelations = relations(reviews, ({ one }) => ({
  author: one(users, {
    fields: [reviews.userId],
    references: [users.id],
  }),
  target: one(users, {
    fields: [reviews.targetId],
    references: [users.id],
  }),
  moderator: one(users, {
    fields: [reviews.moderatedBy],
    references: [users.id],
  }),
}));

export const reviewVotesRelations = relations(reviewVotes, ({ one }) => ({
  review: one(reviews, {
    fields: [reviewVotes.reviewId],
    references: [reviews.id],
  }),
  user: one(users, {
    fields: [reviewVotes.userId],
    references: [users.id],
  }),
}));

export const reputationScoresRelations = relations(reputationScores, ({ one }) => ({
  user: one(users, {
    fields: [reputationScores.userId],
    references: [users.id],
  }),
}));

export const insertReviewSchema = createInsertSchema(reviews);
export const selectReviewSchema = createSelectSchema(reviews);
export const insertReviewVoteSchema = createInsertSchema(reviewVotes);
export const selectReviewVoteSchema = createSelectSchema(reviewVotes);
export const insertReputationScoreSchema = createInsertSchema(reputationScores);
export const selectReputationScoreSchema = createSelectSchema(reputationScores);

export type InsertReview = typeof reviews.$inferInsert;
export type SelectReview = typeof reviews.$inferSelect;
export type InsertReviewVote = typeof reviewVotes.$inferInsert;
export type SelectReviewVote = typeof reviewVotes.$inferSelect;
export type InsertReputationScore = typeof reputationScores.$inferInsert;
export type SelectReputationScore = typeof reputationScores.$inferSelect;