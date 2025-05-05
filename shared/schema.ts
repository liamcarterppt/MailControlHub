import { pgTable, text, serial, integer, timestamp, boolean, jsonb, foreignKey } from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { relations } from 'drizzle-orm';
import { z } from 'zod';

// Users table - Admin users who can manage the mail server
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  username: text('username').notNull().unique(),
  password: text('password').notNull(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  role: text('role').notNull().default('user'), // user, admin, reseller
  createdAt: timestamp('created_at').defaultNow().notNull(),
  stripeCustomerId: text('stripe_customer_id'),
  stripeSubscriptionId: text('stripe_subscription_id'),
  referralCode: text('referral_code').unique(),
  referredBy: text('referred_by'),
  isReseller: boolean('is_reseller').default(false).notNull(),
  resellerId: integer('reseller_id').references(() => users.id), // Self-reference for reseller
  resellerCustomId: text('reseller_custom_id'), // Custom ID assigned by resellers
});

export const usersRelations = relations(users, ({ many, one }) => ({
  domains: many(domains),
  emailAccounts: many(emailAccounts),
  referrals: many(referrals, { relationName: 'referrer' }),
  customers: many(users, { relationName: 'reseller_customers' }),
  reseller: one(users, { 
    fields: [users.resellerId], 
    references: [users.id],
    relationName: 'reseller_customers'
  }),
  resellerSettings: one(resellerSettings),
}));

