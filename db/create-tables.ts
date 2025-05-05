import { db } from './index.js';
import { sql } from 'drizzle-orm';
import * as schema from '../shared/schema.js';

// Create a script to create all missing tables
async function createMissingTables() {
  console.log('Creating missing tables...');
  
  try {
    // Create mailServers table if it doesn't exist
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS mail_servers (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        hostname TEXT NOT NULL,
        api_url TEXT NOT NULL,
        api_key TEXT NOT NULL,
        user_id INTEGER NOT NULL REFERENCES users(id),
        version TEXT,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        status TEXT NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
        last_synced_at TIMESTAMP
      );
    `);
    console.log('Created mail_servers table');

    // Create dnsRecords table if it doesn't exist
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS dns_records (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        value TEXT NOT NULL,
        record_type TEXT NOT NULL,
        ttl INTEGER NOT NULL DEFAULT 3600,
        server_id INTEGER NOT NULL REFERENCES mail_servers(id) ON DELETE CASCADE,
        priority INTEGER,
        is_managed BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);
    console.log('Created dns_records table');

    // Create mailboxes table if it doesn't exist
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS mailboxes (
        id SERIAL PRIMARY KEY,
        email TEXT NOT NULL,
        name TEXT,
        status TEXT NOT NULL,
        storage_used INTEGER NOT NULL DEFAULT 0,
        storage_limit INTEGER,
        server_id INTEGER NOT NULL REFERENCES mail_servers(id) ON DELETE CASCADE,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
        last_login TIMESTAMP
      );
    `);
    console.log('Created mailboxes table');

    // Create emailAliases table if it doesn't exist
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS email_aliases (
        id SERIAL PRIMARY KEY,
        source_email TEXT NOT NULL,
        destination_email TEXT NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        server_id INTEGER NOT NULL REFERENCES mail_servers(id) ON DELETE CASCADE,
        mailbox_id INTEGER REFERENCES mailboxes(id) ON DELETE SET NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
        expires_at TIMESTAMP
      );
    `);
    console.log('Created email_aliases table');

    // Create backupJobs table if it doesn't exist
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS backup_jobs (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        type TEXT NOT NULL,
        schedule TEXT NOT NULL,
        retention_days INTEGER NOT NULL DEFAULT 30,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        server_id INTEGER NOT NULL REFERENCES mail_servers(id) ON DELETE CASCADE,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
        last_run_at TIMESTAMP,
        next_run_at TIMESTAMP
      );
    `);
    console.log('Created backup_jobs table');

    // Create backupHistory table if it doesn't exist
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS backup_history (
        id SERIAL PRIMARY KEY,
        status TEXT NOT NULL,
        job_id INTEGER NOT NULL REFERENCES backup_jobs(id) ON DELETE CASCADE,
        started_at TIMESTAMP NOT NULL DEFAULT NOW(),
        completed_at TIMESTAMP,
        size_bytes INTEGER,
        error TEXT
      );
    `);
    console.log('Created backup_history table');

    // Create serverMetrics table if it doesn't exist
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS server_metrics (
        id SERIAL PRIMARY KEY,
        server_id INTEGER NOT NULL REFERENCES mail_servers(id) ON DELETE CASCADE,
        timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
        cpu_usage FLOAT,
        memory_usage FLOAT,
        disk_usage FLOAT,
        queue_size INTEGER,
        active_connections INTEGER,
        metrics JSONB
      );
    `);
    console.log('Created server_metrics table');

    // Create spamFilters table if it doesn't exist
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS spam_filters (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        filter_type TEXT NOT NULL,
        settings JSONB NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        server_id INTEGER NOT NULL REFERENCES mail_servers(id) ON DELETE CASCADE,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);
    console.log('Created spam_filters table');

    console.log('All tables created successfully');
  } catch (error) {
    console.error('Error creating tables:', error);
    throw error;
  }
}

// Run the function
createMissingTables()
  .then(() => {
    console.log('Migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });