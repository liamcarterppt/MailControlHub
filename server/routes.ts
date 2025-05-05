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
  insertEmailTemplateSchema,
  insertMailServerSchema,
  insertBackupJobSchema,
  insertSpamFilterSchema,
  users,
  domains,
  emailAccounts,
  serverConfig,
  emailTemplates,
  mailServers,
  backupJobs,
  spamFilters,
  mailboxes,
  emailAliases,
  dnsRecords,
  invoices,
  referrals
} from "@shared/schema";
import { eq, and, desc, asc, sql } from "drizzle-orm";
import { initializeEmailService, sendEmail } from "./email-service";
import crypto from "crypto";
import { WebSocketServer } from "ws";
import { getMailInABoxClient } from "./services/mail-in-a-box";

// Configure Stripe if API key is available
let stripe: Stripe | null = null;
if (process.env.STRIPE_SECRET_KEY) {
  stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2023-10-16",
  });
}

// Middleware to check if user is authenticated
const isAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: 'Unauthorized' });
};

// Middleware to check if user is admin
const isAdmin = (req, res, next) => {
  if (req.isAuthenticated() && req.user && req.user.role === 'admin') {
    return next();
  }
  res.status(403).json({ message: 'Forbidden' });
};

// Define Stripe webhook handler functions
// Handle paid invoice
async function handleInvoicePaid(invoice: any) {
  try {
    const customerId = invoice.customer;
    const subscriptionId = invoice.subscription;
    
    if (!customerId || !subscriptionId) return;
    
    // Find user with this Stripe customer ID
    const user = await db.query.users.findFirst({
      where: eq(users.stripeCustomerId, customerId)
    });
    
    if (!user) return;
    
    // Create an invoice record
    await storage.insertInvoice({
      userId: user.id,
      stripeInvoiceId: invoice.id,
      stripeSubscriptionId: subscriptionId,
      amount: invoice.amount_paid,
      status: 'paid',
      paidAt: new Date(invoice.status_transitions.paid_at * 1000),
      invoiceUrl: invoice.hosted_invoice_url,
      receiptUrl: invoice.receipt_url,
      description: invoice.description || `Invoice ${invoice.number}`,
    });
    
    // Check if this was a referred user's first payment
    if (user.referredBy) {
      // Find the referral record
      const referral = await db.query.referrals.findFirst({
        where: and(
          eq(referrals.referrerId, user.referredBy),
          eq(referrals.referredUserId, user.id),
          eq(referrals.status, 'pending')
        )
      });
      
      if (referral) {
        // Complete the referral and award the referrer
        const referralReward = 1000; // $10.00 in cents
        await db.update(referrals)
          .set({
            status: 'completed',
            completedAt: new Date(),
            reward: referralReward
          })
          .where(eq(referrals.id, referral.id));
        
        // Log activity
        await storage.insertActivityLog({
          userId: user.referredBy,
          action: "referral.completed",
          details: {
            referralId: referral.id,
            referredUserId: user.id,
            reward: referralReward
          }
        });
      }
    }
    
  } catch (error) {
    console.error('Error handling paid invoice:', error);
  }
}

// Handle failed invoice payment
async function handleInvoicePaymentFailed(invoice: any) {
  try {
    const customerId = invoice.customer;
    
    if (!customerId) return;
    
    // Find user with this Stripe customer ID
    const user = await db.query.users.findFirst({
      where: eq(users.stripeCustomerId, customerId)
    });
    
    if (!user) return;
    
    // Create a failed invoice record
    await storage.insertInvoice({
      userId: user.id,
      stripeInvoiceId: invoice.id,
      stripeSubscriptionId: invoice.subscription,
      amount: invoice.amount_due,
      status: 'failed',
      description: invoice.description || `Failed Invoice ${invoice.number}`,
      invoiceUrl: invoice.hosted_invoice_url
    });
    
    // Log activity
    await storage.insertActivityLog({
      userId: user.id,
      action: "payment.failed",
      details: {
        invoiceId: invoice.id,
        amount: invoice.amount_due,
        attemptCount: invoice.attempt_count
      }
    });
    
  } catch (error) {
    console.error('Error handling failed invoice payment:', error);
  }
}

