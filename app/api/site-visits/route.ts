import { NextResponse } from 'next/server';
import { getSql } from '@/lib/db';

export const dynamic = 'force-dynamic';

let schemaReady: Promise<void> | null = null;

async function getReadySql() {
  const sql = getSql();
  schemaReady ??= (async () => {
    await sql.query(`CREATE TABLE IF NOT EXISTS arc_site_metrics (
      id smallint PRIMARY KEY CHECK (id = 1),
      total_visits bigint NOT NULL DEFAULT 0 CHECK (total_visits >= 0),
      updated_at timestamptz NOT NULL DEFAULT now()
    )`);
    await sql.query('INSERT INTO arc_site_metrics (id) VALUES (1) ON CONFLICT (id) DO NOTHING');
  })().catch((error) => {
    schemaReady = null;
    throw error;
  });
  await schemaReady;
  return sql;
}

export async function GET() {
  try {
    const sql = await getReadySql();
    const rows = await sql.query('SELECT total_visits AS "totalVisits" FROM arc_site_metrics WHERE id = 1');
    return NextResponse.json({ totalVisits: Number(rows[0]?.totalVisits ?? 0) }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Could not read site visits:', error instanceof Error ? error.message : 'unknown database error');
    return NextResponse.json({ error: 'Visitor count is temporarily unavailable.' }, { status: 503 });
  }
}

export async function POST() {
  try {
    const sql = await getReadySql();
    const rows = await sql.query(`
      UPDATE arc_site_metrics
      SET total_visits = total_visits + 1, updated_at = now()
      WHERE id = 1
      RETURNING total_visits AS "totalVisits"
    `);
    return NextResponse.json({ totalVisits: Number(rows[0]?.totalVisits ?? 0) }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Could not record site visit:', error instanceof Error ? error.message : 'unknown database error');
    return NextResponse.json({ error: 'Visitor count is temporarily unavailable.' }, { status: 503 });
  }
}
