import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { relations } from "drizzle-orm";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").unique().notNull(),
  username: text("username").unique().notNull(),
  password: text("password").notNull(),
  userType: text("user_type", { enum: ["free", "business", "vendor"] }).notNull().default("free"),
  subscriptionActive: boolean("subscription_active").default(false),
  subscriptionTier: text("subscription_tier", { enum: ["none", "business", "vendor"] }).default("none"),
  subscriptionEndsAt: timestamp("subscription_ends_at"),
  stripeAccountId: text("stripe_account_id"),
  stripeAccountStatus: text("stripe_account_status", {
    enum: ["pending", "enabled", "disabled"]
  }).default("pending"),
  // Business verification fields
  businessVerified: boolean("business_verified").default(false),
  businessName: text("business_name"),
  companyNumber: text("company_number").unique(),
  vatNumber: text("vat_number").unique(),
  utrNumber: text("utr_number").unique(),
  verificationStatus: text("verification_status", {
    enum: ["pending", "verified", "rejected"]
  }).default("pending"),
  // 2FA fields
  twoFactorEnabled: boolean("two_factor_enabled").default(false),
  twoFactorSecret: text("two_factor_secret"),
  backupCodes: jsonb("backup_codes").$type<string[]>(),
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
    enum: ["trial", "active", "cancelled", "expired"]
  }).notNull(),
  payment_frequency: text("payment_frequency", {
    enum: ["monthly", "annual"]
  }).notNull(),
  payment_method: text("payment_method", {
    enum: ["stripe", "direct_debit"]
  }).notNull(),
  start_date: timestamp("start_date").notNull().defaultNow(),
  trial_end_date: timestamp("trial_end_date"),
  end_date: timestamp("end_date").notNull(),
  auto_renew: boolean("auto_renew").default(true),
  price: integer("price").notNull(),
  // Direct debit specific fields
  bank_account_holder: text("bank_account_holder"),
  bank_sort_code: text("bank_sort_code"),
  bank_account_number: text("bank_account_number"),
  bank_mandate_reference: text("bank_mandate_reference"),
  mandate_status: text("mandate_status", {
    enum: ["pending", "active", "failed", "cancelled"]
  }),
  // Stripe specific fields
  stripe_subscription_id: text("stripe_subscription_id"),
  stripe_payment_method_id: text("stripe_payment_method_id"),
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

export const insertUserSchema = createInsertSchema(users, {
  email: z.string().email("Please enter a valid email address"),
  username: z.string().min(3, "Username must be at least 3 characters").max(30, "Username must be less than 30 characters"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  userType: z.enum(["free", "business", "vendor"]),
  // Business verification fields with updated validation
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
  // For business accounts, require company number
  if (data.userType === "business") {
    return data.businessName && data.companyNumber;
  }
  // For vendor accounts, require UTR
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