import { readFile } from 'node:fs/promises';
import { neon } from '@neondatabase/serverless';

const databaseUrl = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('DATABASE_URL is missing. Supply it through the Vercel environment.');
  process.exit(1);
}
if (new URL(databaseUrl).hostname.includes('-pooler')) {
  console.error('Schema migrations require DATABASE_URL_UNPOOLED (a direct Neon connection).');
  process.exit(1);
}

const sql = neon(databaseUrl);
const migrationName = process.argv[2] ?? '001_ecosystem_projects.sql';
if (!/^\d{3}_[a-z0-9_-]+\.sql$/.test(migrationName)) {
  console.error('Invalid migration filename.');
  process.exit(1);
}
const migration = await readFile(new URL(`../db/migrations/${migrationName}`, import.meta.url), 'utf8');
const statements = migration.split(';').map((statement) => statement.trim()).filter(Boolean);

try {
  for (const statement of statements) await sql.query(statement);
  console.log(`Applied ${statements.length} database statements.`);
} catch {
  console.error('Database migration failed. Check Vercel environment configuration and database availability.');
  process.exit(1);
}
