import { pgTable, text, serial, integer, timestamp, boolean, jsonb, foreignKey, bigint, decimal } from 'drizzle-orm/pg-core';
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
  resellerId: integer('reseller_id'), // Self-reference for reseller - adding reference later in relations
  resellerCustomId: text('reseller_custom_id'), // Custom ID assigned by resellers
  twoFactorEnabled: boolean('two_factor_enabled').default(false).notNull(),
  twoFactorSecret: text('two_factor_secret'),
  backupCodes: jsonb('backup_codes'),
  lastLoginAt: timestamp('last_login_at'),
  lastLoginIp: text('last_login_ip'),
});

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

// User relations - defined after all tables
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

// Email Templates table
export const emailTemplates = pgTable('email_templates', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  name: text('name').notNull(),
  subject: text('subject').notNull(),
  bodyHtml: text('body_html').notNull(),
  bodyText: text('body_text'),
  variables: jsonb('variables'),
  category: text('category').default('general'),
  isDefault: boolean('is_default').default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const emailTemplatesRelations = relations(emailTemplates, ({ one }) => ({
  user: one(users, { fields: [emailTemplates.userId], references: [users.id] }),
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

export type EmailTemplate = typeof emailTemplates.$inferSelect;

export const insertEmailTemplateSchema = createInsertSchema(emailTemplates, {
  name: (schema) => schema.min(2, "Name must be at least 2 characters"),
  subject: (schema) => schema.min(2, "Subject must be at least 2 characters"),
  bodyHtml: (schema) => schema.min(5, "HTML body must be at least 5 characters"),
}).omit({ id: true, createdAt: true, updatedAt: true, isDefault: true });

export type EmailTemplateInsert = z.infer<typeof insertEmailTemplateSchema>;

export type Invoice = typeof invoices.$inferSelect;

// Mail-in-a-Box Server Configuration Tables
export const mailServers = pgTable('mail_servers', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  hostname: text('hostname').notNull(),
  ipAddress: text('ip_address').notNull(),
  apiKey: text('api_key').notNull(),
  apiEndpoint: text('api_endpoint').notNull(), 
  userId: integer('user_id').references(() => users.id).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  lastSyncedAt: timestamp('last_synced_at'),
  status: text('status').default('unknown').notNull(),
  version: text('version'),
  region: text('region'),
  notes: text('notes')
});

export const mailServerRelations = relations(mailServers, ({ one, many }) => ({
  user: one(users, { fields: [mailServers.userId], references: [users.id] }),
  dnsRecords: many(dnsRecords),
  mailboxes: many(mailboxes),
  backupJobs: many(backupJobs)
}));

export const dnsRecords = pgTable('dns_records', {
  id: serial('id').primaryKey(),
  serverId: integer('server_id').notNull().references(() => mailServers.id, { onDelete: 'cascade' }),
  recordType: text('record_type').notNull(), // MX, A, CNAME, TXT, etc.
  name: text('name').notNull(),
  value: text('value').notNull(),
  ttl: integer('ttl').default(3600).notNull(),
  priority: integer('priority'), // For MX records
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  isManaged: boolean('is_managed').default(true).notNull()
});

export const dnsRecordsRelations = relations(dnsRecords, ({ one }) => ({
  server: one(mailServers, { fields: [dnsRecords.serverId], references: [mailServers.id] })
}));

export const mailboxes = pgTable('mailboxes', {
  id: serial('id').primaryKey(),
  serverId: integer('server_id').notNull().references(() => mailServers.id, { onDelete: 'cascade' }),
  email: text('email').notNull(),
  name: text('name'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  status: text('status').default('active').notNull(),
  storageUsed: integer('storage_used').default(0).notNull(), // in bytes
  storageLimit: integer('storage_limit'), // in bytes
  lastLogin: timestamp('last_login')
});

export const mailboxesRelations = relations(mailboxes, ({ one, many }) => ({
  server: one(mailServers, { fields: [mailboxes.serverId], references: [mailServers.id] }),
  aliases: many(emailAliases)
}));

export const emailAliases = pgTable('email_aliases', {
  id: serial('id').primaryKey(),
  serverId: integer('server_id').notNull().references(() => mailServers.id, { onDelete: 'cascade' }),
  mailboxId: integer('mailbox_id').references(() => mailboxes.id, { onDelete: 'cascade' }),
  sourceEmail: text('source_email').notNull(),
  destinationEmail: text('destination_email').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  expiresAt: timestamp('expires_at')
});

export const emailAliasesRelations = relations(emailAliases, ({ one }) => ({
  server: one(mailServers, { fields: [emailAliases.serverId], references: [mailServers.id] }),
  mailbox: one(mailboxes, { fields: [emailAliases.mailboxId], references: [mailboxes.id] })
}));

export const backupJobs = pgTable('backup_jobs', {
  id: serial('id').primaryKey(),
  serverId: integer('server_id').notNull().references(() => mailServers.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  backupType: text('backup_type').notNull(), // full, incremental, differential
  destination: text('destination').notNull(), // s3://bucket, sftp://server, etc.
  schedule: text('schedule').notNull(), // cron expression
  lastRunAt: timestamp('last_run_at'),
  nextRunAt: timestamp('next_run_at'),
  status: text('status').default('pending').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  retentionDays: integer('retention_days').default(30).notNull(),
  encryptionKey: text('encryption_key')
});

export const backupJobsRelations = relations(backupJobs, ({ one, many }) => ({
  server: one(mailServers, { fields: [backupJobs.serverId], references: [mailServers.id] }),
  backupHistory: many(backupHistory)
}));

export const backupHistory = pgTable('backup_history', {
  id: serial('id').primaryKey(),
  jobId: integer('job_id').notNull().references(() => backupJobs.id, { onDelete: 'cascade' }),
  startedAt: timestamp('started_at').defaultNow().notNull(),
  completedAt: timestamp('completed_at'),
  status: text('status').notNull(),
  sizeBytes: integer('size_bytes'), // in bytes
  backupLocation: text('backup_location'),
  error: text('error'),
  mailboxCount: integer('mailbox_count'),
  filesCount: integer('files_count')
});

export const backupHistoryRelations = relations(backupHistory, ({ one }) => ({
  job: one(backupJobs, { fields: [backupHistory.jobId], references: [backupJobs.id] })
}));

export const serverMetrics = pgTable('server_metrics', {
  id: serial('id').primaryKey(),
  serverId: integer('server_id').notNull().references(() => mailServers.id, { onDelete: 'cascade' }),
  timestamp: timestamp('timestamp').defaultNow().notNull(),
  cpuUsage: integer('cpu_usage'),
  memoryUsage: integer('memory_usage'),
  diskUsage: integer('disk_usage'),
  queueSize: integer('queue_size'),
  activeConnections: integer('active_connections'),
  metrics: jsonb('metrics') // Additional metrics as JSON
});

export const serverMetricsRelations = relations(serverMetrics, ({ one }) => ({
  server: one(mailServers, { fields: [serverMetrics.serverId], references: [mailServers.id] })
}));

export const spamFilters = pgTable('spam_filters', {
  id: serial('id').primaryKey(),
  serverId: integer('server_id').notNull().references(() => mailServers.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  ruleType: text('rule_type').notNull(), // blacklist, whitelist, content, header
  pattern: text('pattern').notNull(),
  action: text('action').notNull(), // reject, quarantine, tag, score
  score: integer('score'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  description: text('description')
});

export const spamFiltersRelations = relations(spamFilters, ({ one }) => ({
  server: one(mailServers, { fields: [spamFilters.serverId], references: [mailServers.id] })
}));

// Zod schemas for Mail-in-a-Box tables
export const insertMailServerSchema = createInsertSchema(mailServers, {
  name: (schema) => schema.min(2, "Server name must be at least 2 characters"),
  hostname: (schema) => schema.min(4, "Hostname must be at least 4 characters"),
  ipAddress: (schema) => schema.min(7, "IP address must be valid"),
  apiKey: (schema) => schema.min(8, "API key must be at least 8 characters"),
}).omit({ id: true, createdAt: true, updatedAt: true, lastSyncedAt: true, isActive: true });

export const insertDnsRecordSchema = createInsertSchema(dnsRecords, {
  recordType: (schema) => schema.min(1, "Record type is required"),
  name: (schema) => schema.min(1, "Record name is required"),
  value: (schema) => schema.min(1, "Record value is required"),
}).omit({ id: true, createdAt: true, updatedAt: true });

export const insertMailboxSchema = createInsertSchema(mailboxes, {
  email: (schema) => schema.email("Must provide a valid email"),
}).omit({ id: true, createdAt: true, updatedAt: true, storageUsed: true, lastLogin: true });

export const insertEmailAliasSchema = createInsertSchema(emailAliases, {
  sourceEmail: (schema) => schema.email("Source must be a valid email"),
  destinationEmail: (schema) => schema.email("Destination must be a valid email"),
}).omit({ id: true, createdAt: true, updatedAt: true });

export const insertBackupJobSchema = createInsertSchema(backupJobs, {
  name: (schema) => schema.min(2, "Backup job name must be at least 2 characters"),
  backupType: (schema) => schema.min(1, "Backup type is required"),
  destination: (schema) => schema.min(5, "Destination must be at least 5 characters"),
  schedule: (schema) => schema.min(3, "Schedule must be at least 3 characters"),
}).omit({ id: true, createdAt: true, updatedAt: true, lastRunAt: true, nextRunAt: true });

export const insertSpamFilterSchema = createInsertSchema(spamFilters, {
  name: (schema) => schema.min(2, "Filter name must be at least 2 characters"),
  ruleType: (schema) => schema.min(1, "Rule type is required"),
  pattern: (schema) => schema.min(1, "Pattern is required"),
  action: (schema) => schema.min(1, "Action is required"),
}).omit({ id: true, createdAt: true, updatedAt: true });

// Export types for Mail-in-a-Box tables
export type MailServer = typeof mailServers.$inferSelect;
export type MailServerInsert = z.infer<typeof insertMailServerSchema>;

export type DnsRecord = typeof dnsRecords.$inferSelect;
export type DnsRecordInsert = z.infer<typeof insertDnsRecordSchema>;

export type Mailbox = typeof mailboxes.$inferSelect;
export type MailboxInsert = z.infer<typeof insertMailboxSchema>;

export type EmailAlias = typeof emailAliases.$inferSelect;
export type EmailAliasInsert = z.infer<typeof insertEmailAliasSchema>;

export type BackupJob = typeof backupJobs.$inferSelect;
export type BackupJobInsert = z.infer<typeof insertBackupJobSchema>;

export type BackupHistoryEntry = typeof backupHistory.$inferSelect;

export type ServerMetricsEntry = typeof serverMetrics.$inferSelect;

export type SpamFilter = typeof spamFilters.$inferSelect;
export type SpamFilterInsert = z.infer<typeof insertSpamFilterSchema>;
