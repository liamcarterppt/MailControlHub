import fetch from 'node-fetch';
import { storage } from '../storage';
import { DnsRecord, Mailbox, EmailAlias, MailServer } from '@shared/schema';

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
) {
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
    const info: any = await makeRequest(credentials, '/system/status');
    
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
    const response: any = await makeRequest(credentials, '/dns/zones');
    
    // Process the response to match our schema
    const records: Omit<DnsRecord, 'id' | 'createdAt' | 'updatedAt'>[] = [];
    
    // Process the response data structure based on Mail-in-a-Box API
    if (Array.isArray(response)) {
      for (const zone of response) {
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
    const response: Record<string, any> = await makeRequest(credentials, '/mail/users');
    
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
    const response: Record<string, any> = await makeRequest(credentials, '/mail/aliases');
    
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