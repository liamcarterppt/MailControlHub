import { MailService } from '@sendgrid/mail';
import { db } from '@db';
import { serverConfig } from '@shared/schema';
import { eq } from 'drizzle-orm';

// Email service will be initialized once the API key is available
let mailService: MailService | null = null;

// Email configuration with defaults that can be overridden from the admin panel
let emailConfig = {
  fromEmail: 'noreply@example.com',
  fromName: 'Mail-in-a-Box',
  replyToEmail: 'support@example.com',
  footerText: 'This is an automated message, please do not reply directly to this email.',
  enabled: false
};

export interface EmailParams {
  to: string;
  subject: string;
  text?: string;
  html?: string;
  templateId?: string;
  dynamicTemplateData?: Record<string, any>;
}

/**
 * Initialize the email service with the provided API key
 * This should be called when the API key is set from the admin panel
 */
export async function initializeEmailService(apiKey: string): Promise<boolean> {
  try {
    const service = new MailService();
    service.setApiKey(apiKey);
    
    // Store api key in the server_config table
    await db.update(serverConfig)
      .set({ value: apiKey })
      .where(eq(serverConfig.name, 'sendgrid_api_key'));
    
    // Verify the API key works with a simple check
    await service.send({
      to: 'test@example.com',
      from: emailConfig.fromEmail,
      subject: 'API Key Verification',
      text: 'This is a test to verify the API key is working correctly.',
      mailSettings: {
        sandboxMode: {
          enable: true // Test without actually sending an email
        }
      }
    });
    
    mailService = service;
    emailConfig.enabled = true;
    
    console.log('Email service initialized successfully');
    return true;
  } catch (error) {
    console.error('Failed to initialize email service:', error);
    mailService = null;
    emailConfig.enabled = false;
    return false;
  }
}

/**
 * Update the email configuration
 */
export async function updateEmailConfig(config: Partial<typeof emailConfig>): Promise<typeof emailConfig> {
  emailConfig = { ...emailConfig, ...config };
  
  // Store configuration in the server_config table
  for (const [key, value] of Object.entries(config)) {
    await db.update(serverConfig)
      .set({ value: String(value) })
      .where(eq(serverConfig.name, `email_${key}`));
  }
  
  return emailConfig;
}

/**
 * Send an email using the configured service
 * Returns true if the email was sent, false otherwise
 */
export async function sendEmail(params: EmailParams): Promise<boolean> {
  if (!mailService || !emailConfig.enabled) {
    console.warn('Email service not initialized or disabled');
    return false;
  }

  try {
    await mailService.send({
      to: params.to,
      from: {
        email: emailConfig.fromEmail,
        name: emailConfig.fromName
      },
      replyTo: emailConfig.replyToEmail,
      subject: params.subject,
      text: params.text,
      html: params.html,
      templateId: params.templateId,
      dynamicTemplateData: params.dynamicTemplateData
    });
    return true;
  } catch (error) {
    console.error('Failed to send email:', error);
    return false;
  }
}

/**
 * Check if the email service is configured and enabled
 */
export function isEmailServiceEnabled(): boolean {
  return emailConfig.enabled && mailService !== null;
}

/**
 * Get the current email configuration
 */
export function getEmailConfig(): typeof emailConfig {
  return { ...emailConfig };
}

/**
 * Load email configuration from the database
 * This should be called when the application starts
 */
export async function loadEmailConfiguration(): Promise<void> {
  try {
    const configItems = await db.select()
      .from(serverConfig)
      .where(eq(serverConfig.name, 'sendgrid_api_key'))
      .orWhere(eq(serverConfig.name, 'email_fromEmail'))
      .orWhere(eq(serverConfig.name, 'email_fromName'))
      .orWhere(eq(serverConfig.name, 'email_replyToEmail'))
      .orWhere(eq(serverConfig.name, 'email_footerText'))
      .orWhere(eq(serverConfig.name, 'email_enabled'));
    
    for (const item of configItems) {
      if (item.name === 'sendgrid_api_key' && item.value) {
        try {
          const service = new MailService();
          service.setApiKey(item.value);
          mailService = service;
        } catch (error) {
          console.error('Failed to initialize email service with stored API key:', error);
        }
      } else if (item.name === 'email_fromEmail') {
        emailConfig.fromEmail = item.value;
      } else if (item.name === 'email_fromName') {
        emailConfig.fromName = item.value;
      } else if (item.name === 'email_replyToEmail') {
        emailConfig.replyToEmail = item.value;
      } else if (item.name === 'email_footerText') {
        emailConfig.footerText = item.value;
      } else if (item.name === 'email_enabled') {
        emailConfig.enabled = item.value === 'true';
      }
    }
    
    // If we have a mail service and enabled is true, we're good to go
    emailConfig.enabled = emailConfig.enabled && mailService !== null;
    
    console.log('Email configuration loaded:', emailConfig.enabled ? 'enabled' : 'disabled');
  } catch (error) {
    console.error('Failed to load email configuration:', error);
  }
}