import { NextResponse } from 'next/server';
import { getSql } from '@/lib/db';
import { isAdmin, isSameOrigin } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';
const noStore = { 'Cache-Control': 'no-store' };

function payload(row: Record<string, unknown> | undefined) {
  if (!row) throw new Error('Site visit metrics are not initialized.');
  const totalVisits = Number(row.totalVisits);
  // Preserve the total already accumulated before session counting was restored.
  return { totalVisits, totalPageViews: totalVisits };
}

export async function GET() {
  try {
    const rows = await getSql().query('SELECT (total_visits + total_page_views) AS "totalVisits" FROM arc_site_metrics WHERE id = 1');
    return NextResponse.json(payload(rows[0]), {
      headers: {
        'Cache-Control': 'public, max-age=300',
        'Vercel-CDN-Cache-Control': 'public, s-maxage=300, stale-while-revalidate=300',
      },
    });
  } catch (error) {
    console.error('Could not read site visits:', error instanceof Error ? error.message : 'unknown database error');
    return NextResponse.json({ error: 'Visitor count is temporarily unavailable.' }, { status: 503, headers: noStore });
  }
}

export async function POST(request: Request) {
  if (!isSameOrigin(request) || request.headers.get('sec-fetch-site') === 'cross-site') {
    return NextResponse.json({ error: 'Invalid origin.' }, { status: 403, headers: noStore });
  }
  // Ignore page-view batches from tabs still running the previous deployment.
  if (request.headers.get('content-type')?.startsWith('application/json')) {
    return new NextResponse(null, { status: 204, headers: noStore });
  }
  const hostname = new URL(request.url).hostname;
  const userAgent = request.headers.get('user-agent') ?? '';
  if (process.env.NODE_ENV !== 'production' || process.env.VERCEL_ENV === 'preview'
    || ['localhost', '127.0.0.1', '[::1]'].includes(hostname)
    || /bot\b|crawler|spider|headless|slurp|facebookexternalhit/i.test(userAgent)
    || (request.headers.get('cookie')?.includes('arcwatch_admin=') && await isAdmin())) {
    return new NextResponse(null, { status: 204, headers: noStore });
  }

  try {
    const rows = await getSql().query('UPDATE arc_site_metrics SET total_visits = total_visits + 1, updated_at = now() WHERE id = 1 RETURNING (total_visits + total_page_views) AS "totalVisits"');
    return NextResponse.json(payload(rows[0]), { headers: noStore });
  } catch (error) {
    console.error('Could not record site visit:', error instanceof Error ? error.message : 'unknown database error');
    return NextResponse.json({ error: 'Visitor count is temporarily unavailable.' }, { status: 503, headers: noStore });
  }
}
