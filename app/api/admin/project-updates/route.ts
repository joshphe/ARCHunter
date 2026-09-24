import { NextResponse } from 'next/server';
import { isAdmin, isSameOrigin } from '@/lib/admin-auth';
import { getSql } from '@/lib/db';
import { saveProjectUpdate } from '@/lib/projects-db';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  const slug = new URL(request.url).searchParams.get('slug');
  if (!slug) return NextResponse.json({ error: 'Project slug is required.' }, { status: 400 });
  try {
    const sql = getSql();
    const rows = await sql.query(`
      SELECT u.id, u.title_en AS "titleEn", u.title_zh AS "titleZh", u.summary_en AS "summaryEn",
        u.summary_zh AS "summaryZh", u.source_url AS "sourceUrl", u.published_at AS "publishedAt",
        u.is_published AS "isPublished"
      FROM ecosystem_project_updates u JOIN ecosystem_projects p ON p.id = u.project_id
      WHERE p.slug = $1 ORDER BY u.published_at DESC NULLS LAST, u.created_at DESC`, [slug]);
    return NextResponse.json(rows, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({ error: 'Could not load project updates.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: 'Request origin is not allowed.' }, { status: 403 });
  if (!(await isAdmin())) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  let update: Record<string, unknown>;
  try { update = await request.json(); } catch { return NextResponse.json({ error: 'Invalid request.' }, { status: 400 }); }
  const strings = ['slug', 'titleEn', 'titleZh', 'summaryEn', 'summaryZh', 'sourceUrl'] as const;
  if (strings.some((key) => typeof update[key] !== 'string') || typeof update.slug !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(update.slug)) {
    return NextResponse.json({ error: 'Project update fields are invalid.' }, { status: 400 });
  }
  try {
    const sourceUrl = new URL(update.sourceUrl as string);
    if (!['https:', 'http:'].includes(sourceUrl.protocol)) throw new Error();
  } catch { return NextResponse.json({ error: 'Source URL must be a valid HTTP(S) link.' }, { status: 400 }); }
  const publishedAt = update.publishedAt == null || update.publishedAt === '' ? null : String(update.publishedAt);
  if (publishedAt && Number.isNaN(Date.parse(publishedAt))) return NextResponse.json({ error: 'Invalid publication date.' }, { status: 400 });
  try {
    await saveProjectUpdate({
      slug: update.slug as string,
      titleEn: update.titleEn as string,
      titleZh: update.titleZh as string,
      summaryEn: update.summaryEn as string,
      summaryZh: update.summaryZh as string,
      sourceUrl: update.sourceUrl as string,
      publishedAt,
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Could not save project update.' }, { status: 500 });
  }
}
