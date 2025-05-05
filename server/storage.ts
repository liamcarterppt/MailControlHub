import { eq, and, desc, sql, count, sum } from "drizzle-orm";
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
  User,
  Domain,
  EmailAccount,
  ServerConfigItem,
  ServiceStatusItem,
  ActivityLog,
  SubscriptionPlan,
  Referral,
  MailQueueItem
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
    return db.query.emailAccounts.findMany({
      where: eq(emailAccounts.userId, userId),
      orderBy: [desc(emailAccounts.createdAt)],
      with: {
        domain: true
      }
    });
  },

  async getEmailAccountsByDomainId(domainId: number): Promise<EmailAccount[]> {
    return db.query.emailAccounts.findMany({
      where: eq(emailAccounts.domainId, domainId),
      orderBy: [desc(emailAccounts.createdAt)]
    });
  },

  async getEmailAccountById(id: number): Promise<EmailAccount | undefined> {
    return db.query.emailAccounts.findFirst({
      where: eq(emailAccounts.id, id),
      with: {
        domain: true
      }
    });
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
    return db.query.activityLogs.findMany({
      orderBy: [desc(activityLogs.createdAt)],
      limit,
      with: {
        user: true
      }
    });
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
    return db.query.referrals.findMany({
      where: eq(referrals.referrerId, userId),
      with: {
        referredUser: true
      }
    });
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

  // Dashboard statistics
  async getDashboardStats(userId: number): Promise<{
    totalEmailAccounts: number;
    totalDomains: number;
    verifiedDomains: number;
    totalStorageUsed: number;
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

    return {
      totalEmailAccounts: emailAccountsQuery[0]?.count || 0,
      totalDomains: domainsQuery[0]?.count || 0,
      verifiedDomains: verifiedDomainsQuery[0]?.count || 0,
      totalStorageUsed: storageQuery[0]?.total || 0
    };
  }
};