// Handle subscription cancellation
async function handleSubscriptionCancelled(subscription: any) {
  try {
    const customerId = subscription.customer;
    
    if (!customerId) return;
    
    // Find user with this Stripe customer ID
    const user = await db.query.users.findFirst({
      where: eq(users.stripeCustomerId, customerId)
    });
    
    if (!user) return;
    
    // Update user's subscription status
    await storage.updateUserStripeInfo(user.id, {
      stripeCustomerId: user.stripeCustomerId,
      stripeSubscriptionId: null // Remove subscription ID
    });
    
    // Log activity
    await storage.insertActivityLog({
      userId: user.id,
      action: "subscription.ended",
      details: {
        subscriptionId: subscription.id,
        reason: subscription.cancellation_details?.reason || 'unknown'
      }
    });
    
  } catch (error) {
    console.error('Error handling subscription cancellation:', error);
  }
}

// Handle subscription update
async function handleSubscriptionUpdated(subscription: any) {
  try {
    const customerId = subscription.customer;
    
    if (!customerId) return;
    
    // Find user with this Stripe customer ID
    const user = await db.query.users.findFirst({
      where: eq(users.stripeCustomerId, customerId)
    });
    
    if (!user) return;
    
    // Log activity
    await storage.insertActivityLog({
      userId: user.id,
      action: "subscription.updated",
      details: {
        subscriptionId: subscription.id,
        status: subscription.status,
        cancelAtPeriodEnd: subscription.cancel_at_period_end
      }
    });
    
  } catch (error) {
    console.error('Error handling subscription update:', error);
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Session setup
  const PostgresStore = pgSession(session);
  app.use(session({
    store: new PostgresStore({
      pool,
      tableName: 'session',
      createTableIfMissing: true
    }),
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
    }
  }));
  
  // Passport initialization
  app.use(passport.initialize());
  app.use(passport.session());
  
  passport.use(new LocalStrategy(async (username, password, done) => {
    try {
      // Find user by username
      const user = await storage.getUserByUsername(username);
      
      if (!user) {
        return done(null, false, { message: 'Incorrect username.' });
      }
      
      // Check password
      const isMatch = await bcrypt.compare(password, user.password);
      
      if (!isMatch) {
        return done(null, false, { message: 'Incorrect password.' });
      }
      
      // Record login time and IP
      await storage.updateLoginInfo(user.id, req.ip);
      
      return done(null, user);
    } catch (error) {
      return done(error);
    }
  }));
  
  passport.serializeUser((user, done) => {
    done(null, user.id);
  });
  
  passport.deserializeUser(async (id, done) => {
    try {
      const user = await storage.getUserById(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });
  
  // Authentication routes
  app.post("/api/login", (req, res, next) => {
    passport.authenticate('local', (err, user, info) => {
      if (err) {
        return next(err);
      }
      
      if (!user) {
        return res.status(401).json({ message: info.message || 'Authentication failed' });
      }
      
      // Check if 2FA is enabled
      if (user.twoFactorEnabled) {
        return res.status(200).json({ 
          requireTwoFactor: true, 
          userId: user.id,
          message: 'Two-factor authentication required'
        });
      }
      
      req.login(user, (err) => {
        if (err) {
          return next(err);
        }
        
        return res.status(200).json({ user });
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
        return res.status(400).json({ message: 'Username already exists' });
      }
      
      // Hash password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(userData.password, salt);
      
      // Check referral code if provided
      let referrerId = null;
      if (req.body.referralCode) {
        const referrer = await db.query.users.findFirst({
          where: eq(users.referralCode, req.body.referralCode)
        });
        
        if (referrer) {
          referrerId = referrer.id;
        }
      }
      
      // Generate unique referral code for new user
      const referralCode = crypto.randomBytes(6).toString('hex');
      
      // Create new user
      const newUser = await storage.insertUser({
        ...userData,
        password: hashedPassword,
        referredBy: referrerId,
        referralCode: referralCode,
        role: 'user'
      });
      
      // Create referral record if applicable
      if (referrerId) {
        await db.insert(referrals).values({
          referrerId: referrerId,
          referredUserId: newUser.id,
          status: 'pending'
        });
        
        // Log activity
        await storage.insertActivityLog({
          userId: referrerId,
          action: "referral.created",
          details: { referredUserId: newUser.id }
        });
      }
      
      req.login(newUser, (err) => {
        if (err) {
          return res.status(500).json({ message: 'Error during login' });
        }
        
        res.status(201).json({ user: newUser });
      });
      
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Validation error', errors: error.errors });
      }
      
      console.error('Error registering user:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });
  
  app.post("/api/logout", (req, res) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ message: 'Error during logout' });
      }
      
      res.status(200).json({ message: 'Logout successful' });
    });
  });
  
  app.get("/api/user", (req, res) => {
    if (req.isAuthenticated()) {
      return res.status(200).json(req.user);
    }
    
    res.status(401).json({ message: 'Not authenticated' });
  });
  
  // Email account routes
  app.get("/api/email-accounts", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const accounts = await storage.getEmailAccountsByUserId(userId);
      
      res.status(200).json(accounts);
    } catch (error) {
      console.error('Error fetching email accounts:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });
  
  app.post("/api/email-accounts", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const accountData = insertEmailAccountSchema.parse({
        ...req.body,
        userId
      });
      
      const newAccount = await storage.insertEmailAccount(accountData);
      
      // Log activity
      await storage.insertActivityLog({
        userId,
        action: "email_account.created",
        details: { 
          accountId: newAccount.id,
          email: newAccount.username
        }
      });
      
      res.status(201).json(newAccount);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Validation error', errors: error.errors });
      }
      
      console.error('Error creating email account:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });
  
  // Domain routes
  app.get("/api/domains", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const domains = await storage.getDomainsByUserId(userId);
      
      res.status(200).json(domains);
    } catch (error) {
      console.error('Error fetching domains:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });
  
  app.post("/api/domains", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const domainData = insertDomainSchema.parse({
        ...req.body,
        userId,
        isVerified: false
      });
      
      const newDomain = await storage.insertDomain(domainData);
      
      // Log activity
      await storage.insertActivityLog({
        userId,
        action: "domain.created",
        details: { 
          domainId: newDomain.id,
          name: newDomain.name
        }
      });
      
      res.status(201).json(newDomain);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Validation error', errors: error.errors });
      }
      
      console.error('Error creating domain:', error);
      res.status(500).json({ message: 'Internal server error' });
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
          ipAddress: req.ip || null
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
    
    // Stripe webhook handling
    app.post("/api/webhooks/stripe", async (req, res) => {
      const sig = req.headers['stripe-signature'] as string;
      
      let event;
      
      try {
        // Verify the webhook signature
        if (process.env.STRIPE_WEBHOOK_SECRET) {
          event = stripe.webhooks.constructEvent(
            req.body,
            sig,
            process.env.STRIPE_WEBHOOK_SECRET
          );
        } else {
          // For development, accept the event without verification
          event = req.body;
        }
        
        // Handle the event
        switch (event.type) {
          case 'invoice.paid':
            await handleInvoicePaid(event.data.object);
            break;
          case 'invoice.payment_failed':
            await handleInvoicePaymentFailed(event.data.object);
            break;
          case 'customer.subscription.deleted':
            await handleSubscriptionCancelled(event.data.object);
            break;
          case 'customer.subscription.updated':
            await handleSubscriptionUpdated(event.data.object);
            break;
          default:
            console.log(`Unhandled event type: ${event.type}`);
        }
        
        res.json({ received: true });
      } catch (err) {
        console.error('Webhook error:', err);
        res.status(400).send(`Webhook Error: ${err.message}`);
      }
    });
    
    // Get user's subscription
    app.get("/api/subscription", isAuthenticated, async (req, res) => {
      try {
        const userId = (req.user as any).id;
        const user = await storage.getUserById(userId);
        
        if (!user) {
          return res.status(404).json({ message: "User not found" });
        }
        
        if (!user.stripeSubscriptionId) {
          return res.json({ subscription: null });
        }
        
        // Get subscription from Stripe
        const subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId, {
          expand: ['items.data.price.product']
        });
        
        // Get upcoming invoice
        let upcomingInvoice = null;
        try {
          upcomingInvoice = await stripe.invoices.retrieveUpcoming({
            customer: user.stripeCustomerId
          });
        } catch (err) {
          console.log('No upcoming invoice found');
        }
        
        res.json({
          subscription,
          upcomingInvoice
        });
      } catch (error) {
        console.error("Error fetching subscription:", error);
        res.status(500).json({ message: "Error fetching subscription" });
      }
    });
    
    // Cancel subscription
    app.post("/api/subscription/cancel", isAuthenticated, async (req, res) => {
      try {
        const userId = (req.user as any).id;
        const user = await storage.getUserById(userId);
        
        if (!user || !user.stripeSubscriptionId) {
          return res.status(404).json({ message: "No active subscription found" });
        }
        
        // Cancel the subscription at period end
        const canceledSubscription = await stripe.subscriptions.update(
          user.stripeSubscriptionId,
          { cancel_at_period_end: true }
        );
        
        // Log activity
        await storage.insertActivityLog({
          userId: userId,
          action: "subscription.cancelled",
          details: { subscriptionId: user.stripeSubscriptionId },
          ipAddress: req.ip || null
        });
        
        res.json({ subscription: canceledSubscription });
      } catch (error) {
        console.error("Error cancelling subscription:", error);
        res.status(500).json({ message: "Error cancelling subscription" });
      }
    });
    
    // Resume subscription
    app.post("/api/subscription/resume", isAuthenticated, async (req, res) => {
      try {
        const userId = (req.user as any).id;
        const user = await storage.getUserById(userId);
        
        if (!user || !user.stripeSubscriptionId) {
          return res.status(404).json({ message: "No active subscription found" });
        }
        
        // Resume the subscription by setting cancel_at_period_end to false
        const resumedSubscription = await stripe.subscriptions.update(
          user.stripeSubscriptionId,
          { cancel_at_period_end: false }
        );
        
        // Log activity
        await storage.insertActivityLog({
          userId: userId,
          action: "subscription.resumed",
          details: { subscriptionId: user.stripeSubscriptionId },
          ipAddress: req.ip || null
        });
        
        res.json({ subscription: resumedSubscription });
      } catch (error) {
        console.error("Error resuming subscription:", error);
        res.status(500).json({ message: "Error resuming subscription" });
      }
    });
  }
  
  // Mail Server routes
  app.get("/api/mail-servers", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const servers = await storage.getMailServersByUserId(userId);
      
      res.status(200).json(servers);
    } catch (error) {
      console.error('Error fetching mail servers:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });
  
  app.post("/api/mail-servers", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const serverData = insertMailServerSchema.parse({
        ...req.body,
        userId
      });
      
      const newServer = await storage.insertMailServer(serverData);
      
      // Log activity
      await storage.insertActivityLog({
        userId,
        action: "mail_server.created",
        details: { 
          serverId: newServer.id,
          hostname: newServer.hostname
        }
      });
      
      res.status(201).json(newServer);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Validation error', errors: error.errors });
      }
      
      console.error('Error creating mail server:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });
  
  app.get("/api/mail-servers/:id", isAuthenticated, async (req, res) => {
    try {
      const serverId = parseInt(req.params.id);
      const server = await storage.getMailServerById(serverId);
      
      if (!server) {
        return res.status(404).json({ message: 'Server not found' });
      }
      
      if (server.userId !== (req.user as any).id) {
        return res.status(403).json({ message: 'Not authorized to access this server' });
      }
      
      res.status(200).json(server);
    } catch (error) {
      console.error('Error fetching mail server:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });
  
  // Create HTTP server and add WebSocket support
  const httpServer = createServer(app);
  
  // Add WebSocket server on a separate path
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  wss.on('connection', (ws) => {
    console.log('WebSocket client connected');
    
    ws.on('message', (message) => {
      console.log('Received message:', message.toString());
      
      // Echo back the message
      ws.send(`Echo: ${message}`);
    });
    
    ws.on('close', () => {
      console.log('WebSocket client disconnected');
    });
  });
  
  return httpServer;
}