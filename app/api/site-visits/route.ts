import { NextResponse } from 'next/server';
import { getSql } from '@/lib/db';
import { isAdmin, isSameOrigin } from '@/lib/admin-auth';
import { isPageViewEvent, MAX_PAGE_VIEW_BATCH } from '@/lib/page-views';

export const dynamic = 'force-dynamic';
const noStore = { 'Cache-Control': 'no-store' };

function payload(row: Record<string, unknown> | undefined) {
  if (!row) throw new Error('Page view metrics are not initialized.');
  const totalPageViews = Number(row.totalPageViews);
  return { totalPageViews, startedAt: row.startedAt, totalVisits: totalPageViews };
}

export async function GET() {
  try {
    const rows = await getSql().query('SELECT (total_visits + total_page_views) AS "totalPageViews", page_views_started_at AS "startedAt" FROM arc_site_metrics WHERE id = 1');
    return NextResponse.json(payload(rows[0]), {
      headers: {
        'Cache-Control': 'public, max-age=300',
        'Vercel-CDN-Cache-Control': 'public, s-maxage=300, stale-while-revalidate=300',
      },
    });
  } catch (error) {
    console.error('Could not read page views:', error instanceof Error ? error.message : 'unknown database error');
    return NextResponse.json({ error: 'Page views are temporarily unavailable.' }, { status: 503, headers: noStore });
  }
}

export async function POST(request: Request) {
  if (!isSameOrigin(request) || request.headers.get('sec-fetch-site') === 'cross-site') {
    return NextResponse.json({ error: 'Invalid origin.' }, { status: 403, headers: noStore });
  }
  const hostname = new URL(request.url).hostname;
  const userAgent = request.headers.get('user-agent') ?? '';
  if (process.env.NODE_ENV !== 'production' || process.env.VERCEL_ENV === 'preview'
    || ['localhost', '127.0.0.1', '[::1]'].includes(hostname)
    || /bot\b|crawler|spider|headless|slurp|facebookexternalhit/i.test(userAgent)
    || (request.headers.get('cookie')?.includes('arcwatch_admin=') && await isAdmin())) {
    return new NextResponse(null, { status: 204, headers: noStore });
  }
  if (!request.headers.get('content-type')?.startsWith('application/json') || Number(request.headers.get('content-length') ?? 0) > 12_000) {
    return NextResponse.json({ error: 'Invalid page view batch.' }, { status: 400, headers: noStore });
  }
  let body: unknown;
  try {
    const text = await request.text();
    if (text.length > 12_000) throw new Error('Too large');
    body = JSON.parse(text);
  } catch {
    return NextResponse.json({ error: 'Invalid page view batch.' }, { status: 400, headers: noStore });
  }
  const events = body && typeof body === 'object' && 'events' in body ? body.events : null;
  if (!Array.isArray(events) || !events.length || events.length > MAX_PAGE_VIEW_BATCH || !events.every(event => isPageViewEvent(event))) {
    return NextResponse.json({ error: 'Invalid page view batch.' }, { status: 400, headers: noStore });
  }

  try {
    const ids = [...new Set(events.map(event => event.id))];
    await getSql().query(`
      WITH recorded AS (
        INSERT INTO arc_site_page_view_events (event_id)
        SELECT unnest($1::uuid[]) ON CONFLICT (event_id) DO NOTHING
        RETURNING event_id
      ), pruned AS (
        DELETE FROM arc_site_page_view_events WHERE event_id IN (
          SELECT event_id FROM arc_site_page_view_events
          WHERE received_at < now() - interval '7 days' ORDER BY received_at LIMIT 200
        )
      )
      UPDATE arc_site_metrics
      SET total_page_views = total_page_views + (SELECT count(*) FROM recorded), updated_at = now()
      WHERE id = 1 AND EXISTS (SELECT 1 FROM recorded)
    `, [ids]);
    return new NextResponse(null, { status: 204, headers: noStore });
  } catch (error) {
    console.error('Could not record page views:', error instanceof Error ? error.message : 'unknown database error');
    return NextResponse.json({ error: 'Page views are temporarily unavailable.' }, { status: 503, headers: noStore });
  }
}
