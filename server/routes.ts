import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import bcrypt from "bcrypt";
import session from "express-session";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import pgSession from "connect-pg-simple";
import { pool, db } from "@db";
import Stripe from "stripe";
import { z } from "zod";
import {
  insertUserSchema,
  insertDomainSchema,
  insertEmailAccountSchema,
  insertServerConfigSchema,
  users,
  domains,
  emailAccounts,
  resellerSettings,
  resellerCommissionTiers,
  invoices
} from "@shared/schema";
import { eq, and, or, asc, desc, sql } from "drizzle-orm";

// Setup session store with postgres
const PgSession = pgSession(session);

// Initialize Stripe if secret is available
let stripe: Stripe | null = null;
if (process.env.STRIPE_SECRET_KEY) {
  stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2023-10-16",
  });
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up session middleware
  app.use(
    session({
      store: new PgSession({
        pool,
        tableName: "session",
        createTableIfMissing: true,
      }),
      secret: process.env.SESSION_SECRET || "mail-in-a-box-session-secret",
      resave: false,
      saveUninitialized: false,
      cookie: {
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        secure: process.env.NODE_ENV === "production",
      },
    })
  );

  // Set up Passport
  app.use(passport.initialize());
  app.use(passport.session());

  // Configure Passport local strategy
  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user) {
          return done(null, false, { message: "Incorrect username." });
        }

        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) {
          return done(null, false, { message: "Incorrect password." });
        }

        return done(null, user);
      } catch (err) {
        return done(err);
      }
    })
  );

  // Serialize and deserialize user
  passport.serializeUser((user: Express.User, done) => {
    done(null, (user as any).id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUserById(id);
      done(null, user);
    } catch (err) {
      done(err);
    }
  });

  // Auth middleware
  const isAuthenticated = (req: any, res: any, next: any) => {
    if (req.isAuthenticated()) {
      return next();
    }
    res.status(401).json({ message: "Unauthorized" });
  };

  // Authentication routes
  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) {
        return next(err);
      }
      if (!user) {
        return res.status(401).json({ message: info.message });
      }
      req.logIn(user, (err) => {
        if (err) {
          return next(err);
        }
        // Don't send password back to client
        const { password, ...userWithoutPassword } = user;
        return res.json(userWithoutPassword);
      });
    })(req, res, next);
  });

  app.post("/api/register", async (req, res) => {
    try {
      // Validate request body
      const userData = insertUserSchema.parse(req.body);

      // Check if username already exists
      const existingUser = await storage.getUserByUsername(userData.username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }

      // Hash password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(userData.password, salt);

      // Process referral if provided
      let referredBy = null;
      if (req.body.referralCode) {
        const referrer = await users.findFirst({
          where: eq(users.referralCode, req.body.referralCode)
        });
        if (referrer) {
          referredBy = referrer.id;
        }
      }

      // Create user
      const user = await storage.insertUser({
        ...userData,
        password: hashedPassword,
        referredBy
      });

      // Log activity
      await storage.insertActivityLog({
        action: "user.register",
        details: { username: user.username },
        ipAddress: req.ip
      });

      // Don't send password back to client
      const { password, ...userWithoutPassword } = user;
      res.status(201).json(userWithoutPassword);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      console.error("Error registering user:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/logout", (req, res) => {
    req.logout(() => {
      res.status(200).json({ message: "Logged out successfully" });
    });
  });

  app.get("/api/me", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const { password, ...userWithoutPassword } = user;
      
      // If user is a reseller, include reseller settings
      let resellerData = null;
      if (user.isReseller) {
        const settings = await db.query.resellerSettings.findFirst({
          where: eq(resellerSettings.userId, user.id)
        });
        
        // Get commission tiers
        const tiers = await db.select()
          .from(resellerCommissionTiers)
          .where(eq(resellerCommissionTiers.userId, user.id))
          .orderBy(asc(resellerCommissionTiers.minimumRevenue));
          
        // Get customer count
        const customerCount = await db.select({ count: sql`count(*)` })
          .from(users)
          .where(eq(users.resellerId, user.id));
          
        resellerData = {
          settings,
          tiers,
          customerCount: customerCount[0].count || 0
        };
      }
      
      res.json({
        ...userWithoutPassword,
        resellerData
      });
    } catch (error) {
      console.error("Error fetching user data:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Dashboard routes
  app.get("/api/dashboard", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      
      // Get various dashboard stats
      const [
        stats,
        emailAccounts,
        domains,
        serviceStatuses,
        recentActivity,
        referralStats,
        mailQueueStats
      ] = await Promise.all([
        storage.getDashboardStats(userId),
        storage.getEmailAccountsByUserId(userId),
        storage.getDomainsByUserId(userId),
        storage.getAllServiceStatus(),
        storage.getRecentActivityLogs(4),
        storage.getReferralStats(userId),
        storage.getMailQueueStats()
      ]);

      // Get user's subscription plan if available
      let subscriptionPlan = null;
      const user = req.user as any;
      if (user.stripeSubscriptionId && stripe) {
        const subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
        const product = await stripe.products.retrieve(subscription.items.data[0].price.product as string);
        
        subscriptionPlan = {
          name: product.name,
          status: subscription.status,
          currentPeriodEnd: new Date(subscription.current_period_end * 1000),
          pricePerMonth: subscription.items.data[0].price.unit_amount,
          features: product.metadata.features ? JSON.parse(product.metadata.features) : []
        };
      }

      res.json({
        stats,
        emailAccounts: emailAccounts.length,
        domains: {
          total: domains.length,
          verified: domains.filter(d => d.isVerified).length
        },
        serviceStatuses,
        recentActivity,
        referralStats,
        mailQueueStats,
        subscriptionPlan,
        storageUsage: {
          used: stats.totalStorageUsed,
          // Get storage limit from subscription plan or use default
          total: 1024 * 1024 * 1024 * 70 // 70GB default
        }
      });
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Email account routes
  app.get("/api/email-accounts", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const accounts = await storage.getEmailAccountsByUserId(userId);
      res.json(accounts);
    } catch (error) {
      console.error("Error fetching email accounts:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/email-accounts", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      
      // Validate request body
      const accountData = insertEmailAccountSchema.parse(req.body);
      
      // Check if domain exists and belongs to user
      const domain = await storage.getDomainById(accountData.domainId);
      if (!domain || domain.userId !== userId) {
        return res.status(400).json({ message: "Invalid domain" });
      }

      // Hash password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(accountData.password, salt);

      // Create email account
      const account = await storage.insertEmailAccount({
        ...accountData,
        userId,
        password: hashedPassword
      });

      // Log activity
      await storage.insertActivityLog({
        userId,
        action: "email_account.create",
        details: { 
          username: account.username,
          domain: domain.name
        },
        ipAddress: req.ip
      });

      res.status(201).json(account);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      console.error("Error creating email account:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch("/api/email-accounts/:id/status", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const { isActive } = req.body;
      
      if (typeof isActive !== 'boolean') {
        return res.status(400).json({ message: "isActive must be a boolean" });
      }

      const userId = (req.user as any).id;
      
      // Check if account exists and belongs to user
      const account = await storage.getEmailAccountById(parseInt(id));
      if (!account || account.userId !== userId) {
        return res.status(404).json({ message: "Email account not found" });
      }

      // Update account status
      const updatedAccount = await storage.updateEmailAccountStatus(parseInt(id), isActive);

      // Log activity
      await storage.insertActivityLog({
        userId,
        action: isActive ? "email_account.activate" : "email_account.deactivate",
        details: { 
          username: account.username,
          domain: account.domain.name
        },
        ipAddress: req.ip
      });

      res.json(updatedAccount);
    } catch (error) {
      console.error("Error updating email account status:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/email-accounts/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const userId = (req.user as any).id;
      
      // Check if account exists and belongs to user
      const account = await storage.getEmailAccountById(parseInt(id));
      if (!account || account.userId !== userId) {
        return res.status(404).json({ message: "Email account not found" });
      }

      // Delete account
      await storage.deleteEmailAccount(parseInt(id));

      // Log activity
      await storage.insertActivityLog({
        userId,
        action: "email_account.delete",
        details: { 
          username: account.username,
          domain: account.domain.name
        },
        ipAddress: req.ip
      });

      res.status(204).send();
    } catch (error) {
      console.error("Error deleting email account:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Domain routes
  app.get("/api/domains", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const domains = await storage.getDomainsByUserId(userId);
      res.json(domains);
    } catch (error) {
      console.error("Error fetching domains:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/domains", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      
      // Validate request body
      const domainData = insertDomainSchema.parse(req.body);
      
      // Create domain
      const domain = await storage.insertDomain({
        ...domainData,
        userId
      });

      // Log activity
      await storage.insertActivityLog({
        userId,
        action: "domain.create",
        details: { name: domain.name },
        ipAddress: req.ip
      });

      res.status(201).json(domain);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      console.error("Error creating domain:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch("/api/domains/:id/verify", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const userId = (req.user as any).id;
      
      // Check if domain exists and belongs to user
      const domain = await storage.getDomainById(parseInt(id));
      if (!domain || domain.userId !== userId) {
        return res.status(404).json({ message: "Domain not found" });
      }

      // Verify domain (in a real app, this would involve actual DNS verification)
      const updatedDomain = await storage.updateDomainVerification(parseInt(id), true);

      // Log activity
      await storage.insertActivityLog({
        userId,
        action: "domain.verify",
        details: { name: domain.name },
        ipAddress: req.ip
      });

      res.json(updatedDomain);
    } catch (error) {
      console.error("Error verifying domain:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/domains/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const userId = (req.user as any).id;
      
      // Check if domain exists and belongs to user
      const domain = await storage.getDomainById(parseInt(id));
      if (!domain || domain.userId !== userId) {
        return res.status(404).json({ message: "Domain not found" });
      }

      // Check if domain has email accounts
      const accounts = await storage.getEmailAccountsByDomainId(parseInt(id));
      if (accounts.length > 0) {
        return res.status(400).json({ 
          message: "Cannot delete domain with active email accounts. Delete all email accounts first." 
        });
      }

      // Delete domain
      await storage.deleteDomain(parseInt(id));

      // Log activity
      await storage.insertActivityLog({
        userId,
        action: "domain.delete",
        details: { name: domain.name },
        ipAddress: req.ip
      });

      res.status(204).send();
    } catch (error) {
      console.error("Error deleting domain:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Mail queue routes
  app.get("/api/mail-queue", isAuthenticated, async (req, res) => {
    try {
      const queue = await storage.getMailQueue();
      res.json(queue);
    } catch (error) {
      console.error("Error fetching mail queue:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Server configuration routes
  app.get("/api/server-config", isAuthenticated, async (req, res) => {
    try {
      const config = await storage.getAllServerConfig();
      res.json(config);
    } catch (error) {
      console.error("Error fetching server config:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch("/api/server-config/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const { value } = req.body;
      
      if (!value && value !== "") {
        return res.status(400).json({ message: "Value is required" });
      }

      // Update config
      const updatedConfig = await storage.updateServerConfig(parseInt(id), value);

      // Log activity
      await storage.insertActivityLog({
        userId: (req.user as any).id,
        action: "server_config.update",
        details: { name: updatedConfig.name, value },
        ipAddress: req.ip
      });

      res.json(updatedConfig);
    } catch (error) {
      console.error("Error updating server config:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Service status routes
  app.get("/api/service-status", isAuthenticated, async (req, res) => {
    try {
      const statuses = await storage.getAllServiceStatus();
      res.json(statuses);
    } catch (error) {
      console.error("Error fetching service status:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Stripe payment route for one-time payments
  app.post("/api/create-payment-intent", isAuthenticated, async (req, res) => {
    try {
      if (!stripe) {
        return res.status(500).json({ message: "Stripe is not configured" });
      }
      
      const { amount } = req.body;
      if (!amount || isNaN(parseFloat(amount))) {
        return res.status(400).json({ message: "Valid amount is required" });
      }
      
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(parseFloat(amount) * 100), // Convert to cents
        currency: "usd",
        metadata: {
          userId: (req.user as any).id.toString()
        }
      });
      
      res.json({ clientSecret: paymentIntent.client_secret });
    } catch (error: any) {
      console.error("Error creating payment intent:", error);
      res.status(500).json({ message: "Error creating payment intent: " + error.message });
    }
  });

  // Reseller management routes
  app.post("/api/reseller/register", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const user = await storage.getUserById(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      if (user.isReseller) {
        return res.status(400).json({ message: "User is already a reseller" });
      }
      
      // Validate request body for reseller settings
      const { companyName, supportEmail, customDomain, primaryColor, accentColor } = req.body;
      
      if (!companyName) {
        return res.status(400).json({ message: "Company name is required" });
      }
      
      // Update user to be a reseller
      await db.update(users)
        .set({ isReseller: true })
        .where(eq(users.id, userId));
      
      // Create reseller settings
      await db.insert(resellerSettings).values({
        userId,
        companyName,
        supportEmail: supportEmail || null,
        customDomain: customDomain || null,
        primaryColor: primaryColor || '#4f46e5',
        accentColor: accentColor || '#10b981'
      });
      
      // Log activity
      await storage.insertActivityLog({
        userId,
        action: "reseller.register",
        details: { companyName },
        ipAddress: req.ip
      });
      
      res.status(201).json({ message: "Registered as reseller successfully" });
    } catch (error) {
      console.error("Error registering as reseller:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  app.get("/api/reseller/settings", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const user = await storage.getUserById(userId);
      
      if (!user || !user.isReseller) {
        return res.status(403).json({ message: "Not authorized as a reseller" });
      }
      
      const settings = await db.query.resellerSettings.findFirst({
        where: eq(resellerSettings.userId, userId)
      });
      
      if (!settings) {
        return res.status(404).json({ message: "Reseller settings not found" });
      }
      
      res.json(settings);
    } catch (error) {
      console.error("Error fetching reseller settings:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  app.patch("/api/reseller/settings", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const user = await storage.getUserById(userId);
      
      if (!user || !user.isReseller) {
        return res.status(403).json({ message: "Not authorized as a reseller" });
      }
      
      const settings = await db.query.resellerSettings.findFirst({
        where: eq(resellerSettings.userId, userId)
      });
      
      if (!settings) {
        return res.status(404).json({ message: "Reseller settings not found" });
      }
      
      const { 
        companyName, 
        supportEmail, 
        customDomain, 
        primaryColor,
        accentColor,
        whiteLabel,
        commissionRate,
        maxCustomers,
        maxDomainsPerCustomer,
        maxEmailsPerDomain 
      } = req.body;
      
      // Update reseller settings
      const updatedSettings = await db.update(resellerSettings)
        .set({
          companyName: companyName || settings.companyName,
          supportEmail: supportEmail !== undefined ? supportEmail : settings.supportEmail,
          customDomain: customDomain !== undefined ? customDomain : settings.customDomain,
          primaryColor: primaryColor || settings.primaryColor,
          accentColor: accentColor || settings.accentColor,
          whiteLabel: whiteLabel !== undefined ? whiteLabel : settings.whiteLabel,
          commissionRate: commissionRate !== undefined ? commissionRate : settings.commissionRate,
          maxCustomers: maxCustomers !== undefined ? maxCustomers : settings.maxCustomers,
          maxDomainsPerCustomer: maxDomainsPerCustomer !== undefined ? maxDomainsPerCustomer : settings.maxDomainsPerCustomer,
          maxEmailsPerDomain: maxEmailsPerDomain !== undefined ? maxEmailsPerDomain : settings.maxEmailsPerDomain,
          updatedAt: new Date()
        })
        .where(eq(resellerSettings.userId, userId))
        .returning();
      
      // Log activity
      await storage.insertActivityLog({
        userId,
        action: "reseller.settings.update",
        details: { id: settings.id },
        ipAddress: req.ip
      });
      
      res.json(updatedSettings[0]);
    } catch (error) {
      console.error("Error updating reseller settings:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Reseller customer management
  app.post("/api/reseller/customers", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const user = await storage.getUserById(userId);
      
      if (!user || !user.isReseller) {
        return res.status(403).json({ message: "Not authorized as a reseller" });
      }
      
      const settings = await db.query.resellerSettings.findFirst({
        where: eq(resellerSettings.userId, userId)
      });
      
      if (!settings) {
        return res.status(404).json({ message: "Reseller settings not found" });
      }
      
      // Check if reseller has reached customer limit
      const customerCount = await db.select({ count: sql`count(*)` })
        .from(users)
        .where(eq(users.resellerId, userId));
      
      if (customerCount[0].count >= settings.maxCustomers) {
        return res.status(400).json({ message: `You've reached your maximum customer limit of ${settings.maxCustomers}` });
      }
      
      // Validate request body
      const { name, email, username, password, customId } = req.body;
      
      if (!name || !email || !username || !password) {
        return res.status(400).json({ message: "Name, email, username, and password are required" });
      }
      
      // Check if username or email already exists
      const existingUser = await db.query.users.findFirst({
        where: or(
          eq(users.username, username),
          eq(users.email, email)
        )
      });
      
      if (existingUser) {
        return res.status(400).json({ message: "Username or email already exists" });
      }
      
      // Hash password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      
      // Create customer account under reseller
      const newUser = await db.insert(users)
        .values({
          name,
          email,
          username,
          password: hashedPassword,
          resellerId: userId,
          resellerCustomId: customId || null,
          role: 'user'
        })
        .returning();
      
      // Log activity
      await storage.insertActivityLog({
        userId,
        action: "reseller.customer.create",
        details: { customerId: newUser[0].id, customerEmail: email },
        ipAddress: req.ip
      });
      
      // Don't send password back to client
      const { password: _, ...userWithoutPassword } = newUser[0];
      res.status(201).json(userWithoutPassword);
    } catch (error) {
      console.error("Error creating reseller customer:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  app.get("/api/reseller/customers", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const user = await storage.getUserById(userId);
      
      if (!user || !user.isReseller) {
        return res.status(403).json({ message: "Not authorized as a reseller" });
      }
      
      // Get customers of the reseller
      const customers = await db.select({
        id: users.id,
        name: users.name,
        email: users.email,
        username: users.username,
        resellerCustomId: users.resellerCustomId,
        createdAt: users.createdAt,
        stripeCustomerId: users.stripeCustomerId,
        stripeSubscriptionId: users.stripeSubscriptionId
      })
      .from(users)
      .where(eq(users.resellerId, userId));
      
      res.json(customers);
    } catch (error) {
      console.error("Error fetching reseller customers:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  app.get("/api/reseller/customers/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const customerId = parseInt(req.params.id);
      const user = await storage.getUserById(userId);
      
      if (!user || !user.isReseller) {
        return res.status(403).json({ message: "Not authorized as a reseller" });
      }
      
      // Get the customer
      const customer = await db.query.users.findFirst({
        where: and(
          eq(users.id, customerId),
          eq(users.resellerId, userId)
        ),
        with: {
          domains: true
        }
      });
      
      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }
      
      // Don't send password back to client
      const { password, ...customerWithoutPassword } = customer;
      
      // Get email accounts count
      const emailAccountsCount = await db.select({ count: sql`count(*)` })
        .from(emailAccounts)
        .where(eq(emailAccounts.userId, customerId));
      
      // Get storage usage
      const storageUsage = await db.select({ total: sql`sum(storage_used)` })
        .from(emailAccounts)
        .where(eq(emailAccounts.userId, customerId));
      
      const customerData = {
        ...customerWithoutPassword,
        emailAccountsCount: emailAccountsCount[0].count || 0,
        storageUsage: storageUsage[0].total || 0
      };
      
      res.json(customerData);
    } catch (error) {
      console.error("Error fetching reseller customer:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  app.patch("/api/reseller/customers/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const customerId = parseInt(req.params.id);
      const user = await storage.getUserById(userId);
      
      if (!user || !user.isReseller) {
        return res.status(403).json({ message: "Not authorized as a reseller" });
      }
      
      // Get the customer
      const customer = await db.query.users.findFirst({
        where: and(
          eq(users.id, customerId),
          eq(users.resellerId, userId)
        )
      });
      
      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }
      
      const { name, email, password, resellerCustomId } = req.body;
      const updateData: any = {};
      
      if (name) updateData.name = name;
      if (email) updateData.email = email;
      if (resellerCustomId !== undefined) updateData.resellerCustomId = resellerCustomId;
      
      // Hash password if provided
      if (password) {
        const salt = await bcrypt.genSalt(10);
        updateData.password = await bcrypt.hash(password, salt);
      }
      
      // Update the customer
      const updatedCustomer = await db.update(users)
        .set(updateData)
        .where(and(
          eq(users.id, customerId),
          eq(users.resellerId, userId)
        ))
        .returning();
      
      // Log activity
      await storage.insertActivityLog({
        userId,
        action: "reseller.customer.update",
        details: { customerId },
        ipAddress: req.ip
      });
      
      // Don't send password back to client
      const { password: _, ...customerWithoutPassword } = updatedCustomer[0];
      res.json(customerWithoutPassword);
    } catch (error) {
      console.error("Error updating reseller customer:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Commission Tiers
  app.post("/api/reseller/commission-tiers", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const user = await storage.getUserById(userId);
      
      if (!user || !user.isReseller) {
        return res.status(403).json({ message: "Not authorized as a reseller" });
      }
      
      const { tierName, minimumRevenue, commissionRate } = req.body;
      
      if (!tierName || minimumRevenue === undefined || commissionRate === undefined) {
        return res.status(400).json({ message: "Tier name, minimum revenue, and commission rate are required" });
      }
      
      if (commissionRate < 0 || commissionRate > 100) {
        return res.status(400).json({ message: "Commission rate must be between 0 and 100" });
      }
      
      // Create commission tier
      const tier = await db.insert(resellerCommissionTiers)
        .values({
          userId,
          tierName,
          minimumRevenue,
          commissionRate,
          isActive: true
        })
        .returning();
      
      res.status(201).json(tier[0]);
    } catch (error) {
      console.error("Error creating commission tier:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  app.get("/api/reseller/commission-tiers", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const user = await storage.getUserById(userId);
      
      if (!user || !user.isReseller) {
        return res.status(403).json({ message: "Not authorized as a reseller" });
      }
      
      // Get commission tiers
      const tiers = await db.select()
        .from(resellerCommissionTiers)
        .where(eq(resellerCommissionTiers.userId, userId))
        .orderBy(asc(resellerCommissionTiers.minimumRevenue));
      
      res.json(tiers);
    } catch (error) {
      console.error("Error fetching commission tiers:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Subscription plans routes
  app.get("/api/subscription-plans", isAuthenticated, async (req, res) => {
    try {
      const plans = await storage.getAllSubscriptionPlans();
      res.json(plans);
    } catch (error) {
      console.error("Error fetching subscription plans:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Referrals routes
  app.get("/api/referrals", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const referrals = await storage.getUserReferrals(userId);
      res.json(referrals);
    } catch (error) {
      console.error("Error fetching referrals:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/referrals/stats", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const stats = await storage.getReferralStats(userId);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching referral stats:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Stripe payment routes
  if (stripe) {
    // For one-time payments
    app.post("/api/create-payment-intent", isAuthenticated, async (req, res) => {
      try {
        const { amount } = req.body;
        
        if (!amount || isNaN(amount)) {
          return res.status(400).json({ message: "Valid amount is required" });
        }
        
        // Create a payment intent
        const paymentIntent = await stripe.paymentIntents.create({
          amount: Math.round(amount * 100), // Convert to cents
          currency: "usd",
          metadata: {
            userId: (req.user as any).id,
          },
        });
        
        // Log activity
        await storage.insertActivityLog({
          userId: (req.user as any).id,
          action: "payment.created",
          details: { amount, paymentIntentId: paymentIntent.id },
          ipAddress: req.ip
        });
        
        res.json({
          clientSecret: paymentIntent.client_secret,
        });
      } catch (error) {
        console.error("Error creating payment intent:", error);
        res.status(500).json({ message: "Error creating payment intent" });
      }
    });
    
    // For subscriptions
    app.post("/api/create-subscription", isAuthenticated, async (req, res) => {
      try {
        const userId = (req.user as any).id;
        const user = await storage.getUserById(userId);
        const { priceId } = req.body;
        
        if (!user) {
          return res.status(404).json({ message: "User not found" });
        }
        
        if (!priceId) {
          return res.status(400).json({ message: "Price ID is required" });
        }
        
        // Get plan details for UI
        const price = await stripe.prices.retrieve(priceId);
        const product = await stripe.products.retrieve(price.product as string);
        
        // Create or get Stripe customer
        let customer;
        if (user.stripeCustomerId) {
          customer = await stripe.customers.retrieve(user.stripeCustomerId);
        } else {
          customer = await stripe.customers.create({
            email: user.email,
            name: user.username,
            metadata: {
              userId: user.id.toString(),
            },
          });
          
          // Save customer ID to user record
          await storage.updateStripeCustomerId(user.id, customer.id);
        }

        // Get the customer ID from the user record or from the customer object we just created
        const customerId = user.stripeCustomerId || customer.id;

        // Create subscription
        const subscription = await stripe.subscriptions.create({
          customer: customerId,
          items: [{ price: priceId }],
          payment_behavior: 'default_incomplete',
          expand: ['latest_invoice.payment_intent'],
        });

        // Update user with subscription ID
        await storage.updateUserStripeInfo(userId, {
          stripeCustomerId: customerId,
          stripeSubscriptionId: subscription.id
        });

        // Log activity
        await storage.insertActivityLog({
          userId,
          action: "subscription.create",
          details: { subscriptionId: subscription.id },
          ipAddress: req.ip
        });

        // Handle response when we have a valid subscription with a payment intent
        let clientSecret = '';
        if (subscription && 
            subscription.latest_invoice && 
            typeof subscription.latest_invoice === 'object' &&
            'payment_intent' in subscription.latest_invoice &&
            subscription.latest_invoice.payment_intent) {
          clientSecret = (subscription.latest_invoice.payment_intent as any).client_secret;
        }
        
        res.json({
          subscriptionId: subscription.id,
          clientSecret: clientSecret,
          planDetails: {
            name: product.name,
            price: price.unit_amount ? price.unit_amount / 100 : 0,
            interval: price.recurring?.interval || 'month'
          }
        });
      } catch (error) {
        console.error("Error creating subscription:", error);
        res.status(500).json({ message: "Error creating subscription" });
      }
    });

    app.post("/api/cancel-subscription", isAuthenticated, async (req, res) => {
      try {
        const userId = (req.user as any).id;
        const user = await storage.getUserById(userId);
        
        if (!user || !user.stripeSubscriptionId) {
          return res.status(404).json({ message: "No active subscription found" });
        }

        // Cancel subscription at period end
        const subscription = await stripe.subscriptions.update(
          user.stripeSubscriptionId,
          { cancel_at_period_end: true }
        );

        // Log activity
        await storage.insertActivityLog({
          userId,
          action: "subscription.cancel",
          details: { subscriptionId: subscription.id },
          ipAddress: req.ip
        });

        res.json({ success: true });
      } catch (error) {
        console.error("Error canceling subscription:", error);
        res.status(500).json({ message: "Error canceling subscription" });
      }
    });
    
    // Stripe webhook handler for automated payment processing
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
    app.post('/webhook', async (req, res) => {
      let event;
      
      try {
        if (endpointSecret) {
          // Get the signature sent by Stripe
          const signature = req.headers['stripe-signature'] as string;
          event = stripe.webhooks.constructEvent(
            req.body,
            signature,
            endpointSecret
          );
        } else {
          // For development without signature verification
          event = req.body;
        }
        
        // Handle specific events
        if (event && event.type) {
          switch (event.type) {
            case 'invoice.paid': {
              const invoice = event.data.object;
              const customerId = invoice.customer;
              
              // Find user by Stripe customer ID
              const user = await db.query.users.findFirst({
                where: eq(users.stripeCustomerId, customerId)
              });
            
              if (user) {
                // Create invoice record in our database
                await storage.insertInvoice({
                  userId: user.id,
                  stripeInvoiceId: invoice.id,
                  amount: invoice.amount_paid,
                  status: 'paid',
                  description: invoice.description || `Invoice ${invoice.number}`,
                  periodStart: new Date(invoice.period_start * 1000),
                  periodEnd: new Date(invoice.period_end * 1000),
                  paidAt: new Date(),
                  planName: invoice.lines?.data[0]?.description || 'Subscription',
                  invoiceUrl: invoice.hosted_invoice_url,
                  receiptUrl: invoice.receipt_url
                });
                
                // Log activity
                await storage.insertActivityLog({
                  userId: user.id,
                  action: "invoice.paid",
                  details: { 
                    invoiceId: invoice.id,
                    amount: invoice.amount_paid / 100 // Convert from cents to dollars
                  },
                  ipAddress: req.ip
                });
              }
              break;
            }
              
            case 'invoice.payment_failed': {
              // Handle failed payment
              const failedInvoice = event.data.object;
              const failedCustomerId = failedInvoice.customer;
              
              const failedUser = await db.query.users.findFirst({
                where: eq(users.stripeCustomerId, failedCustomerId)
              });
              
              if (failedUser) {
                // Create or update invoice record
                const existingInvoice = await storage.getInvoiceByStripeId(failedInvoice.id);
                
                if (existingInvoice) {
                  await storage.updateInvoiceStatus(existingInvoice.id, 'failed');
                } else {
                  await storage.insertInvoice({
                    userId: failedUser.id,
                    stripeInvoiceId: failedInvoice.id,
                    amount: failedInvoice.amount_due,
                    status: 'failed',
                    description: failedInvoice.description || `Invoice ${failedInvoice.number}`,
                    periodStart: new Date(failedInvoice.period_start * 1000),
                    periodEnd: new Date(failedInvoice.period_end * 1000),
                    paidAt: null,
                    planName: failedInvoice.lines?.data[0]?.description || 'Subscription',
                    invoiceUrl: failedInvoice.hosted_invoice_url,
                    receiptUrl: null
                  });
                }
                
                // Log activity
                await storage.insertActivityLog({
                  userId: failedUser.id,
                  action: "invoice.payment_failed",
                  details: { 
                    invoiceId: failedInvoice.id,
                    amount: failedInvoice.amount_due / 100 // Convert from cents to dollars
                  },
                  ipAddress: req.ip
                });
              }
              break;
            }
          }
        }
        
        res.json({received: true});
      } catch (err) {
        console.error('Webhook error:', err);
        res.status(400).send(`Webhook Error: ${err.message}`);
      }
    });
  }
  
  // Invoice routes
  app.get('/api/invoices', isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const invoiceList = await storage.getInvoicesByUserId(userId);
      res.json(invoiceList);
    } catch (error) {
      console.error("Error fetching invoices:", error);
      res.status(500).json({ message: "Error fetching invoices" });
    }
  });
  
  app.get('/api/invoices/:id', isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const invoiceId = parseInt(req.params.id);
      
      const invoice = await storage.getInvoiceById(invoiceId);
      
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      
      // Check if invoice belongs to the user
      if (invoice.userId !== userId) {
        return res.status(403).json({ message: "Not authorized to view this invoice" });
      }
      
      res.json(invoice);
    } catch (error) {
      console.error("Error fetching invoice:", error);
      res.status(500).json({ message: "Error fetching invoice" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