// Reseller Settings table
export const resellerSettings = pgTable('reseller_settings', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull().unique(),
  companyName: text('company_name').notNull(),
  companyLogo: text('company_logo'),
  primaryColor: text('primary_color').default('#4f46e5'),
  accentColor: text('accent_color').default('#10b981'),
  customDomain: text('custom_domain'),
  whiteLabel: boolean('white_label').default(false).notNull(),
  supportEmail: text('support_email'),
  commissionRate: integer('commission_rate').default(10).notNull(), // Percentage
  maxCustomers: integer('max_customers').default(100).notNull(),
  maxDomainsPerCustomer: integer('max_domains_per_customer').default(5).notNull(),
  maxEmailsPerDomain: integer('max_emails_per_domain').default(10).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const resellerSettingsRelations = relations(resellerSettings, ({ one }) => ({
  user: one(users, { fields: [resellerSettings.userId], references: [users.id] }),
}));

// Reseller Commission Tiers table
export const resellerCommissionTiers = pgTable('reseller_commission_tiers', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  tierName: text('tier_name').notNull(),
  minimumRevenue: integer('minimum_revenue').notNull(), // Minimum monthly revenue for this tier
  commissionRate: integer('commission_rate').notNull(), // Percentage
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const resellerCommissionTiersRelations = relations(resellerCommissionTiers, ({ one }) => ({
  user: one(users, { fields: [resellerCommissionTiers.userId], references: [users.id] }),
}));

// Domains table
export const domains = pgTable('domains', {
  id: serial('id').primaryKey(),
  name: text('name').notNull().unique(),
  isVerified: boolean('is_verified').default(false).notNull(),
  userId: integer('user_id').references(() => users.id).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const domainsRelations = relations(domains, ({ one, many }) => ({
  user: one(users, { fields: [domains.userId], references: [users.id] }),
  emailAccounts: many(emailAccounts),
}));

// Email Accounts table
export const emailAccounts = pgTable('email_accounts', {
  id: serial('id').primaryKey(),
  username: text('username').notNull(),
  password: text('password').notNull(),
  domainId: integer('domain_id').references(() => domains.id).notNull(),
  userId: integer('user_id').references(() => users.id).notNull(),
  storageUsed: integer('storage_used').default(0).notNull(), // in bytes
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const emailAccountsRelations = relations(emailAccounts, ({ one }) => ({
  domain: one(domains, { fields: [emailAccounts.domainId], references: [domains.id] }),
  user: one(users, { fields: [emailAccounts.userId], references: [users.id] }),
}));

// Mail Queue table
export const mailQueue = pgTable('mail_queue', {
  id: serial('id').primaryKey(),
  sender: text('sender').notNull(),
  recipient: text('recipient').notNull(),
  subject: text('subject'),
  status: text('status').notNull().default('pending'), // pending, sent, failed
  errorMessage: text('error_message'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Server Configuration table
export const serverConfig = pgTable('server_config', {
  id: serial('id').primaryKey(),
  name: text('name').notNull().unique(),
  value: text('value'),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Service Status table
export const serviceStatus = pgTable('service_status', {
  id: serial('id').primaryKey(),
  name: text('name').notNull().unique(),
  status: text('status').notNull().default('running'), // running, stopped, needs_update, error
  lastChecked: timestamp('last_checked').defaultNow().notNull(),
  message: text('message'),
});

// Activity Logs table
export const activityLogs = pgTable('activity_logs', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id),
  action: text('action').notNull(),
  details: jsonb('details'),
  ipAddress: text('ip_address'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Subscription Plans table
export const subscriptionPlans = pgTable('subscription_plans', {
  id: serial('id').primaryKey(),
  name: text('name').notNull().unique(),
  price: integer('price').notNull(), // in cents
  emailAccountLimit: integer('email_account_limit').notNull(),
  domainLimit: integer('domain_limit').notNull(),
  storageLimit: integer('storage_limit').notNull(), // in bytes
  stripeProductId: text('stripe_product_id'),
  stripePriceId: text('stripe_price_id'),
  features: jsonb('features'),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Referrals table
export const referrals = pgTable('referrals', {
  id: serial('id').primaryKey(),
  referrerId: integer('referrer_id').references(() => users.id).notNull(),
  referredUserId: integer('referred_user_id').references(() => users.id).unique(),
  status: text('status').notNull().default('pending'), // pending, completed, expired
  reward: integer('reward'), // in cents
  createdAt: timestamp('created_at').defaultNow().notNull(),
  completedAt: timestamp('completed_at'),
});

export const referralsRelations = relations(referrals, ({ one }) => ({
  referrer: one(users, { fields: [referrals.referrerId], references: [users.id], relationName: 'referrer' }),
  referredUser: one(users, { fields: [referrals.referredUserId], references: [users.id] }),
}));

// Invoices table
export const invoices = pgTable('invoices', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  stripeInvoiceId: text('stripe_invoice_id'),
  amount: integer('amount').notNull(), // in cents
  status: text('status').notNull().default('pending'), // pending, paid, failed, canceled
  description: text('description'),
  periodStart: timestamp('period_start'),
  periodEnd: timestamp('period_end'),
  paidAt: timestamp('paid_at'),
  planName: text('plan_name'),
  invoiceUrl: text('invoice_url'), // URL to Stripe hosted invoice
  receiptUrl: text('receipt_url'), // URL to Stripe hosted receipt
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const invoicesRelations = relations(invoices, ({ one }) => ({
  user: one(users, { fields: [invoices.userId], references: [users.id] }),
}));

// Zod schemas
export const insertUserSchema = createInsertSchema(users, {
  username: (schema) => schema.min(3, "Username must be at least 3 characters"),
  password: (schema) => schema.min(8, "Password must be at least 8 characters"),
  email: (schema) => schema.email("Must provide a valid email"),
  name: (schema) => schema.min(2, "Name must be at least 2 characters"),
}).omit({ id: true, createdAt: true });

export const insertDomainSchema = createInsertSchema(domains, {
  name: (schema) => schema.min(4, "Domain must be at least 4 characters"),
}).omit({ id: true, createdAt: true, updatedAt: true, isVerified: true });

export const insertEmailAccountSchema = createInsertSchema(emailAccounts, {
  username: (schema) => schema.min(3, "Username must be at least 3 characters"),
  password: (schema) => schema.min(8, "Password must be at least 8 characters"),
}).omit({ id: true, createdAt: true, updatedAt: true, storageUsed: true, isActive: true });

export const insertServerConfigSchema = createInsertSchema(serverConfig, {
  name: (schema) => schema.min(1, "Name is required"),
}).omit({ id: true, createdAt: true, updatedAt: true });

export const insertSubscriptionPlanSchema = createInsertSchema(subscriptionPlans, {
  name: (schema) => schema.min(1, "Name is required"),
  price: (schema) => schema.min(0, "Price must be a positive number"),
  emailAccountLimit: (schema) => schema.min(1, "Email account limit must be at least 1"),
  domainLimit: (schema) => schema.min(1, "Domain limit must be at least 1"),
  storageLimit: (schema) => schema.min(1, "Storage limit must be positive"),
}).omit({ id: true, createdAt: true, updatedAt: true, isActive: true });

export const insertResellerSettingsSchema = createInsertSchema(resellerSettings, {
  companyName: (schema) => schema.min(2, "Company name must be at least 2 characters"),
  supportEmail: (schema) => schema.optional().transform(email => email || null),
  commissionRate: (schema) => schema.min(0, "Commission rate must be a positive number").max(100, "Commission rate cannot exceed 100%"),
  maxCustomers: (schema) => schema.min(1, "Maximum customers must be at least 1"),
  maxDomainsPerCustomer: (schema) => schema.min(1, "Maximum domains per customer must be at least 1"),
  maxEmailsPerDomain: (schema) => schema.min(1, "Maximum emails per domain must be at least 1")
}).omit({ id: true, createdAt: true, updatedAt: true });

export const insertResellerCommissionTierSchema = createInsertSchema(resellerCommissionTiers, {
  tierName: (schema) => schema.min(1, "Tier name is required"),
  minimumRevenue: (schema) => schema.min(0, "Minimum revenue must be a positive number"),
  commissionRate: (schema) => schema.min(0, "Commission rate must be a positive number").max(100, "Commission rate cannot exceed 100%"),
}).omit({ id: true, createdAt: true, updatedAt: true, isActive: true });

// Export types
export type User = typeof users.$inferSelect;
export type UserInsert = z.infer<typeof insertUserSchema>;

export type Domain = typeof domains.$inferSelect;
export type DomainInsert = z.infer<typeof insertDomainSchema>;

export type EmailAccount = typeof emailAccounts.$inferSelect;
export type EmailAccountInsert = z.infer<typeof insertEmailAccountSchema>;

export type MailQueueItem = typeof mailQueue.$inferSelect;

export type ServerConfigItem = typeof serverConfig.$inferSelect;
export type ServerConfigInsert = z.infer<typeof insertServerConfigSchema>;

export type ServiceStatusItem = typeof serviceStatus.$inferSelect;

export type ActivityLog = typeof activityLogs.$inferSelect;

export type SubscriptionPlan = typeof subscriptionPlans.$inferSelect;
export type SubscriptionPlanInsert = z.infer<typeof insertSubscriptionPlanSchema>;

export type Referral = typeof referrals.$inferSelect;

export type ResellerSetting = typeof resellerSettings.$inferSelect;
export type ResellerSettingInsert = z.infer<typeof insertResellerSettingsSchema>;

export type ResellerCommissionTier = typeof resellerCommissionTiers.$inferSelect;
export type ResellerCommissionTierInsert = z.infer<typeof insertResellerCommissionTierSchema>;

export type Invoice = typeof invoices.$inferSelect;
