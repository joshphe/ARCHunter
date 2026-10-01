import { getSql } from '@/lib/db';
import type { ProjectScorecard } from '@/lib/project-schema';

export type RugProject = {
  slug: string; name: string; symbol: string; handle: string;
  tokenAddress: string | null; website: string; x: string;
  reportedOn: string; incidentOn: string | null; classification: 'reported' | 'verified';
  reasonEn: string; reasonZh: string;
  evidence: Array<{ label: string; url: string }>;
  descriptionEn: string; descriptionZh: string;
  historicalScorecard: ProjectScorecard | null;
};

export async function listRugProjects(): Promise<RugProject[]> {
  const rows = await getSql().query(`SELECT slug, reported_on::text, incident_on::text, classification,
    reason_en, reason_zh, evidence, project_snapshot FROM rug_projects ORDER BY reported_on DESC, slug`);
  return rows.map(row => {
    const p = row.project_snapshot;
    return { slug: row.slug, name: p.name, symbol: p.symbol, handle: p.handle,
      tokenAddress: p.token_address, website: p.website_url, x: p.x_url,
      reportedOn: row.reported_on, incidentOn: row.incident_on, classification: row.classification,
      reasonEn: row.reason_en, reasonZh: row.reason_zh, evidence: row.evidence,
      descriptionEn: p.description_en, descriptionZh: p.description_zh,
      historicalScorecard: p.scorecard ?? null };
  });
}

export async function isRugProject(slug: string) {
  const rows = await getSql().query('SELECT slug FROM rug_projects WHERE slug=$1', [slug]);
  return rows.length > 0;
}

export async function archiveRugProject(slug: string, reasonEn: string, reasonZh: string) {
  const rows = await getSql().query(`WITH original AS (
    SELECT * FROM ecosystem_projects WHERE slug=$1 FOR UPDATE
  ), archived AS (
    INSERT INTO rug_projects(slug,reported_on,classification,reason_en,reason_zh,project_snapshot,updates_snapshot)
    SELECT p.slug,(now() AT TIME ZONE 'Asia/Shanghai')::date,'reported',$2,$3,to_jsonb(p),
      COALESCE((SELECT jsonb_agg(to_jsonb(u) ORDER BY u.created_at) FROM ecosystem_project_updates u WHERE u.project_id=p.id),'[]'::jsonb)
    FROM original p ON CONFLICT(slug) DO NOTHING RETURNING slug
  )
  UPDATE ecosystem_projects SET is_published=false,recommended=false,updated_at=now()
  WHERE slug IN (SELECT slug FROM archived) OR slug IN (SELECT slug FROM rug_projects WHERE slug=$1)
  RETURNING slug`, [slug, reasonEn, reasonZh]);
  if (!rows.length) throw new Error('Project not found.');
}
