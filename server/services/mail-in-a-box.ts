import fetch from 'node-fetch';
import { storage } from '../storage';
import { 
  DnsRecord, 
  Mailbox, 
  EmailAlias, 
  MailServer, 
  SpamFilter, 
  BackupJob, 
  BackupHistoryEntry,
  ServerMetricsEntry 
} from '@shared/schema';

interface MailServerCredentials {
  apiEndpoint: string;
  apiKey: string;
}

// Generic API request function for Mail-in-a-Box
export async function makeRequest(
  credentials: MailServerCredentials,
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
  body?: any
): Promise<unknown> {
  const headers: Record<string, string> = {
    'Authorization': `Basic ${Buffer.from(`admin:${credentials.apiKey}`).toString('base64')}`,
    'Content-Type': 'application/json',
  };

  const url = `${credentials.apiEndpoint.replace(/\/$/, '')}/${endpoint.replace(/^\//, '')}`;
  
  const options: any = {
    method,
    headers,
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(url, options);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Mail-in-a-Box API Error: ${response.status} ${response.statusText} - ${errorText}`);
    }
    
    // Some endpoints might not return JSON
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return await response.json();
    }
    
    return await response.text();
  } catch (error) {
    console.error('Mail-in-a-Box API Error:', error);
    throw error;
  }
}

// Get server information
export async function getServerInfo(serverId: number): Promise<{status: string, version?: string, error?: string}> {
  const server = await storage.getMailServerById(serverId);
  
  if (!server) {
    throw new Error('Server not found');
  }
  
  const credentials = {
    apiEndpoint: server.apiEndpoint,
    apiKey: server.apiKey,
  };
  
  try {
    const rawInfo = await makeRequest(credentials, '/system/status');
    const info = rawInfo as { version?: string, status?: string };
    
    // Update server status in the database
    await storage.updateMailServerStatus(serverId, {
      status: 'online',
      version: info.version || 'unknown',
      lastSyncedAt: new Date(),
    });
    
    return {
      status: 'online',
      version: info.version,
    };
  } catch (error) {
    // Update server status to offline
    await storage.updateMailServerStatus(serverId, {
      status: 'offline',
      lastSyncedAt: new Date(),
    });
    
    console.error(`Failed to get server info for server ${serverId}:`, error);
    return {
      status: 'offline',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

// Get DNS records
export async function getDnsRecords(serverId: number) {
  const server = await storage.getMailServerById(serverId);
  
  if (!server) {
    throw new Error('Server not found');
  }
  
  const credentials = {
    apiEndpoint: server.apiEndpoint,
    apiKey: server.apiKey,
  };
  
  try {
    const response = await makeRequest(credentials, '/dns/zones');
    
    // Process the response to match our schema
    const records: Omit<DnsRecord, 'id' | 'createdAt' | 'updatedAt'>[] = [];
    
    // Process the response data structure based on Mail-in-a-Box API
    const zones = response as any[];
    if (Array.isArray(zones)) {
      for (const zone of zones) {
        if (zone.records && Array.isArray(zone.records)) {
          for (const record of zone.records) {
            records.push({
              serverId,
              recordType: record.type,
              name: record.name,
              value: record.value,
              priority: record.priority,
              ttl: record.ttl || 3600,
              isManaged: record.managed || false,
            });
          }
        }
      }
    }
    
    // Replace all DNS records in our database
    await storage.replaceAllDnsRecords(serverId, records);
    
    return await storage.getDnsRecordsByServerId(serverId);
  } catch (error) {
    console.error(`Failed to get DNS records for server ${serverId}:`, error);
    throw error;
  }
}

// Get mailboxes
export async function getMailboxes(serverId: number) {
  const server = await storage.getMailServerById(serverId);
  
  if (!server) {
    throw new Error('Server not found');
  }
  
  const credentials = {
    apiEndpoint: server.apiEndpoint,
    apiKey: server.apiKey,
  };
  
  try {
    const response = await makeRequest(credentials, '/mail/users') as Record<string, any>;
    
    // Process the response to match our schema
    const mailboxes: Omit<Mailbox, 'id' | 'createdAt' | 'updatedAt'>[] = [];
    
    // Mail-in-a-Box returns email accounts in a specific format
    Object.keys(response).forEach(email => {
      const details = response[email];
      if (details && typeof details === 'object') {
        mailboxes.push({
          serverId,
          email,
          name: details.name || email.split('@')[0],
          status: details.status || 'active',
          storageUsed: details.mailbox_size || 0,
          storageLimit: null,
          lastLogin: null,
        });
      }
    });
    
    // Replace all mailboxes in our database
    await storage.replaceAllMailboxes(serverId, mailboxes);
    
    return await storage.getMailboxesByServerId(serverId);
  } catch (error) {
    console.error(`Failed to get mailboxes for server ${serverId}:`, error);
    throw error;
  }
}

// Create a new mailbox
export async function createMailbox(serverId: number, data: { email: string; name?: string; password: string }) {
  const server = await storage.getMailServerById(serverId);
  
  if (!server) {
    throw new Error('Server not found');
  }
  
  const credentials = {
    apiEndpoint: server.apiEndpoint,
    apiKey: server.apiKey,
  };
  
  try {
    await makeRequest(credentials, '/mail/users/add', 'POST', {
      email: data.email,
      password: data.password,
      privileges: 'email_only',
    });
    
    // Add the mailbox to our database
    const mailbox = await storage.insertMailbox({
      serverId,
      email: data.email,
      name: data.name || null,
      status: 'active',
      storageLimit: null,
    });
    
    return mailbox;
  } catch (error) {
    console.error(`Failed to create mailbox on server ${serverId}:`, error);
    throw error;
  }
}

// Delete a mailbox
export async function deleteMailbox(serverId: number, mailboxId: number) {
  const server = await storage.getMailServerById(serverId);
  if (!server) {
    throw new Error('Server not found');
  }
  
  const mailbox = await storage.getMailboxById(mailboxId);
  if (!mailbox || mailbox.serverId !== serverId) {
    throw new Error('Mailbox not found');
  }
  
  const credentials = {
    apiEndpoint: server.apiEndpoint,
    apiKey: server.apiKey,
  };
  
  try {
    await makeRequest(credentials, '/mail/users/remove', 'POST', {
      email: mailbox.email,
    });
    
    // Remove the mailbox from our database
    await storage.deleteMailbox(mailboxId);
    
    return { success: true };
  } catch (error) {
    console.error(`Failed to delete mailbox ${mailboxId} on server ${serverId}:`, error);
    throw error;
  }
}

// Get email aliases
export async function getEmailAliases(serverId: number) {
  const server = await storage.getMailServerById(serverId);
  
  if (!server) {
    throw new Error('Server not found');
  }
  
  const credentials = {
    apiEndpoint: server.apiEndpoint,
    apiKey: server.apiKey,
  };
  
  try {
    const response = await makeRequest(credentials, '/mail/aliases') as Record<string, any>;
    
    // Process the response to match our schema
    const aliases: Omit<EmailAlias, 'id' | 'createdAt' | 'updatedAt'>[] = [];
    
    // Find all mailboxes for this server to link aliases
    const mailboxes = await storage.getMailboxesByServerId(serverId);
    const mailboxMap = new Map<string, number>();
    mailboxes.forEach(mailbox => {
      mailboxMap.set(mailbox.email, mailbox.id);
    });
    
    // Mail-in-a-Box returns aliases in a specific format
    Object.keys(response).forEach(sourceEmail => {
      const details = response[sourceEmail];
      if (details && typeof details === 'object') {
        const destinationEmails = Array.isArray(details.forward_to) ? details.forward_to : [details.forward_to];
        
        for (const destinationEmail of destinationEmails) {
          const mailboxId = mailboxMap.get(destinationEmail) || null;
          
          aliases.push({
            serverId,
            mailboxId,
            sourceEmail,
            destinationEmail,
            isActive: true,
            expiresAt: null,
          });
        }
      }
    });
    
    // Replace all aliases in our database
    await storage.replaceAllEmailAliases(serverId, aliases);
    
    return await storage.getEmailAliasesByServerId(serverId);
  } catch (error) {
    console.error(`Failed to get email aliases for server ${serverId}:`, error);
    throw error;
  }
}

// Create a new email alias
export async function createEmailAlias(serverId: number, data: { 
  sourceEmail: string; 
  destinationEmail: string;
  mailboxId?: number;
}) {
  const server = await storage.getMailServerById(serverId);
  
  if (!server) {
    throw new Error('Server not found');
  }
  
  const credentials = {
    apiEndpoint: server.apiEndpoint,
    apiKey: server.apiKey,
  };
  
  try {
    await makeRequest(credentials, '/mail/aliases/add', 'POST', {
      source: data.sourceEmail,
      destination: data.destinationEmail,
    });
    
    // Add the alias to our database
    const alias = await storage.insertEmailAlias({
      serverId,
      mailboxId: data.mailboxId || null,
      sourceEmail: data.sourceEmail,
      destinationEmail: data.destinationEmail,
      isActive: true,
      expiresAt: null,
    });
    
    return alias;
  } catch (error) {
    console.error(`Failed to create email alias on server ${serverId}:`, error);
    throw error;
  }
}

// Delete an email alias
export async function deleteEmailAlias(serverId: number, aliasId: number) {
  const server = await storage.getMailServerById(serverId);
  if (!server) {
    throw new Error('Server not found');
  }
  
  // Get alias from database
  const aliases = await storage.getEmailAliasesByServerId(serverId);
  const alias = aliases.find(a => a.id === aliasId);
  
  if (!alias) {
    throw new Error('Email alias not found');
  }
  
  const credentials = {
    apiEndpoint: server.apiEndpoint,
    apiKey: server.apiKey,
  };
  
  try {
    await makeRequest(credentials, '/mail/aliases/remove', 'POST', {
      source: alias.sourceEmail,
      destination: alias.destinationEmail,
    });
    
    // Remove the alias from our database
    await storage.deleteEmailAlias(aliasId);
    
    return { success: true };
  } catch (error) {
    console.error(`Failed to delete email alias ${aliasId} on server ${serverId}:`, error);
    throw error;
  }
}

// Security Function: Get spam filter settings
export async function getSpamFilters(serverId: number) {
  const server = await storage.getMailServerById(serverId);
  
  if (!server) {
    throw new Error('Server not found');
  }
  
  const credentials = {
    apiEndpoint: server.apiEndpoint,
    apiKey: server.apiKey,
  };
  
  try {
    const response = await makeRequest(credentials, '/mail/filter');
    const spamSettings = response as Record<string, any>;
    
    // Process the response to match our schema
    const filters: Omit<SpamFilter, 'id' | 'createdAt' | 'updatedAt'>[] = [];
    
    // Process the Mail-in-a-Box spam filter settings
    // Convert the standard settings to our format
    if (spamSettings.spam_threshold) {
      filters.push({
        serverId,
        name: 'Spam Score Threshold',
        ruleType: 'threshold',
        pattern: spamSettings.spam_threshold.toString(),
        action: 'mark',
        isActive: true,
        description: 'Global spam score threshold',
        score: parseFloat(spamSettings.spam_threshold)
      });
    }
    
    // Add whitelist and blacklist entries
    const whitelistAddresses = spamSettings.whitelist_addresses || [];
    for (const address of whitelistAddresses) {
      filters.push({
        serverId,
        name: `Whitelist: ${address}`,
        ruleType: 'whitelist',
        pattern: address,
        action: 'allow',
        isActive: true,
        description: 'Whitelisted address',
        score: null
      });
    }
    
    const blacklistAddresses = spamSettings.blacklist_addresses || [];
    for (const address of blacklistAddresses) {
      filters.push({
        serverId,
        name: `Blacklist: ${address}`,
        ruleType: 'blacklist',
        pattern: address,
        action: 'block',
        isActive: true,
        description: 'Blacklisted address',
        score: null
      });
    }
    
    // Replace all spam filters in our database
    await storage.replaceAllSpamFilters(serverId, filters);
    
    return await storage.getSpamFiltersByServerId(serverId);
  } catch (error) {
    console.error(`Failed to get spam filters for server ${serverId}:`, error);
    throw error;
  }
}

// Create or update a spam filter rule
export async function createSpamFilter(serverId: number, data: Omit<SpamFilter, 'id' | 'serverId' | 'createdAt' | 'updatedAt'>) {
  const server = await storage.getMailServerById(serverId);
  
  if (!server) {
    throw new Error('Server not found');
  }
  
  const credentials = {
    apiEndpoint: server.apiEndpoint,
    apiKey: server.apiKey,
  };
  
  try {
    // Depending on the rule type, call the appropriate Mail-in-a-Box API
    if (data.ruleType === 'whitelist') {
      await makeRequest(credentials, '/mail/filter/whitelist/add', 'POST', {
        address: data.pattern
      });
    } else if (data.ruleType === 'blacklist') {
      await makeRequest(credentials, '/mail/filter/blacklist/add', 'POST', {
        address: data.pattern
      });
    } else if (data.ruleType === 'threshold') {
      await makeRequest(credentials, '/mail/filter/set_spam_threshold', 'POST', {
        threshold: data.score
      });
    }
    
    // Add the filter to our database
    const filter = await storage.insertSpamFilter({
      serverId,
      name: data.name,
      ruleType: data.ruleType,
      pattern: data.pattern,
      action: data.action,
      isActive: data.isActive,
      description: data.description || null,
      score: data.score
    });
    
    return filter;
  } catch (error) {
    console.error(`Failed to create spam filter on server ${serverId}:`, error);
    throw error;
  }
}

// Delete a spam filter rule
export async function deleteSpamFilter(serverId: number, filterId: number) {
  const server = await storage.getMailServerById(serverId);
  if (!server) {
    throw new Error('Server not found');
  }
  
  const filter = await storage.getSpamFilterById(filterId);
  if (!filter || filter.serverId !== serverId) {
    throw new Error('Spam filter not found');
  }
  
  const credentials = {
    apiEndpoint: server.apiEndpoint,
    apiKey: server.apiKey,
  };
  
  try {
    // Depending on the rule type, call the appropriate Mail-in-a-Box API
    if (filter.ruleType === 'whitelist') {
      await makeRequest(credentials, '/mail/filter/whitelist/remove', 'POST', {
        address: filter.pattern
      });
    } else if (filter.ruleType === 'blacklist') {
      await makeRequest(credentials, '/mail/filter/blacklist/remove', 'POST', {
        address: filter.pattern
      });
    }
    
    // Remove the filter from our database
    await storage.deleteSpamFilter(filterId);
    
    return { success: true };
  } catch (error) {
    console.error(`Failed to delete spam filter ${filterId} on server ${serverId}:`, error);
    throw error;
  }
}

// Backup Management: Get backup settings
export async function getBackupJobs(serverId: number) {
  const server = await storage.getMailServerById(serverId);
  
  if (!server) {
    throw new Error('Server not found');
  }
  
  const credentials = {
    apiEndpoint: server.apiEndpoint,
    apiKey: server.apiKey,
  };
  
  try {
    const response = await makeRequest(credentials, '/system/backup/status');
    const backupStatus = response as Record<string, any>;
    
    // Process the response to match our schema
    const backups: Omit<BackupJob, 'id' | 'createdAt' | 'updatedAt' | 'lastRunAt' | 'nextRunAt'>[] = [];
    
    // Extract backup settings from Mail-in-a-Box
    const backupConfig = backupStatus.config || {};
    
    // Add each configured backup
    if (backupConfig.target) {
      // Main system backup
      backups.push({
        serverId,
        name: 'System Backup',
        backupType: 'system',
        destination: backupConfig.target,
        schedule: backupConfig.schedule || 'daily',
        status: backupStatus.backups_enabled ? 'active' : 'disabled',
        retentionDays: backupConfig.retention_days || 7,
        encryptionKey: backupConfig.encryption_key || null
      });
    }
    
    // Add mail backup if configured separately
    if (backupConfig.email_target) {
      backups.push({
        serverId,
        name: 'Mail Backup',
        backupType: 'mail',
        destination: backupConfig.email_target,
        schedule: backupConfig.email_schedule || 'daily',
        status: backupStatus.email_backups_enabled ? 'active' : 'disabled',
        retentionDays: backupConfig.email_retention_days || 7,
        encryptionKey: backupConfig.email_encryption_key || null
      });
    }
    
    // Replace all backup jobs in our database
    await storage.replaceAllBackupJobs(serverId, backups);
    
    return await storage.getBackupJobsByServerId(serverId);
  } catch (error) {
    console.error(`Failed to get backup jobs for server ${serverId}:`, error);
    throw error;
  }
}

// Create a new backup job
export async function createBackupJob(serverId: number, data: {
  name: string;
  backupType: string;
  destination: string;
  schedule: string;
  retentionDays?: number;
  encryptionKey?: string | null;
}) {
  const server = await storage.getMailServerById(serverId);
  
  if (!server) {
    throw new Error('Server not found');
  }
  
  const credentials = {
    apiEndpoint: server.apiEndpoint,
    apiKey: server.apiKey,
  };
  
  try {
    // Configure backup based on type
    const backupConfig: Record<string, any> = {
      target: data.backupType === 'system' ? data.destination : undefined,
      email_target: data.backupType === 'mail' ? data.destination : undefined,
      schedule: data.backupType === 'system' ? data.schedule : undefined,
      email_schedule: data.backupType === 'mail' ? data.schedule : undefined,
      retention_days: data.backupType === 'system' ? data.retentionDays : undefined,
      email_retention_days: data.backupType === 'mail' ? data.retentionDays : undefined,
      encryption_key: data.backupType === 'system' ? data.encryptionKey : undefined,
      email_encryption_key: data.backupType === 'mail' ? data.encryptionKey : undefined
    };
    
    // Update backup configuration
    await makeRequest(credentials, '/system/backup/config', 'POST', backupConfig);
    
    // Enable the backup
    await makeRequest(credentials, '/system/backup/toggle', 'POST', {
      target_type: data.backupType,
      enabled: true
    });
    
    // Add the backup job to our database
    const job = await storage.insertBackupJob({
      serverId,
      name: data.name,
      backupType: data.backupType,
      destination: data.destination,
      schedule: data.schedule,
      status: 'active',
      retentionDays: data.retentionDays || 7,
      encryptionKey: data.encryptionKey || null
    });
    
    return job;
  } catch (error) {
    console.error(`Failed to create backup job on server ${serverId}:`, error);
    throw error;
  }
}

// Manually run a backup job
export async function runBackupJob(serverId: number, jobId: number) {
  const server = await storage.getMailServerById(serverId);
  if (!server) {
    throw new Error('Server not found');
  }
  
  const job = await storage.getBackupJobById(jobId);
  if (!job || job.serverId !== serverId) {
    throw new Error('Backup job not found');
  }
  
  const credentials = {
    apiEndpoint: server.apiEndpoint,
    apiKey: server.apiKey,
  };
  
  try {
    // Run the backup immediately
    await makeRequest(credentials, '/system/backup/now', 'POST', {
      target_type: job.backupType
    });
    
    // Record the backup run in history
    const historyEntry = await storage.insertBackupHistoryEntry({
      jobId,
      startedAt: new Date(),
      status: 'running',
      sizeBytes: null,
      backupLocation: null,
      error: null,
      completedAt: null,
      mailboxCount: null,
      filesCount: null
    });
    
    // Update the backup job status
    await storage.updateBackupJobStatus(jobId, 'running', new Date());
    
    return { success: true, historyEntry };
  } catch (error) {
    console.error(`Failed to run backup job ${jobId} on server ${serverId}:`, error);
    
    // Record the failed attempt
    await storage.insertBackupHistoryEntry({
      jobId,
      startedAt: new Date(),
      status: 'failed',
      sizeBytes: null,
      backupLocation: null,
      error: error instanceof Error ? error.message : String(error),
      completedAt: new Date(),
      mailboxCount: null,
      filesCount: null
    });
    
    throw error;
  }
}

// Get server metrics
export async function getServerMetrics(serverId: number) {
  const server = await storage.getMailServerById(serverId);
  
  if (!server) {
    throw new Error('Server not found');
  }
  
  const credentials = {
    apiEndpoint: server.apiEndpoint,
    apiKey: server.apiKey,
  };
  
  try {
    // Get system status information
    const systemStatus = await makeRequest(credentials, '/system/status') as Record<string, any>;
    
    // Get memory usage information
    const memoryInfo = await makeRequest(credentials, '/system/memory') as Record<string, any>;
    
    // Get disk usage information
    const diskInfo = await makeRequest(credentials, '/system/disk') as Record<string, any>;
    
    // Get mail queue size
    const mailQueue = await makeRequest(credentials, '/mail/queue') as Record<string, any>;
    
    // Process metrics
    const cpuUsage = systemStatus.system_load !== undefined ? parseFloat(systemStatus.system_load) : null;
    const memoryUsage = memoryInfo.memory_used !== undefined ? parseFloat(memoryInfo.memory_used) : null;
    const diskUsage = diskInfo.disk_used !== undefined ? parseFloat(diskInfo.disk_used) : null;
    const queueSize = mailQueue.queue_size !== undefined ? parseInt(mailQueue.queue_size) : null;
    
    // Store metrics in our database
    const metrics = await storage.insertServerMetrics(serverId, {
      cpuUsage,
      memoryUsage,
      diskUsage,
      queueSize,
      activeConnections: null,
      metrics: {
        system: systemStatus,
        memory: memoryInfo,
        disk: diskInfo,
        mail: mailQueue
      }
    });
    
    return metrics;
  } catch (error) {
    console.error(`Failed to get server metrics for server ${serverId}:`, error);
    throw error;
  }
}

// Sync all server data
export async function syncAllServerData(serverId: number) {
  try {
    // Get server info
    await getServerInfo(serverId);
    
    // Get DNS records
    await getDnsRecords(serverId);
    
    // Get mailboxes
    await getMailboxes(serverId);
    
    // Get email aliases
    await getEmailAliases(serverId);
    
    // Get spam filters
    await getSpamFilters(serverId);
    
    // Get backup jobs
    await getBackupJobs(serverId);
    
    // Get server metrics
    await getServerMetrics(serverId);
    
    return { success: true };
  } catch (error) {
    console.error(`Failed to sync all data for server ${serverId}:`, error);
    throw error;
  }
}