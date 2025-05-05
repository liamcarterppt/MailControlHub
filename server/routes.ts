import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import bcrypt from "bcrypt";
import session from "express-session";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import pgSession from "connect-pg-simple";
import { pool } from "@db";
import Stripe from "stripe";
import { z } from "zod";
import {
  insertUserSchema,
  insertDomainSchema,
  insertEmailAccountSchema,
  insertServerConfigSchema,
  users
} from "@shared/schema";

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

  app.get("/api/me", isAuthenticated, (req, res) => {
    const { password, ...userWithoutPassword } = req.user as any;
    res.json(userWithoutPassword);
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

  // Stripe subscription routes
  if (stripe) {
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

        let customerId = user.stripeCustomerId;
        
        // If user doesn't have a Stripe customer ID, create one
        if (!customerId) {
          const customer = await stripe.customers.create({
            email: user.email,
            name: user.name,
          });
          
          customerId = customer.id;
          await storage.updateStripeCustomerId(userId, customerId);
        }

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

        res.json({
          subscriptionId: subscription.id,
          clientSecret: (subscription.latest_invoice as any).payment_intent.client_secret,
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
  }

  const httpServer = createServer(app);
  return httpServer;
}
