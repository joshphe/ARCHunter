import { NextResponse } from 'next/server';
import { isAdmin, isSameOrigin } from '@/lib/admin-auth';
import { getSql } from '@/lib/db';
import { validateRiskReview } from '@/lib/project-risk';

export async function POST(request: Request) {
 if (!isSameOrigin(request)) return NextResponse.json({ error: 'Invalid origin.' }, { status: 403 });
 if (!(await isAdmin())) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
 let body: unknown;
 try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 }); }
 if (!validateRiskReview(body)) return NextResponse.json({ error: 'Provide a valid classification, date, bilingual reasons and HTTP(S) evidence sources.' }, { status: 400 });
 try {
  const rows = await getSql().query(`INSERT INTO project_risk_reviews(slug,priority,evidence_status,reason_en,reason_zh,sources,reviewed_on)
   SELECT slug,$2,$3,$4,$5,$6::jsonb,$7::date FROM ecosystem_projects p WHERE slug=$1 AND NOT EXISTS(SELECT 1 FROM rug_projects r WHERE r.slug=p.slug) RETURNING id`,
   [body.slug,body.priority,body.evidenceStatus,body.reasonEn.trim(),body.reasonZh.trim(),JSON.stringify(body.sources),body.reviewedOn]);
  if (!rows.length) return NextResponse.json({ error: 'Project is missing or archived.' }, { status: 409 });
  return NextResponse.json({ ok: true });
 } catch { return NextResponse.json({ error: 'Could not save review.' }, { status: 500 }); }
}
