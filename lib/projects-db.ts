import type { EcosystemProject } from '@/lib/project-schema';
import { getSql } from '@/lib/db';

const projectSelect = `
  SELECT slug, name, symbol, handle, tagline_en AS "taglineEn", tagline_zh AS "taglineZh",
    description_en AS "descriptionEn", description_zh AS "descriptionZh", categories, status,
    products, tvl_usd AS "tvlUsd", fees_24h_usd AS "fees24hUsd", volume_24h_usd AS "volume24hUsd",
    token_address AS "tokenAddress", website_url AS website, x_url AS x, source_urls AS "sourceUrls",
    verified_on AS "verifiedOn", recommended, is_published AS "isPublished",
    recommendation_reason_en AS "recommendationReasonEn", recommendation_reason_zh AS "recommendationReasonZh"
  FROM ecosystem_projects`;

export async function listProjects(publishedOnly = true): Promise<EcosystemProject[]> {
  const sql = getSql();
  const [rows, updateRows, scoreRows] = await Promise.all([
    sql.query(`${projectSelect} ${publishedOnly ? 'WHERE is_published = true AND NOT EXISTS (SELECT 1 FROM rug_projects r WHERE r.slug=ecosystem_projects.slug)' : ''} ORDER BY recommended DESC, sort_order ASC, name ASC`),
    sql.query(`
    SELECT p.slug, u.title_en AS "titleEn", u.title_zh AS "titleZh", u.summary_en AS "summaryEn",
      u.summary_zh AS "summaryZh", u.source_url AS "sourceUrl", u.published_at AS "publishedAt"
    FROM ecosystem_project_updates u
    JOIN ecosystem_projects p ON p.id = u.project_id
    WHERE u.is_published = true ${publishedOnly ? 'AND p.is_published = true AND NOT EXISTS (SELECT 1 FROM rug_projects r WHERE r.slug=p.slug)' : ''}
    ORDER BY p.slug, u.published_at DESC NULLS LAST, u.created_at DESC`),
    sql.query(`SELECT slug, scorecard, score_reviewed_at AS "scoreReviewedAt", scorecard_history AS "scoreHistory" FROM ecosystem_projects ${publishedOnly ? 'WHERE is_published = true AND NOT EXISTS (SELECT 1 FROM rug_projects r WHERE r.slug=ecosystem_projects.slug)' : ''}`).catch(() => []),
  ]);
  const scoresBySlug = new Map((scoreRows as Array<Record<string, unknown>>).map((row) => [String(row.slug), row]));
  const updatesBySlug = new Map<string, EcosystemProject['updates']>();
  for (const update of updateRows as Array<Record<string, unknown>>) {
    const slug = String(update.slug);
    const current = updatesBySlug.get(slug) ?? [];
    if (current.length < 3) current.push({
      titleEn: String(update.titleEn), titleZh: String(update.titleZh ?? ''),
      summaryEn: String(update.summaryEn), summaryZh: String(update.summaryZh ?? ''),
      sourceUrl: String(update.sourceUrl),
      publishedAt: update.publishedAt instanceof Date ? update.publishedAt.toISOString() : update.publishedAt == null ? null : String(update.publishedAt),
    });
    updatesBySlug.set(slug, current);
  }
  return (rows as Array<Record<string, unknown>>).map((row) => mapProject(row, updatesBySlug.get(String(row.slug)) ?? [], scoresBySlug.get(String(row.slug))));
}

