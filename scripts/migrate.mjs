import { readFile } from 'node:fs/promises';
import { neon } from '@neondatabase/serverless';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('DATABASE_URL is missing. Supply it through the Vercel environment.');
  process.exit(1);
}

const sql = neon(databaseUrl);
const migration = await readFile(new URL('../db/migrations/001_ecosystem_projects.sql', import.meta.url), 'utf8');
const statements = migration.split(';').map((statement) => statement.trim()).filter(Boolean);

try {
  for (const statement of statements) await sql.query(statement);
  console.log(`Applied ${statements.length} database statements.`);
} catch {
  console.error('Database migration failed. Check Vercel environment configuration and database availability.');
  process.exit(1);
}
