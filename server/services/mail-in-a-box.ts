/**
 * Mail-in-a-Box API Integration Service
 * 
 * This service provides functions to interact with Mail-in-a-Box API
 * for server management, email accounts, DNS records, and other features.
 */

import { MailServer } from "@shared/schema";
import nodeFetch from 'node-fetch';
import { storage } from '../storage';
import { log } from '../vite';

interface MailInABoxApiOptions {
  hostname: string;
  apiKey: string;
  apiEndpoint: string;
}

interface MailInABoxApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Mail-in-a-Box API Client
 * Handles authentication and communication with the Mail-in-a-Box server
 */
class MailInABoxApiClient {
  private hostname: string;
  private apiKey: string;
  private apiEndpoint: string;
  private authHeader: string;

  constructor(options: MailInABoxApiOptions) {
    this.hostname = options.hostname;
    this.apiKey = options.apiKey;
    this.apiEndpoint = options.apiEndpoint || '/admin';
    this.authHeader = `Basic ${Buffer.from(`admin:${this.apiKey}`).toString('base64')}`;
  }

  /**
   * Get the base URL for API requests
   */
  private getBaseUrl(): string {
    return `https://${this.hostname}${this.apiEndpoint}`;
  }

  /**
   * Make an API request to the Mail-in-a-Box server
   */
  async request<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    path: string,
    data?: any
  ): Promise<MailInABoxApiResponse<T>> {
    try {
      const url = `${this.getBaseUrl()}${path}`;
      
      const options: any = {
        method,
        headers: {
          'Authorization': this.authHeader,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      };

      if (data && (method === 'POST' || method === 'PUT')) {
        options.body = JSON.stringify(data);
      }

      const response = await nodeFetch(url, options);
      
      // Parse the response
      let responseData: any = null;
      const contentType = response.headers.get('content-type');
      
      if (contentType && contentType.includes('application/json')) {
        responseData = await response.json();
      } else {
        responseData = await response.text();
      }

      if (!response.ok) {
        throw new Error(
          typeof responseData === 'string' 
            ? responseData 
            : responseData.error || `API request failed with status ${response.status}`
        );
      }

      return {
        success: true,
        data: responseData as T
      };
    } catch (error: any) {
      log(`Mail-in-a-Box API error: ${error.message}`, 'error');
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Test the connection to the Mail-in-a-Box server
   */
  async testConnection(): Promise<boolean> {
    try {
      const result = await this.request<any>('GET', '/me');
      return result.success;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get server version information
   */
  async getVersion(): Promise<MailInABoxApiResponse<string>> {
    return this.request<string>('GET', '/system/version');
  }

  /**
   * Get server status information
   */
  async getStatus(): Promise<MailInABoxApiResponse<any>> {
    return this.request<any>('GET', '/system/status');
  }

  /**
   * Get system memory usage
   */
  async getMemoryUsage(): Promise<MailInABoxApiResponse<any>> {
    return this.request<any>('GET', '/system/memory');
  }

  /**
   * Get disk usage information
   */
  async getDiskUsage(): Promise<MailInABoxApiResponse<any>> {
    return this.request<any>('GET', '/system/disk');
  }

  /**
   * Get mail queue information
   */
  async getMailQueue(): Promise<MailInABoxApiResponse<any>> {
    return this.request<any>('GET', '/mail/queue');
  }

  /**
   * Get DNS records
   */
  async getDnsRecords(): Promise<MailInABoxApiResponse<any>> {
    return this.request<any>('GET', '/dns/records');
  }

  /**
   * Add a DNS record
   */
  async addDnsRecord(
    domain: string, 
    recordType: string, 
    value: string, 
    priority?: number
  ): Promise<MailInABoxApiResponse<any>> {
    const data: any = {
      domain,
      type: recordType,
      value
    };
    
    if (priority !== undefined && (recordType === 'MX' || recordType === 'SRV')) {
      data.priority = priority;
    }
    
    return this.request<any>('POST', '/dns/records/add', data);
  }

  /**
   * Remove a DNS record
   */
  async removeDnsRecord(
    domain: string, 
    recordType: string, 
    value: string
  ): Promise<MailInABoxApiResponse<any>> {
    return this.request<any>('POST', '/dns/records/remove', {
      domain,
      type: recordType,
      value
    });
  }

  /**
   * Get all mail users
   */
  async getMailUsers(): Promise<MailInABoxApiResponse<any>> {
    return this.request<any>('GET', '/mail/users');
  }

  /**
   * Add a mail user
   */
  async addMailUser(
    email: string, 
    password: string
  ): Promise<MailInABoxApiResponse<any>> {
    return this.request<any>('POST', '/mail/users/add', {
      email,
      password
    });
  }

  /**
   * Update a mail user's password
   */
  async updateMailUserPassword(
    email: string, 
    password: string
  ): Promise<MailInABoxApiResponse<any>> {
    return this.request<any>('POST', '/mail/users/password', {
      email,
      password
    });
  }

  /**
   * Remove a mail user
   */
  async removeMailUser(email: string): Promise<MailInABoxApiResponse<any>> {
    return this.request<any>('POST', '/mail/users/remove', { email });
  }

  /**
   * Get all mail aliases
   */
  async getMailAliases(): Promise<MailInABoxApiResponse<any>> {
    return this.request<any>('GET', '/mail/aliases');
  }

  /**
   * Add a mail alias
   */
  async addMailAlias(
    source: string, 
    destination: string
  ): Promise<MailInABoxApiResponse<any>> {
    return this.request<any>('POST', '/mail/aliases/add', {
      source,
      destination
    });
  }

  /**
   * Remove a mail alias
   */
  async removeMailAlias(
    source: string, 
    destination: string
  ): Promise<MailInABoxApiResponse<any>> {
    return this.request<any>('POST', '/mail/aliases/remove', {
      source,
      destination
    });
  }

  /**
   * Get spam filter settings
   */
  async getSpamSettings(): Promise<MailInABoxApiResponse<any>> {
    return this.request<any>('GET', '/mail/spam');
  }

  /**
   * Update spam filter settings
   */
  async updateSpamSettings(
    settings: any
  ): Promise<MailInABoxApiResponse<any>> {
    return this.request<any>('POST', '/mail/spam', settings);
  }

  /**
   * Get SSL certificate information
   */
  async getSslCertificates(): Promise<MailInABoxApiResponse<any>> {
    return this.request<any>('GET', '/ssl/status');
  }

  /**
   * Provision a new SSL certificate (Let's Encrypt)
   */
  async provisionSslCertificate(
    domain: string
  ): Promise<MailInABoxApiResponse<any>> {
    return this.request<any>('POST', '/ssl/provision', { domain });
  }

  /**
   * Install custom SSL certificate
   */
  async installSslCertificate(
    domain: string, 
    cert: string, 
    privateKey: string
  ): Promise<MailInABoxApiResponse<any>> {
    return this.request<any>('POST', '/ssl/install', {
      domain,
      cert,
      privateKey
    });
  }
}

/**
 * Create a Mail-in-a-Box API client for a server
 */
export async function createMailInABoxClient(serverId: number): Promise<MailInABoxApiClient | null> {
  try {
    const server = await storage.getMailServerById(serverId);
    
    if (!server) {
      throw new Error(`Server with ID ${serverId} not found`);
    }
    
    return new MailInABoxApiClient({
      hostname: server.hostname,
      apiKey: server.apiKey,
      apiEndpoint: server.apiEndpoint
    });
  } catch (error: any) {
    log(`Error creating Mail-in-a-Box client: ${error.message}`, 'error');
    return null;
  }
}

/**
 * Sync the server status with the database
 */
export async function syncServerStatus(serverId: number): Promise<boolean> {
  try {
    const client = await createMailInABoxClient(serverId);
    
    if (!client) {
      throw new Error('Failed to create Mail-in-a-Box client');
    }
    
    // Get the version
    const versionResult = await client.getVersion();
    
    if (!versionResult.success) {
      throw new Error('Failed to get server version');
    }
    
    // Get the status
    const statusResult = await client.getStatus();
    
    if (!statusResult.success) {
      throw new Error('Failed to get server status');
    }
    
    // Get resource usage
    const memoryResult = await client.getMemoryUsage();
    const diskResult = await client.getDiskUsage();
    
    // Update the server in the database
    await storage.updateMailServerStatus(serverId, {
      status: 'online',
      version: versionResult.data as string,
      lastSyncedAt: new Date()
    });
    
    // Record server metrics
    await storage.insertServerMetrics(serverId, {
      cpuUsage: 0, // Mail-in-a-Box API doesn't provide CPU usage directly
      memoryUsage: memoryResult.success ? 
        Math.round(Number(memoryResult.data?.memory_used || 0) / Number(memoryResult.data?.memory_total || 1) * 100) : 0,
      diskUsage: diskResult.success ? 
        Math.round(Number(diskResult.data?.disk_used || 0) / Number(diskResult.data?.disk_total || 1) * 100) : 0,
      queueSize: 0, // Will be updated separately
      activeConnections: 0, // Will be updated separately
      metrics: statusResult.data || {}
    });
    
    // Sync the mail queue information
    const queueResult = await client.getMailQueue();
    
    if (queueResult.success && queueResult.data) {
      // Update the queue size in metrics
      await storage.updateServerMetricsQueueSize(serverId, queueResult.data.length || 0);
    }
    
    return true;
  } catch (error: any) {
    log(`Error syncing server status: ${error.message}`, 'error');
    
    // Update the server status to offline
    await storage.updateMailServerStatus(serverId, {
      status: 'offline',
      lastSyncedAt: new Date()
    });
    
    return false;
  }
}

/**
 * Sync DNS records for a server
 */
export async function syncDnsRecords(serverId: number): Promise<boolean> {
  try {
    const client = await createMailInABoxClient(serverId);
    
    if (!client) {
      throw new Error('Failed to create Mail-in-a-Box client');
    }
    
    // Get DNS records from the server
    const result = await client.getDnsRecords();
    
    if (!result.success || !result.data) {
      throw new Error('Failed to get DNS records');
    }
    
    // Format the DNS records
    const dnsRecords = Object.entries(result.data).flatMap(([domain, records]: [string, any]) => {
      return Object.entries(records).flatMap(([recordType, values]: [string, any]) => {
        return (values as any[]).map((record: any) => {
          return {
            serverId,
            recordType,
            name: domain,
            value: typeof record === 'string' ? record : JSON.stringify(record),
            priority: recordType === 'MX' && typeof record !== 'string' ? record.priority : null,
            isManaged: true
          };
        });
      });
    });
    
    // Store the DNS records in the database
    if (dnsRecords.length > 0) {
      await storage.replaceAllDnsRecords(serverId, dnsRecords);
    }
    
    return true;
  } catch (error: any) {
    log(`Error syncing DNS records: ${error.message}`, 'error');
    return false;
  }
}

/**
 * Sync mail users for a server
 */
export async function syncMailUsers(serverId: number): Promise<boolean> {
  try {
    const client = await createMailInABoxClient(serverId);
    
    if (!client) {
      throw new Error('Failed to create Mail-in-a-Box client');
    }
    
    // Get mail users from the server
    const result = await client.getMailUsers();
    
    if (!result.success || !result.data) {
      throw new Error('Failed to get mail users');
    }
    
    // Format the mail users
    const mailboxes = Object.entries(result.data).map(([email, info]: [string, any]) => {
      return {
        serverId,
        email,
        name: email.split('@')[0], // Extract username from email
        status: 'active',
        storageUsed: info.status === 'active' && info.usage !== undefined ? 
          Math.round(Number(info.usage) * 1024 * 1024) : 0 // Convert MB to bytes
      };
    });
    
    // Store the mailboxes in the database
    if (mailboxes.length > 0) {
      await storage.replaceAllMailboxes(serverId, mailboxes);
    }
    
    return true;
  } catch (error: any) {
    log(`Error syncing mail users: ${error.message}`, 'error');
    return false;
  }
}

/**
 * Sync mail aliases for a server
 */
export async function syncMailAliases(serverId: number): Promise<boolean> {
  try {
    const client = await createMailInABoxClient(serverId);
    
    if (!client) {
      throw new Error('Failed to create Mail-in-a-Box client');
    }
    
    // Get mail aliases from the server
    const result = await client.getMailAliases();
    
    if (!result.success || !result.data) {
      throw new Error('Failed to get mail aliases');
    }
    
    // Get all mailboxes for the server to associate aliases with mailboxes
    const mailboxes = await storage.getMailboxesByServerId(serverId);
    const mailboxByEmail = new Map(mailboxes.map(m => [m.email, m]));
    
    // Format the mail aliases
    const aliases = Object.entries(result.data).flatMap(([source, destinations]: [string, any]) => {
      return (destinations as string[]).map(destination => {
        const mailbox = mailboxByEmail.get(destination);
        
        return {
          serverId,
          mailboxId: mailbox ? mailbox.id : null,
          sourceEmail: source,
          destinationEmail: destination,
          isActive: true
        };
      });
    });
    
    // Store the aliases in the database
    if (aliases.length > 0) {
      await storage.replaceAllEmailAliases(serverId, aliases);
    }
    
    return true;
  } catch (error: any) {
    log(`Error syncing mail aliases: ${error.message}`, 'error');
    return false;
  }
}

/**
 * Full sync of all data for a server
 */
export async function syncAllServerData(serverId: number): Promise<boolean> {
  try {
    // Sync server status first to ensure connectivity
    const statusSuccess = await syncServerStatus(serverId);
    
    if (!statusSuccess) {
      return false;
    }
    
    // Sync all data in parallel
    const [dnsSuccess, usersSuccess, aliasesSuccess] = await Promise.all([
      syncDnsRecords(serverId),
      syncMailUsers(serverId),
      syncMailAliases(serverId)
    ]);
    
    // Log the sync results
    log(`Server ${serverId} sync completed: DNS=${dnsSuccess}, Users=${usersSuccess}, Aliases=${aliasesSuccess}`, 'info');
    
    // Return true if all syncs were successful
    return dnsSuccess && usersSuccess && aliasesSuccess;
  } catch (error: any) {
    log(`Error in full server sync: ${error.message}`, 'error');
    return false;
  }
}