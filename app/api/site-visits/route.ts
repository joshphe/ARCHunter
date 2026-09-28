import { NextResponse } from 'next/server';
import { getSql } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const sql = getSql();
    const rows = await sql.query('SELECT total_visits AS "totalVisits" FROM arc_site_metrics WHERE id = 1');
    return NextResponse.json({ totalVisits: Number(rows[0]?.totalVisits ?? 0) }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Could not read site visits:', error instanceof Error ? error.message : 'unknown database error');
    return NextResponse.json({ error: 'Visitor count is temporarily unavailable.' }, { status: 503 });
  }
}

export async function POST() {
  try {
    const sql = getSql();
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
