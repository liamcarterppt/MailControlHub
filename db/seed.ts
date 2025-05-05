import { db } from "./index";
import bcrypt from "bcrypt";
import {
  users,
  domains,
  emailAccounts,
  serverConfig,
  serviceStatus,
  activityLogs,
  subscriptionPlans,
  mailQueue
} from "@shared/schema";

async function seed() {
  try {
    // Check if we already have data
    const userCount = await db.select({ count: db.fn.count() }).from(users);
    
    if (parseInt(userCount[0].count as string) > 0) {
      console.log("Database already seeded. Skipping seed process.");
      return;
    }

    console.log("Seeding database...");
    
    // Create admin user
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash("password123", salt);
    
    const [adminUser] = await db.insert(users).values({
      username: "admin",
      password: hashedPassword,
      email: "admin@example.com",
      name: "John Smith",
      role: "admin",
      referralCode: "admin123"
    }).returning();
    
    // Create domains
    const [domain1] = await db.insert(domains).values({
      name: "example.com",
      isVerified: true,
      userId: adminUser.id
    }).returning();
    
    const [domain2] = await db.insert(domains).values({
      name: "test.com",
      isVerified: true,
      userId: adminUser.id
    }).returning();
    
    // Create email accounts
    await db.insert(emailAccounts).values([
      {
        username: "john",
        password: hashedPassword,
        domainId: domain1.id,
        userId: adminUser.id,
        storageUsed: 1024 * 1024 * 100, // 100 MB
        isActive: true
      },
      {
        username: "jane",
        password: hashedPassword,
        domainId: domain1.id,
        userId: adminUser.id,
        storageUsed: 1024 * 1024 * 150, // 150 MB
        isActive: true
      },
      {
        username: "support",
        password: hashedPassword,
        domainId: domain2.id,
        userId: adminUser.id,
        storageUsed: 1024 * 1024 * 200, // 200 MB
        isActive: true
      }
    ]);
    
    // Create server configuration
    await db.insert(serverConfig).values([
      {
        name: "smtp_port",
        value: "25",
        description: "SMTP Port"
      },
      {
        name: "imap_port",
        value: "143",
        description: "IMAP Port"
      },
      {
        name: "pop3_port",
        value: "110",
        description: "POP3 Port"
      },
      {
        name: "spam_threshold",
        value: "5",
        description: "Spam Threshold Score"
      },
      {
        name: "max_attachment_size",
        value: "25",
        description: "Maximum Attachment Size (MB)"
      }
    ]);
    
    // Create service status entries
    await db.insert(serviceStatus).values([
      {
        name: "SMTP Service",
        status: "running",
        message: "Service running normally"
      },
      {
        name: "IMAP Service",
        status: "running",
        message: "Service running normally"
      },
      {
        name: "DNS Service",
        status: "running",
        message: "Service running normally"
      },
      {
        name: "Web Services",
        status: "running",
        message: "Service running normally"
      },
      {
        name: "Anti-Spam Filter",
        status: "needs_update",
        message: "Update available for Anti-Spam rules"
      }
    ]);
    
    // Create mail queue items
    await db.insert(mailQueue).values([
      {
        sender: "user@external.com",
        recipient: "john@example.com",
        subject: "Meeting Today",
        status: "pending"
      },
      {
        sender: "john@example.com",
        recipient: "client@company.com",
        subject: "Project Update",
        status: "sent"
      },
      {
        sender: "notifications@service.com",
        recipient: "jane@example.com",
        subject: "Your account has been updated",
        status: "pending"
      }
    ]);
    
    // Create activity logs
    await db.insert(activityLogs).values([
      {
        userId: adminUser.id,
        action: "email_account.create",
        details: { username: "john", domain: "example.com" },
        ipAddress: "127.0.0.1"
      },
      {
        userId: adminUser.id,
        action: "domain.verify",
        details: { name: "example.com" },
        ipAddress: "127.0.0.1"
      },
      {
        userId: adminUser.id,
        action: "security.update",
        details: { component: "firewall" },
        ipAddress: "127.0.0.1"
      },
      {
        userId: adminUser.id,
        action: "domain.add",
        details: { name: "test.com" },
        ipAddress: "127.0.0.1"
      }
    ]);
    
    // Create subscription plans
    await db.insert(subscriptionPlans).values([
      {
        name: "Starter",
        price: 999, // $9.99
        emailAccountLimit: 5,
        domainLimit: 1,
        storageLimit: 1024 * 1024 * 1024 * 10, // 10 GB
        features: JSON.stringify([
          "5 Email Accounts",
          "1 Domain",
          "10GB Storage",
          "Basic Spam Protection"
        ]),
        isActive: true
      },
      {
        name: "Business",
        price: 2499, // $24.99
        emailAccountLimit: 50,
        domainLimit: 10,
        storageLimit: 1024 * 1024 * 1024 * 70, // 70 GB
        features: JSON.stringify([
          "Up to 50 Email Accounts",
          "Up to 10 Domains",
          "70GB Storage",
          "Premium Spam Protection"
        ]),
        isActive: true
      },
      {
        name: "Enterprise",
        price: 4999, // $49.99
        emailAccountLimit: 200,
        domainLimit: 50,
        storageLimit: 1024 * 1024 * 1024 * 200, // 200 GB
        features: JSON.stringify([
          "Up to 200 Email Accounts",
          "Up to 50 Domains",
          "200GB Storage",
          "Premium Spam Protection",
          "Priority Support",
          "Custom Domain Setup"
        ]),
        isActive: true
      }
    ]);

    console.log("Database seeded successfully.");
  } catch (error) {
    console.error("Error seeding database:", error);
  }
}

seed();
