import { eq, and, desc, sql, count, sum, inArray } from "drizzle-orm";
import { db } from "@db";
import {
  users,
  domains,
  emailAccounts,
  mailQueue,
  serverConfig,
  serviceStatus,
  activityLogs,
  subscriptionPlans,
  referrals,
  invoices,
  emailTemplates,
  mailServers,
  dnsRecords,
  mailboxes,
  emailAliases,
  backupJobs,
  backupHistory,
  serverMetrics,
  spamFilters,
  User,
  Domain,
  EmailAccount,
  ServerConfigItem,
  ServiceStatusItem,
  ActivityLog,
  SubscriptionPlan,
  EmailTemplate,
  Referral,
  MailQueueItem,
  Invoice,
  MailServer,
  DnsRecord,
  Mailbox,
  EmailAlias,
  BackupJob,
  BackupHistoryEntry,
  ServerMetricsEntry,
  SpamFilter
} from "@shared/schema";
import { randomBytes } from "crypto";

export const storage = {
  // User operations
  async getUserById(id: number): Promise<User | undefined> {
    return db.query.users.findFirst({
      where: eq(users.id, id)
    });
  },

  async getUserByUsername(username: string): Promise<User | undefined> {
    return db.query.users.findFirst({
      where: eq(users.username, username)
    });
  },

  async insertUser(userData: Omit<User, "id" | "createdAt">): Promise<User> {
    // Generate a unique referral code
    const referralCode = randomBytes(6).toString('hex');
    userData.referralCode = referralCode;

    const [user] = await db.insert(users).values(userData).returning();
    return user;
  },
  
  // Two-Factor Authentication operations

  async updateStripeCustomerId(userId: number, customerId: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ stripeCustomerId: customerId })
      .where(eq(users.id, userId))
      .returning();
    return user;
  },

  async updateUserStripeInfo(
    userId: number, 
    stripeInfo: { stripeCustomerId: string, stripeSubscriptionId: string }
  ): Promise<User> {
    const [user] = await db
      .update(users)
      .set(stripeInfo)
      .where(eq(users.id, userId))
      .returning();
    return user;
  },

  // Two-factor authentication operations
  async updateTwoFactorStatus(
    userId: number,
    options: { 
      enabled: boolean; 
      secret?: string | null;
      backupCodes?: string[] | null;
    }
  ): Promise<User> {
    const updateData: Record<string, any> = {
      twoFactorEnabled: options.enabled
    };
    
    if (options.secret !== undefined) {
      updateData.twoFactorSecret = options.secret;
    }
    
    if (options.backupCodes !== undefined) {
      updateData.backupCodes = Array.isArray(options.backupCodes) 
        ? JSON.stringify(options.backupCodes) 
        : options.backupCodes;
    }
    
    const [updatedUser] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, userId))
      .returning();
    
    return updatedUser;
  },
  
  async updateLoginInfo(
    userId: number,
    ipAddress: string
  ): Promise<User> {
    const [updatedUser] = await db
      .update(users)
      .set({
        lastLoginAt: new Date(),
        lastLoginIp: ipAddress
      })
      .where(eq(users.id, userId))
      .returning();
    
    return updatedUser;
  },
  
  async useBackupCode(
    userId: number,
    usedCode: string
  ): Promise<{ success: boolean; remainingCodes: string[] }> {
    // Get current backup codes
    const user = await this.getUserById(userId);
    
    if (!user || !user.backupCodes) {
      return { success: false, remainingCodes: [] };
    }
    
    // Parse backup codes if they're stored as JSON string
    let backupCodes: string[] = [];
    try {
      backupCodes = typeof user.backupCodes === 'string'
        ? JSON.parse(user.backupCodes)
        : (Array.isArray(user.backupCodes) ? user.backupCodes : []);
    } catch (error) {
      console.error('Error parsing backup codes:', error);
      return { success: false, remainingCodes: [] };
    }
    
    const codeIndex = backupCodes.indexOf(usedCode);
    
    if (codeIndex === -1) {
      return { success: false, remainingCodes: backupCodes };
    }
    
    // Remove the used code
    const remainingCodes = [
      ...backupCodes.slice(0, codeIndex),
      ...backupCodes.slice(codeIndex + 1)
    ];
    
    // Update user with remaining codes
    await db
      .update(users)
      .set({ backupCodes: JSON.stringify(remainingCodes) })
      .where(eq(users.id, userId));
      
    return { success: true, remainingCodes };
  },

  // Domain operations
  async getDomainsByUserId(userId: number): Promise<Domain[]> {
    return db.query.domains.findMany({
      where: eq(domains.userId, userId),
      orderBy: [desc(domains.createdAt)]
    });
  },

  async getDomainById(id: number): Promise<Domain | undefined> {
    return db.query.domains.findFirst({
      where: eq(domains.id, id)
    });
  },

  async insertDomain(domainData: Omit<Domain, "id" | "createdAt" | "updatedAt">): Promise<Domain> {
    const [domain] = await db.insert(domains).values(domainData).returning();
    return domain;
  },

  async updateDomainVerification(id: number, isVerified: boolean): Promise<Domain> {
    const [domain] = await db
      .update(domains)
      .set({ isVerified, updatedAt: new Date() })
      .where(eq(domains.id, id))
      .returning();
    return domain;
  },

  async deleteDomain(id: number): Promise<boolean> {
    const result = await db.delete(domains).where(eq(domains.id, id));
    return result.rowCount > 0;
  },

  // Email account operations
  async getEmailAccountsByUserId(userId: number): Promise<EmailAccount[]> {
    // Use a more direct query without the relation to avoid potential issues
    const accounts = await db.select().from(emailAccounts)
      .where(eq(emailAccounts.userId, userId))
      .orderBy(desc(emailAccounts.createdAt));
      
    // Fetch domain information separately if needed
    const domainsMap = new Map<number, Domain>();
    
    if (accounts.length > 0) {
      // Get unique domain IDs
      const domainIdsSet = new Set<number>();
      accounts.forEach(acc => domainIdsSet.add(acc.domainId));
      const domainIds = Array.from(domainIdsSet);
      
      const relatedDomains = await db.select().from(domains)
        .where(inArray(domains.id, domainIds));
        
      for (const domain of relatedDomains) {
        domainsMap.set(domain.id, domain);
      }
    }
    
    // Return accounts with manually attached domain info
    return accounts.map(account => ({
      ...account,
      domain: domainsMap.get(account.domainId)
    })) as EmailAccount[];
  },

  async getEmailAccountsByDomainId(domainId: number): Promise<EmailAccount[]> {
    return db.query.emailAccounts.findMany({
      where: eq(emailAccounts.domainId, domainId),
      orderBy: [desc(emailAccounts.createdAt)]
    });
  },

  async getEmailAccountById(id: number): Promise<EmailAccount | undefined> {
    // Use a more direct approach without relations to avoid issues
    const account = await db.select().from(emailAccounts)
      .where(eq(emailAccounts.id, id))
      .limit(1)
      .then(results => results[0]);
      
    if (!account) return undefined;
    
    // Get the associated domain separately
    const domain = await db.select().from(domains)
      .where(eq(domains.id, account.domainId))
      .limit(1)
      .then(results => results[0] || null);
      
    // Return the account with the domain manually attached
    return {
      ...account,
      domain
    } as EmailAccount;
  },

  async insertEmailAccount(accountData: Omit<EmailAccount, "id" | "createdAt" | "updatedAt" | "storageUsed" | "isActive">): Promise<EmailAccount> {
    const [account] = await db.insert(emailAccounts).values(accountData).returning();
    return account;
  },

  async updateEmailAccountStatus(id: number, isActive: boolean): Promise<EmailAccount> {
    const [account] = await db
      .update(emailAccounts)
      .set({ isActive, updatedAt: new Date() })
      .where(eq(emailAccounts.id, id))
      .returning();
    return account;
  },

  async updateEmailAccountPassword(id: number, password: string): Promise<EmailAccount> {
    const [account] = await db
      .update(emailAccounts)
      .set({ password, updatedAt: new Date() })
      .where(eq(emailAccounts.id, id))
      .returning();
    return account;
  },

  async deleteEmailAccount(id: number): Promise<boolean> {
    const result = await db.delete(emailAccounts).where(eq(emailAccounts.id, id));
    return result.rowCount > 0;
  },

  // Mail queue operations
  async getMailQueue(): Promise<MailQueueItem[]> {
    return db.query.mailQueue.findMany({
      orderBy: [desc(mailQueue.createdAt)]
    });
  },

  async getMailQueueStats(): Promise<{ pending: number; sent: number; failed: number; }> {
    const pending = await db
      .select({ count: count() })
      .from(mailQueue)
      .where(eq(mailQueue.status, 'pending'));

    const sent = await db
      .select({ count: count() })
      .from(mailQueue)
      .where(eq(mailQueue.status, 'sent'));

    const failed = await db
      .select({ count: count() })
      .from(mailQueue)
      .where(eq(mailQueue.status, 'failed'));

    return {
      pending: pending[0]?.count || 0,
      sent: sent[0]?.count || 0,
      failed: failed[0]?.count || 0
    };
  },

  // Server configuration
  async getAllServerConfig(): Promise<ServerConfigItem[]> {
    return db.query.serverConfig.findMany();
  },

  async updateServerConfig(id: number, value: string): Promise<ServerConfigItem> {
    const [config] = await db
      .update(serverConfig)
      .set({ value, updatedAt: new Date() })
      .where(eq(serverConfig.id, id))
      .returning();
    return config;
  },

  // Service status
  async getAllServiceStatus(): Promise<ServiceStatusItem[]> {
    return db.query.serviceStatus.findMany();
  },

  async updateServiceStatus(id: number, status: string, message?: string): Promise<ServiceStatusItem> {
    const [service] = await db
      .update(serviceStatus)
      .set({ 
        status, 
        message,
        lastChecked: new Date()
      })
      .where(eq(serviceStatus.id, id))
      .returning();
    return service;
  },

  // Activity logs
  async getRecentActivityLogs(limit = 10): Promise<ActivityLog[]> {
    // Fetch logs directly
    const logs = await db.select().from(activityLogs)
      .orderBy(desc(activityLogs.createdAt))
      .limit(limit);
      
    // Get all unique user IDs
    const userIds = new Set<number>();
    logs.forEach(log => {
      if (log.userId) userIds.add(log.userId);
    });
    
    // Fetch users separately
    const userIdsArray = Array.from(userIds);
    const relatedUsers: Record<number, User> = {};
    
    if (userIdsArray.length > 0) {
      const usersResult = await db.select().from(users)
        .where(inArray(users.id, userIdsArray));
      
      if (Array.isArray(usersResult)) {
        usersResult.forEach((user: User) => {
          relatedUsers[user.id] = user;
        });
      }
    }
    
    // Attach users to logs manually
    return logs.map(log => ({
      ...log,
      user: log.userId ? relatedUsers[log.userId] : null
    })) as ActivityLog[];
  },

  async insertActivityLog(logData: Omit<ActivityLog, "id" | "createdAt">): Promise<ActivityLog> {
    const [log] = await db.insert(activityLogs).values(logData).returning();
    return log;
  },

  // Subscription plans
  async getAllSubscriptionPlans(): Promise<SubscriptionPlan[]> {
    return db.query.subscriptionPlans.findMany({
      where: eq(subscriptionPlans.isActive, true),
      orderBy: [subscriptionPlans.price]
    });
  },

  async getSubscriptionPlanById(id: number): Promise<SubscriptionPlan | undefined> {
    return db.query.subscriptionPlans.findFirst({
      where: eq(subscriptionPlans.id, id)
    });
  },

  // Referrals
  async getUserReferrals(userId: number): Promise<Referral[]> {
    // Fetch referrals directly
    const userReferrals = await db.select().from(referrals)
      .where(eq(referrals.referrerId, userId))
      .orderBy(desc(referrals.createdAt));
      
    // Get all unique referred user IDs
    const referredUserIds = new Set<number>();
    userReferrals.forEach(ref => {
      if (ref.referredUserId) referredUserIds.add(ref.referredUserId);
    });
    
    // Fetch referred users separately
    const referredUserIdsArray = Array.from(referredUserIds);
    const relatedUsers: Record<number, User> = {};
    
    if (referredUserIdsArray.length > 0) {
      const referredUsers = await db.select().from(users)
        .where(inArray(users.id, referredUserIdsArray));
      
      if (Array.isArray(referredUsers)) {
        referredUsers.forEach((user: User) => {
          relatedUsers[user.id] = user;
        });
      }
    }
    
    // Attach referred users to referrals manually
    return userReferrals.map(referral => ({
      ...referral,
      referredUser: referral.referredUserId ? relatedUsers[referral.referredUserId] : null
    })) as Referral[];
  },

  async getReferralStats(userId: number): Promise<{
    totalReferrals: number;
    pendingReferrals: number;
    completedReferrals: number;
    totalEarnings: number;
  }> {
    const totalQuery = await db
      .select({ count: count() })
      .from(referrals)
      .where(eq(referrals.referrerId, userId));

    const pendingQuery = await db
      .select({ count: count() })
      .from(referrals)
      .where(and(
        eq(referrals.referrerId, userId),
        eq(referrals.status, 'pending')
      ));

    const completedQuery = await db
      .select({ count: count() })
      .from(referrals)
      .where(and(
        eq(referrals.referrerId, userId),
        eq(referrals.status, 'completed')
      ));

    const earningsQuery = await db
      .select({ total: sum(referrals.reward) })
      .from(referrals)
      .where(and(
        eq(referrals.referrerId, userId),
        eq(referrals.status, 'completed')
      ));

    return {
      totalReferrals: totalQuery[0]?.count || 0,
      pendingReferrals: pendingQuery[0]?.count || 0,
      completedReferrals: completedQuery[0]?.count || 0,
      totalEarnings: earningsQuery[0]?.total || 0
    };
  },

  // Invoice operations
  async getInvoicesByUserId(userId: number): Promise<Invoice[]> {
    return db.query.invoices.findMany({
      where: eq(invoices.userId, userId),
      orderBy: [desc(invoices.createdAt)]
    });
  },

  async getInvoiceById(id: number): Promise<Invoice | undefined> {
    return db.query.invoices.findFirst({
      where: eq(invoices.id, id)
    });
  },

  async getInvoiceByStripeId(stripeInvoiceId: string): Promise<Invoice | undefined> {
    return db.query.invoices.findFirst({
      where: eq(invoices.stripeInvoiceId, stripeInvoiceId)
    });
  },

  async insertInvoice(invoiceData: Omit<Invoice, "id" | "createdAt" | "updatedAt">): Promise<Invoice> {
    const [invoice] = await db.insert(invoices).values(invoiceData).returning();
    return invoice;
  },

  async updateInvoiceStatus(id: number, status: string, paidAt?: Date): Promise<Invoice> {
    const [invoice] = await db
      .update(invoices)
      .set({ 
        status, 
        paidAt, 
        updatedAt: new Date() 
      })
      .where(eq(invoices.id, id))
      .returning();
    return invoice;
  },

  async updateInvoiceUrls(id: number, invoiceUrl: string, receiptUrl?: string): Promise<Invoice> {
    const [invoice] = await db
      .update(invoices)
      .set({ 
        invoiceUrl, 
        receiptUrl, 
        updatedAt: new Date() 
      })
      .where(eq(invoices.id, id))
      .returning();
    return invoice;
  },

  // Email Templates operations
  async getEmailTemplates(userId: number, category?: string): Promise<EmailTemplate[]> {
    let query = db.select().from(emailTemplates).where(eq(emailTemplates.userId, userId));
    
    if (category) {
      query = query.where(eq(emailTemplates.category, category));
    }
    
    return query.orderBy(desc(emailTemplates.updatedAt));
  },
  
  async getEmailTemplateById(id: number, userId: number): Promise<EmailTemplate | undefined> {
    const results = await db
      .select()
      .from(emailTemplates)
      .where(and(
        eq(emailTemplates.id, id),
        eq(emailTemplates.userId, userId)
      ))
      .limit(1);
    
    return results.length > 0 ? results[0] : undefined;
  },
  
  async createEmailTemplate(templateData: Omit<EmailTemplate, "id" | "createdAt" | "updatedAt">): Promise<EmailTemplate> {
    const [template] = await db.insert(emailTemplates).values(templateData).returning();
    return template;
  },
  
  async updateEmailTemplate(id: number, userId: number, data: Partial<Omit<EmailTemplate, "id" | "userId" | "createdAt" | "updatedAt">>): Promise<EmailTemplate | undefined> {
    // Make sure this template belongs to the user
    const template = await this.getEmailTemplateById(id, userId);
    
    if (!template) {
      return undefined;
    }
    
    const [updatedTemplate] = await db
      .update(emailTemplates)
      .set({ ...data, updatedAt: new Date() })
      .where(and(
        eq(emailTemplates.id, id),
        eq(emailTemplates.userId, userId)
      ))
      .returning();
      
    return updatedTemplate;
  },
  
  async deleteEmailTemplate(id: number, userId: number): Promise<boolean> {
    const result = await db
      .delete(emailTemplates)
      .where(and(
        eq(emailTemplates.id, id),
        eq(emailTemplates.userId, userId)
      ));
      
    return result.rowCount ? result.rowCount > 0 : false;
  },
  
  // Dashboard statistics
  async getDashboardStats(userId: number): Promise<{
    totalEmailAccounts: number;
    totalDomains: number;
    verifiedDomains: number;
    totalStorageUsed: number;
    mailServersCount?: number;
    totalMailboxes?: number;
  }> {
    const emailAccountsQuery = await db
      .select({ count: count() })
      .from(emailAccounts)
      .where(eq(emailAccounts.userId, userId));

    const domainsQuery = await db
      .select({ count: count() })
      .from(domains)
      .where(eq(domains.userId, userId));

    const verifiedDomainsQuery = await db
      .select({ count: count() })
      .from(domains)
      .where(and(
        eq(domains.userId, userId),
        eq(domains.isVerified, true)
      ));

    const storageQuery = await db
      .select({ total: sum(emailAccounts.storageUsed) })
      .from(emailAccounts)
      .where(eq(emailAccounts.userId, userId));
      
    // Add mail server counts for Mail-in-a-Box
    const mailServersQuery = await db
      .select({ count: count() })
      .from(mailServers)
      .where(eq(mailServers.userId, userId));
      
    // Get total mailboxes across all servers owned by the user
    // Using raw SQL here to avoid relation issues
    const mailboxesQuery = await db.execute<{ count: string }>(sql`
      SELECT COUNT(*) as count
      FROM mailboxes mb
      INNER JOIN mail_servers ms ON mb.server_id = ms.id
      WHERE ms.user_id = ${userId}
    `).then(result => {
      return result.rows;
    });

    return {
      totalEmailAccounts: emailAccountsQuery[0]?.count || 0,
      totalDomains: domainsQuery[0]?.count || 0,
      verifiedDomains: verifiedDomainsQuery[0]?.count || 0,
      totalStorageUsed: storageQuery[0]?.total || 0,
      mailServersCount: mailServersQuery[0]?.count || 0,
      totalMailboxes: Number(mailboxesQuery[0]?.count || 0)
    };
  },
  
  // Mail-in-a-Box Server operations
  async getMailServersByUserId(userId: number): Promise<MailServer[]> {
    return db.query.mailServers.findMany({
      where: eq(mailServers.userId, userId),
      orderBy: [desc(mailServers.createdAt)]
    });
  },
  
  async getMailServerById(id: number): Promise<MailServer | undefined> {
    return db.query.mailServers.findFirst({
      where: eq(mailServers.id, id),
    });
  },
  
  async insertMailServer(serverData: Omit<MailServer, "id" | "createdAt" | "updatedAt" | "lastSyncedAt" | "isActive">): Promise<MailServer> {
    const [server] = await db.insert(mailServers)
      .values({
        ...serverData,
        isActive: true,
        status: 'unknown'
      })
      .returning();
    return server;
  },
  
  async updateMailServerStatus(id: number, statusData: { 
    status: string; 
    version?: string;
    lastSyncedAt?: Date;
  }): Promise<MailServer> {
    const updateData: Record<string, any> = {
      status: statusData.status,
      updatedAt: new Date()
    };
    
    if (statusData.version) {
      updateData.version = statusData.version;
    }
    
    if (statusData.lastSyncedAt) {
      updateData.lastSyncedAt = statusData.lastSyncedAt;
    }
    
    const [server] = await db
      .update(mailServers)
      .set(updateData)
      .where(eq(mailServers.id, id))
      .returning();
    return server;
  },
  
  async deleteMailServer(id: number): Promise<boolean> {
    const result = await db.delete(mailServers).where(eq(mailServers.id, id));
    return result.rowCount > 0;
  },
  
  // DNS Records operations
  async getDnsRecordsByServerId(serverId: number): Promise<DnsRecord[]> {
    return db.query.dnsRecords.findMany({
      where: eq(dnsRecords.serverId, serverId),
      orderBy: [dnsRecords.name, dnsRecords.recordType]
    });
  },
  
  async insertDnsRecord(recordData: Omit<DnsRecord, "id" | "createdAt" | "updatedAt">): Promise<DnsRecord> {
    const [record] = await db.insert(dnsRecords).values(recordData).returning();
    return record;
  },
  
  async deleteDnsRecord(id: number): Promise<boolean> {
    const result = await db.delete(dnsRecords).where(eq(dnsRecords.id, id));
    return result.rowCount > 0;
  },
  
  async replaceAllDnsRecords(serverId: number, records: Omit<DnsRecord, "id" | "createdAt" | "updatedAt">[]): Promise<DnsRecord[]> {
    // First delete all existing DNS records for this server
    await db.delete(dnsRecords).where(eq(dnsRecords.serverId, serverId));
    
    // Then insert the new records
    if (records.length === 0) {
      return [];
    }
    
    const insertedRecords = await db.insert(dnsRecords).values(records).returning();
    return insertedRecords;
  },
  
  // Mailbox operations
  async getMailboxesByServerId(serverId: number): Promise<Mailbox[]> {
    return db.query.mailboxes.findMany({
      where: eq(mailboxes.serverId, serverId),
      orderBy: [mailboxes.email]
    });
  },
  
  async getMailboxById(id: number): Promise<Mailbox | undefined> {
    return db.query.mailboxes.findFirst({
      where: eq(mailboxes.id, id)
    });
  },
  
  async insertMailbox(mailboxData: Omit<Mailbox, "id" | "createdAt" | "updatedAt" | "storageUsed" | "lastLogin">): Promise<Mailbox> {
    const [mailbox] = await db.insert(mailboxes).values({
      ...mailboxData,
      storageUsed: 0,
      status: 'active'
    }).returning();
    return mailbox;
  },
  
  async updateMailboxStatus(id: number, status: string): Promise<Mailbox> {
    const [mailbox] = await db
      .update(mailboxes)
      .set({ 
        status,
        updatedAt: new Date() 
      })
      .where(eq(mailboxes.id, id))
      .returning();
    return mailbox;
  },
  
  async updateMailboxStorageUsed(id: number, storageUsed: number): Promise<Mailbox> {
    const [mailbox] = await db
      .update(mailboxes)
      .set({ 
        storageUsed,
        updatedAt: new Date() 
      })
      .where(eq(mailboxes.id, id))
      .returning();
    return mailbox;
  },
  
  async deleteMailbox(id: number): Promise<boolean> {
    const result = await db.delete(mailboxes).where(eq(mailboxes.id, id));
    return result.rowCount > 0;
  },
  
  async replaceAllMailboxes(serverId: number, mailboxesData: Omit<Mailbox, "id" | "createdAt" | "updatedAt">[]): Promise<Mailbox[]> {
    // First delete all existing mailboxes for this server
    await db.delete(mailboxes).where(eq(mailboxes.serverId, serverId));
    
    // Then insert the new mailboxes
    if (mailboxesData.length === 0) {
      return [];
    }
    
    const insertedMailboxes = await db.insert(mailboxes).values(mailboxesData).returning();
    return insertedMailboxes;
  },
  
  // Email Aliases operations
  async getEmailAliasesByServerId(serverId: number): Promise<EmailAlias[]> {
    return db.query.emailAliases.findMany({
      where: eq(emailAliases.serverId, serverId),
      orderBy: [emailAliases.sourceEmail]
    });
  },
  
  async getEmailAliasesByMailboxId(mailboxId: number): Promise<EmailAlias[]> {
    return db.query.emailAliases.findMany({
      where: eq(emailAliases.mailboxId, mailboxId),
      orderBy: [emailAliases.sourceEmail]
    });
  },
  
  async insertEmailAlias(aliasData: Omit<EmailAlias, "id" | "createdAt" | "updatedAt">): Promise<EmailAlias> {
    const [alias] = await db.insert(emailAliases).values({
      ...aliasData,
      isActive: true
    }).returning();
    return alias;
  },
  
  async updateEmailAliasStatus(id: number, isActive: boolean): Promise<EmailAlias> {
    const [alias] = await db
      .update(emailAliases)
      .set({ 
        isActive,
        updatedAt: new Date() 
      })
      .where(eq(emailAliases.id, id))
      .returning();
    return alias;
  },
  
  async deleteEmailAlias(id: number): Promise<boolean> {
    const result = await db.delete(emailAliases).where(eq(emailAliases.id, id));
    return result.rowCount > 0;
  },
  
  async replaceAllEmailAliases(serverId: number, aliasesData: Omit<EmailAlias, "id" | "createdAt" | "updatedAt">[]): Promise<EmailAlias[]> {
    // First delete all existing aliases for this server
    await db.delete(emailAliases).where(eq(emailAliases.serverId, serverId));
    
    // Then insert the new aliases
    if (aliasesData.length === 0) {
      return [];
    }
    
    const insertedAliases = await db.insert(emailAliases).values(aliasesData).returning();
    return insertedAliases;
  },
  
  // Backup Jobs operations
  async getBackupJobsByServerId(serverId: number): Promise<BackupJob[]> {
    return db.query.backupJobs.findMany({
      where: eq(backupJobs.serverId, serverId),
      orderBy: [desc(backupJobs.createdAt)]
    });
  },
  
  async getBackupJobById(id: number): Promise<BackupJob | undefined> {
    return db.query.backupJobs.findFirst({
      where: eq(backupJobs.id, id)
    });
  },
  
  async insertBackupJob(jobData: Omit<BackupJob, "id" | "createdAt" | "updatedAt" | "lastRunAt" | "nextRunAt">): Promise<BackupJob> {
    const [job] = await db.insert(backupJobs).values({
      ...jobData,
      status: 'pending'
    }).returning();
    return job;
  },
  
  async updateBackupJobStatus(id: number, status: string, lastRunAt?: Date, nextRunAt?: Date): Promise<BackupJob> {
    const updateData: Record<string, any> = {
      status,
      updatedAt: new Date()
    };
    
    if (lastRunAt) {
      updateData.lastRunAt = lastRunAt;
    }
    
    if (nextRunAt) {
      updateData.nextRunAt = nextRunAt;
    }
    
    const [job] = await db
      .update(backupJobs)
      .set(updateData)
      .where(eq(backupJobs.id, id))
      .returning();
    return job;
  },
  
  async deleteBackupJob(id: number): Promise<boolean> {
    const result = await db.delete(backupJobs).where(eq(backupJobs.id, id));
    return result.rowCount > 0;
  },
  
  // Backup History operations
  async getBackupHistoryByJobId(jobId: number, limit = 10): Promise<BackupHistoryEntry[]> {
    return db.query.backupHistory.findMany({
      where: eq(backupHistory.jobId, jobId),
      orderBy: [desc(backupHistory.startedAt)],
      limit
    });
  },
  
  async insertBackupHistoryEntry(entryData: Omit<BackupHistoryEntry, "id">): Promise<BackupHistoryEntry> {
    const [entry] = await db.insert(backupHistory).values(entryData).returning();
    return entry;
  },
  
  async updateBackupHistoryCompletion(id: number, status: string, completedAt: Date, sizeBytes?: number, error?: string): Promise<BackupHistoryEntry> {
    const updateData: Record<string, any> = {
      status,
      completedAt
    };
    
    if (sizeBytes !== undefined) {
      updateData.sizeBytes = sizeBytes;
    }
    
    if (error !== undefined) {
      updateData.error = error;
    }
    
    const [entry] = await db
      .update(backupHistory)
      .set(updateData)
      .where(eq(backupHistory.id, id))
      .returning();
    return entry;
  },
  
  // Server Metrics operations
  async getServerMetricsById(serverId: number, limit = 24): Promise<ServerMetricsEntry[]> {
    return db.query.serverMetrics.findMany({
      where: eq(serverMetrics.serverId, serverId),
      orderBy: [desc(serverMetrics.timestamp)],
      limit
    });
  },
  
  async insertServerMetrics(serverId: number, metricsData: Omit<ServerMetricsEntry, "id" | "serverId" | "timestamp">): Promise<ServerMetricsEntry> {
    const [metrics] = await db.insert(serverMetrics).values({
      serverId,
      ...metricsData,
      timestamp: new Date()
    }).returning();
    return metrics;
  },
  
  async updateServerMetricsQueueSize(serverId: number, queueSize: number): Promise<boolean> {
    // Get the most recent metrics entry
    const latestMetrics = await db.query.serverMetrics.findFirst({
      where: eq(serverMetrics.serverId, serverId),
      orderBy: [desc(serverMetrics.timestamp)]
    });
    
    if (!latestMetrics) {
      return false;
    }
    
    // Update the queue size
    await db
      .update(serverMetrics)
      .set({ queueSize })
      .where(eq(serverMetrics.id, latestMetrics.id));
      
    return true;
  },
  
  // Spam Filters operations
  async getSpamFiltersByServerId(serverId: number): Promise<SpamFilter[]> {
    return db.query.spamFilters.findMany({
      where: eq(spamFilters.serverId, serverId),
      orderBy: [spamFilters.name]
    });
  },
  
  async getSpamFilterById(id: number): Promise<SpamFilter | undefined> {
    return db.query.spamFilters.findFirst({
      where: eq(spamFilters.id, id)
    });
  },
  
  async insertSpamFilter(filterData: Omit<SpamFilter, "id" | "createdAt" | "updatedAt">): Promise<SpamFilter> {
    const [filter] = await db.insert(spamFilters).values({
      ...filterData,
      isActive: true
    }).returning();
    return filter;
  },
  
  async updateSpamFilterStatus(id: number, isActive: boolean): Promise<SpamFilter> {
    const [filter] = await db
      .update(spamFilters)
      .set({ 
        isActive,
        updatedAt: new Date() 
      })
      .where(eq(spamFilters.id, id))
      .returning();
    return filter;
  },
  
  async deleteSpamFilter(id: number): Promise<boolean> {
    const result = await db.delete(spamFilters).where(eq(spamFilters.id, id));
    return result.rowCount > 0;
  },
  
  async replaceAllSpamFilters(serverId: number, filtersData: Omit<SpamFilter, "id" | "createdAt" | "updatedAt">[]): Promise<SpamFilter[]> {
    // Start a transaction
    return await db.transaction(async (tx) => {
      // Delete all existing spam filters for this server
      await tx.delete(spamFilters).where(eq(spamFilters.serverId, serverId));
      
      // Insert new filters
      if (filtersData.length > 0) {
        await tx.insert(spamFilters).values(filtersData);
      }
      
      // Return the updated list
      const updatedFilters = await tx.query.spamFilters.findMany({
        where: eq(spamFilters.serverId, serverId),
        orderBy: [spamFilters.name]
      });
      
      return updatedFilters;
    });
  },
  
  async replaceAllBackupJobs(serverId: number, jobsData: Omit<BackupJob, "id" | "createdAt" | "updatedAt" | "lastRunAt" | "nextRunAt">[]): Promise<BackupJob[]> {
    // Start a transaction
    return await db.transaction(async (tx) => {
      // Delete all existing backup jobs for this server
      await tx.delete(backupJobs).where(eq(backupJobs.serverId, serverId));
      
      // Insert new backup jobs
      if (jobsData.length > 0) {
        await tx.insert(backupJobs).values(jobsData);
      }
      
      // Return the updated list
      const updatedJobs = await tx.query.backupJobs.findMany({
        where: eq(backupJobs.serverId, serverId),
        orderBy: [desc(backupJobs.createdAt)]
      });
      
      return updatedJobs;
    });
  }
};
