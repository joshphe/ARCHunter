import { neon } from '@neondatabase/serverless';

let client: ReturnType<typeof neon> | undefined;

export function getSql() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL is not configured.');
  client ??= neon(connectionString);
  return client;
}