function mapProject(row: Record<string, unknown>, updates: EcosystemProject['updates'], scoreRow?: Record<string, unknown>): EcosystemProject {
  const reviewedAt = scoreRow?.scoreReviewedAt;
  return {
    slug: String(row.slug), name: String(row.name), symbol: String(row.symbol), handle: String(row.handle),
    tagline: String(row.taglineEn), taglineZh: String(row.taglineZh ?? ''),
    description: { en: String(row.descriptionEn), zh: String(row.descriptionZh ?? '') },
    categories: row.categories as string[], status: row.status as EcosystemProject['status'],
    products: row.products as EcosystemProject['products'],
    tvl: row.tvlUsd == null ? null : Number(row.tvlUsd),
    fees24h: row.fees24hUsd == null ? null : Number(row.fees24hUsd),
    volume24h: row.volume24hUsd == null ? null : Number(row.volume24hUsd),
    tokenAddress: row.tokenAddress == null ? null : String(row.tokenAddress), tokenMetrics: null,
    website: String(row.website), x: String(row.x), sourceUrls: row.sourceUrls as string[],
    verifiedOn: row.verifiedOn instanceof Date ? row.verifiedOn.toISOString().slice(0, 10) : String(row.verifiedOn),
    recommended: Boolean(row.recommended),
    recommendationReason: row.recommendationReasonEn || row.recommendationReasonZh
      ? { en: String(row.recommendationReasonEn ?? ''), zh: String(row.recommendationReasonZh ?? '') }
      : null,
    isPublished: Boolean(row.isPublished), updates, scorecard: scoreRow?.scorecard as EcosystemProject['scorecard'] ?? null,
    scoreReviewedAt: reviewedAt instanceof Date ? reviewedAt.toISOString() : reviewedAt == null ? null : String(reviewedAt),
    scoreHistory: Array.isArray(scoreRow?.scoreHistory) ? scoreRow.scoreHistory as EcosystemProject['scoreHistory'] : [],
  };
}

export async function getProjectBySlug(slug: string, publishedOnly = true): Promise<EcosystemProject | null> {
  const sql = getSql();
  const [rows, updateRows, scoreRows] = await Promise.all([
    sql.query(`${projectSelect} WHERE slug = $1 ${publishedOnly ? 'AND is_published = true AND NOT EXISTS (SELECT 1 FROM rug_projects r WHERE r.slug=ecosystem_projects.slug)' : ''}`, [slug]),
    sql.query(`
      SELECT u.title_en AS "titleEn", u.title_zh AS "titleZh", u.summary_en AS "summaryEn",
        u.summary_zh AS "summaryZh", u.source_url AS "sourceUrl", u.published_at AS "publishedAt"
      FROM ecosystem_project_updates u JOIN ecosystem_projects p ON p.id = u.project_id
      WHERE p.slug = $1 AND u.is_published = true ${publishedOnly ? 'AND p.is_published = true AND NOT EXISTS (SELECT 1 FROM rug_projects r WHERE r.slug=p.slug)' : ''}
      ORDER BY u.published_at DESC NULLS LAST, u.created_at DESC LIMIT 3`, [slug]),
    sql.query('SELECT scorecard, score_reviewed_at AS "scoreReviewedAt", scorecard_history AS "scoreHistory" FROM ecosystem_projects WHERE slug = $1', [slug]).catch(() => []),
  ]);
  const projectRows = rows as Array<Record<string, unknown>>;
  if (!projectRows[0]) return null;
  const updates = (updateRows as Array<Record<string, unknown>>).map((item) => ({
    titleEn: String(item.titleEn), titleZh: String(item.titleZh ?? ''),
    summaryEn: String(item.summaryEn), summaryZh: String(item.summaryZh ?? ''), sourceUrl: String(item.sourceUrl),
    publishedAt: item.publishedAt instanceof Date ? item.publishedAt.toISOString() : item.publishedAt == null ? null : String(item.publishedAt),
  }));
  const scores = scoreRows as Array<Record<string, unknown>>;
  return mapProject(projectRows[0], updates, scores[0]);
}

export async function listPublishedTokenAddresses(): Promise<string[]> {
  const sql = getSql();
  const rows = await sql.query('SELECT lower(token_address) AS address FROM ecosystem_projects WHERE is_published = true AND token_address IS NOT NULL AND NOT EXISTS (SELECT 1 FROM rug_projects r WHERE r.slug=ecosystem_projects.slug)') as Array<Record<string, unknown>>;
  return rows.map((row) => String(row.address));
}

