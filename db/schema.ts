import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").unique().notNull(),
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
  countryCode: text("country_code").default("GB"),
  // UK-specific fields
  companyNumber: text("company_number").unique(),
  vatNumber: text("vat_number").unique(),
  utrNumber: text("utr_number").unique(),
  // US-specific fields
  einNumber: text("ein_number").unique(),
  stateRegistrationNumber: text("state_registration_number"),
  registeredState: text("registered_state"),
  verificationStatus: text("verification_status", {
    enum: ["pending", "verified", "rejected"]
  }).default("pending"),
  profile: jsonb("profile").$type<{
    description?: string;
    categories?: string[];
    address?: {
      street: string;
      city: string;
      state: string;
      postalCode: string;
      country: string;
    };
  }>(),
});

// Create the insert schema for user registration
export const insertUserSchema = createInsertSchema(users, {
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  userType: z.enum(["free", "business", "vendor", "admin"]),
  countryCode: z.enum(["GB", "US"]).default("GB"),
  businessName: z.string().optional(),
  // UK fields
  companyNumber: z.string()
    .regex(/^[A-Z0-9]{8}$/, "Invalid Companies House number format")
    .optional(),
  vatNumber: z.string()
    .regex(/^GB[0-9]{9}$/, "Invalid UK VAT number format")
    .optional(),
  utrNumber: z.string()
    .regex(/^[0-9]{10}$/, "Invalid UTR number format")
    .optional(),
  // US fields
  einNumber: z.string()
    .regex(/^\d{2}-\d{7}$/, "Invalid EIN format (XX-XXXXXXX)")
    .optional(),
  stateRegistrationNumber: z.string().optional(),
  registeredState: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.userType === "business") {
    if (data.countryCode === "GB" && !data.companyNumber) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "UK business accounts require a Companies House number",
        path: ["companyNumber"]
      });
    }
    if (data.countryCode === "US" && (!data.einNumber || !data.registeredState)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "US business accounts require an EIN and registered state",
        path: ["einNumber"]
      });
    }
  }

  if (data.userType === "vendor") {
    if (!data.businessName) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Vendor accounts require a business name",
        path: ["businessName"]
      });
    }
    if (data.countryCode === "GB" && (!data.companyNumber || !data.utrNumber)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "UK vendor accounts require both Companies House number and UTR number",
        path: ["companyNumber"]
      });
    }
    if (data.countryCode === "US" && (!data.einNumber || !data.registeredState)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "US vendor accounts require an EIN and registered state",
        path: ["einNumber"]
      });
    }
  }
  return true;
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type SelectUser = typeof users.$inferSelect;

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
  expires_at: timestamp("expires_at").notNull(),
  archived: boolean("archived").default(false),
  // Add region field that matches user's country code
  region: text("region", { enum: ["GB", "US"] }).notNull(),
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
  conversion_rate: text("conversion_rate").default("0"),
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
  total_revenue: text("total_revenue").default('0'),
  avg_response_time: text("avg_response_time"),
  rating: text("rating").default('0'),
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
  total_revenue: text("total_revenue").default("0"),
  subscription_revenue: text("subscription_revenue").default("0"),
  transaction_count: integer("transaction_count").default(0),
  avg_transaction_value: text("avg_transaction_value").default("0"),
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

export const reviews = pgTable("reviews", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  targetId: integer("target_id").references(() => users.id).notNull(),
  rating: integer("rating").notNull(),
  content: text("content").notNull(),
  targetType: text("target_type", {
    enum: ["business", "vendor", "product"]
  }).notNull(),
  status: text("status", {
    enum: ["pending", "approved", "rejected"]
  }).default("pending"),
  reply: text("reply"),
  repliedAt: timestamp("replied_at"),
  repliedBy: integer("replied_by").references(() => users.id),
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
  overallScore: text("overall_score").notNull().default("0"),
  totalReviews: integer("total_reviews").notNull().default(0),
  averageRating: text("average_rating").notNull().default("0"),
  responseRate: text("response_rate").notNull().default("0"),
  completionRate: text("completion_rate").notNull().default("0"),
  updatedAt: timestamp("updated_at").defaultNow(),
});


export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  buyerId: integer("buyer_id").references(() => users.id).notNull(),
  vendorId: integer("vendor_id").references(() => users.id).notNull(),
  status: text("status", {
    enum: ["pending", "processing", "shipped", "delivered", "cancelled", "refunded"]
  }).notNull().default("pending"),
  totalAmount: integer("total_amount").notNull(),
  currency: text("currency").notNull().default("gbp"),
  shippingAddress: jsonb("shipping_address").$type<{
    fullName: string;
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    phone: string;
  }>().notNull(),
  billingAddress: jsonb("billing_address").$type<{
    companyName?: string;
    vatNumber?: string;
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  }>().notNull(),
  specialInstructions: text("special_instructions"),
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const orderItems = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").references(() => orders.id).notNull(),
  productId: integer("product_id").references(() => products.id).notNull(),
  quantity: integer("quantity").notNull(),
  pricePerUnit: integer("price_per_unit").notNull(),
  totalPrice: integer("total_price").notNull(),
});

export const orderHistory = pgTable("order_history", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").references(() => orders.id).notNull(),
  status: text("status", {
    enum: ["pending", "processing", "shipped", "delivered", "cancelled", "refunded"]
  }).notNull(),
  note: text("note"),
  createdBy: integer("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const orderCommunication = pgTable("order_communication", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").references(() => orders.id).notNull(),
  senderId: integer("sender_id").references(() => users.id).notNull(),
  receiverId: integer("receiver_id").references(() => users.id).notNull(),
  message: text("message").notNull(),
  read: boolean("read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
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
  buyerOrders: many(orders, { relationName: "buyerOrders" }),
  vendorOrders: many(orders, { relationName: "vendorOrders" }),
  orderHistory: many(orderHistory),
  orderCommunications: many(orderCommunication),
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
  replyAuthor: one(users, {
    fields: [reviews.repliedBy],
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

export const ordersRelations = relations(orders, ({ one, many }) => ({
  buyer: one(users, {
    fields: [orders.buyerId],
    references: [users.id],
  }),
  vendor: one(users, {
    fields: [orders.vendorId],
    references: [users.id],
  }),
  items: many(orderItems),
  history: many(orderHistory),
  communications: many(orderCommunication),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
  product: one(products, {
    fields: [orderItems.productId],
    references: [products.id],
  }),
}));

export const orderHistoryRelations = relations(orderHistory, ({ one }) => ({
  order: one(orders, {
    fields: [orderHistory.orderId],
    references: [orders.id],
  }),
  creator: one(users, {
    fields: [orderHistory.createdBy],
    references: [users.id],
  }),
}));

export const orderCommunicationRelations = relations(orderCommunication, ({ one }) => ({
  order: one(orders, {
    fields: [orderCommunication.orderId],
    references: [orders.id],
  }),
  sender: one(users, {
    fields: [orderCommunication.senderId],
    references: [users.id],
  }),
  receiver: one(users, {
    fields: [orderCommunication.receiverId],
    references: [users.id],
  }),
}));