export async function saveProject(project: import('@/lib/project-schema').ProjectInput) {
  const sql = getSql();
  const description = project.description;
  await sql.query(
    `INSERT INTO ecosystem_projects (
      slug, name, symbol, handle, tagline_en, tagline_zh, description_en, description_zh,
      categories, status, products, website_url, x_url, token_address, tvl_usd,
      fees_24h_usd, volume_24h_usd, source_urls, verified_on, recommended,
      recommendation_reason_en, recommendation_reason_zh, is_published, updated_at
    ) VALUES (
      $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,now()
    ) ON CONFLICT (slug) DO UPDATE SET
      name=EXCLUDED.name, symbol=EXCLUDED.symbol, handle=EXCLUDED.handle, tagline_en=EXCLUDED.tagline_en,
      tagline_zh=EXCLUDED.tagline_zh, description_en=EXCLUDED.description_en, description_zh=EXCLUDED.description_zh,
      categories=EXCLUDED.categories, status=EXCLUDED.status, products=EXCLUDED.products,
      website_url=EXCLUDED.website_url, x_url=EXCLUDED.x_url, token_address=EXCLUDED.token_address,
      tvl_usd=EXCLUDED.tvl_usd, fees_24h_usd=EXCLUDED.fees_24h_usd, volume_24h_usd=EXCLUDED.volume_24h_usd,
      source_urls=EXCLUDED.source_urls, verified_on=EXCLUDED.verified_on, recommended=EXCLUDED.recommended,
      recommendation_reason_en=EXCLUDED.recommendation_reason_en,
      recommendation_reason_zh=EXCLUDED.recommendation_reason_zh, is_published=EXCLUDED.is_published,
      updated_at=now()` ,
    [
      project.slug, project.name, project.symbol, project.handle, project.tagline, project.taglineZh ?? '',
      description.en, description.zh, project.categories, project.status, JSON.stringify(project.products),
      project.website, project.x, project.tokenAddress, project.tvl, project.fees24h, project.volume24h,
      project.sourceUrls ?? [], project.verifiedOn ?? new Date().toISOString().slice(0, 10),
      project.recommended ?? false, project.recommendationReason?.en ?? null,
      project.recommendationReason?.zh ?? null, project.isPublished ?? true,
    ],
  );
  if (project.scorecard) {
    await sql.query(`UPDATE ecosystem_projects
      SET scorecard_history = CASE
            WHEN scorecard IS NOT NULL AND scorecard IS DISTINCT FROM $2::jsonb
              THEN COALESCE(scorecard_history, '[]'::jsonb) || jsonb_build_array(jsonb_build_object(
                'reviewedAt', COALESCE(score_reviewed_at, updated_at), 'scorecard', scorecard))
            ELSE COALESCE(scorecard_history, '[]'::jsonb)
          END,
          score_reviewed_at = CASE
            WHEN scorecard IS DISTINCT FROM $2::jsonb THEN now()
            ELSE COALESCE(score_reviewed_at, updated_at)
          END,
          scorecard = $2::jsonb, updated_at = now()
      WHERE slug = $1`, [project.slug, JSON.stringify(project.scorecard)]);
  }
}

export type ProjectUpdateInput = {
  slug: string;
  titleEn: string;
  titleZh: string;
  summaryEn: string;
  summaryZh: string;
  sourceUrl: string;
  publishedAt: string | null;
};

export async function saveProjectUpdate(update: ProjectUpdateInput) {
  const sql = getSql();
  const projects = await sql.query('SELECT id FROM ecosystem_projects WHERE slug = $1', [update.slug]);
  const project = (projects as Array<{ id: string }>)[0];
  if (!project) throw new Error('Project does not exist.');
  await sql.query(
    `INSERT INTO ecosystem_project_updates (
      project_id, title_en, title_zh, summary_en, summary_zh, source_url, published_at, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7::timestamptz, now())
    ON CONFLICT (project_id, source_url) DO UPDATE SET
      title_en=EXCLUDED.title_en, title_zh=EXCLUDED.title_zh, summary_en=EXCLUDED.summary_en,
      summary_zh=EXCLUDED.summary_zh, published_at=EXCLUDED.published_at, is_published=true, updated_at=now()`,
    [project.id, update.titleEn, update.titleZh, update.summaryEn, update.summaryZh, update.sourceUrl, update.publishedAt],
  );
}
