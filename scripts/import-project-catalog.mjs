import { readFile } from 'node:fs/promises';
import { neon } from '@neondatabase/serverless';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('DATABASE_URL is missing.');
  process.exit(1);
}

const dataFile = process.argv[2] ?? 'db/requested-projects-2026-10-09.json';
const catalog = JSON.parse(await readFile(dataFile, 'utf8'));
const sql = neon(databaseUrl);

const existingRows = await sql.query('select slug from ecosystem_projects');
const existingSlugs = new Set(existingRows.map((row) => row.slug));
const missingExisting = catalog.verifiedExistingSlugs.filter((slug) => !existingSlugs.has(slug));
if (missingExisting.length > 0) {
  throw new Error(`Expected existing projects are missing: ${missingExisting.join(', ')}`);
}

for (const slug of catalog.verifiedExistingSlugs) {
  await sql.query(
    'update ecosystem_projects set verified_on = $1::date, updated_at = now() where slug = $2',
    [catalog.reviewDate, slug],
  );
}

for (const project of catalog.projects) {
  await sql.query(
    `insert into ecosystem_projects (
      slug, name, symbol, handle, tagline_en, tagline_zh, description_en, description_zh,
      categories, status, products, website_url, x_url, token_address, source_urls,
      verified_on, sort_order, is_published, recommended, scorecard, score_reviewed_at
    ) values (
      $1, $2, $3, $4, $5, $6, $7, $8,
      $9::text[], $10, $11::jsonb, $12, $13, $14, $15::text[],
      $16::date, 100, true, false, $17::jsonb, $18::timestamptz
    )
    on conflict (slug) do update set
      name = excluded.name,
      symbol = excluded.symbol,
      handle = excluded.handle,
      tagline_en = excluded.tagline_en,
      tagline_zh = excluded.tagline_zh,
      description_en = excluded.description_en,
      description_zh = excluded.description_zh,
      categories = excluded.categories,
      status = excluded.status,
      products = excluded.products,
      website_url = excluded.website_url,
      x_url = excluded.x_url,
      token_address = excluded.token_address,
      tvl_usd = null,
      fees_24h_usd = null,
      volume_24h_usd = null,
      source_urls = excluded.source_urls,
      verified_on = excluded.verified_on,
      scorecard_history = case
        when ecosystem_projects.scorecard is not null
          and ecosystem_projects.scorecard is distinct from excluded.scorecard
        then ecosystem_projects.scorecard_history || jsonb_build_array(
          jsonb_build_object(
            'scorecard', ecosystem_projects.scorecard,
            'reviewedAt', ecosystem_projects.score_reviewed_at
          )
        )
        else ecosystem_projects.scorecard_history
      end,
      scorecard = excluded.scorecard,
      score_reviewed_at = excluded.score_reviewed_at,
      updated_at = now()`,
    [
      project.slug,
      project.name,
      project.symbol,
      project.handle,
      project.taglineEn,
      project.taglineZh,
      project.descriptionEn,
      project.descriptionZh,
      project.categories,
      project.status,
      JSON.stringify(project.products),
      project.website,
      project.x,
      project.tokenAddress,
      project.sources,
      catalog.reviewDate,
      JSON.stringify(project.scorecard),
      `${catalog.reviewDate}T00:00:00Z`,
    ],
  );

  await sql.query(
    `insert into project_risk_reviews (
      slug, priority, evidence_status, reason_en, reason_zh, sources, reviewed_on, import_key
    ) values ($1, $2, $3, $4, $5, $6::jsonb, $7::date, $8)
    on conflict (import_key) do update set
      priority = excluded.priority,
      evidence_status = excluded.evidence_status,
      reason_en = excluded.reason_en,
      reason_zh = excluded.reason_zh,
      sources = excluded.sources,
      reviewed_on = excluded.reviewed_on`,
    [
      project.slug,
      project.risk.priority,
      project.risk.evidenceStatus,
      project.risk.reasonEn,
      project.risk.reasonZh,
      JSON.stringify(project.risk.sources),
      catalog.reviewDate,
      `catalog-${catalog.reviewDate}-${project.slug}`,
    ],
  );

  if (project.update) {
    await sql.query(
      `insert into ecosystem_project_updates (
        project_id, title_en, title_zh, summary_en, summary_zh, source_url,
        published_at, is_published, update_kind
      ) select id, $2, $3, $4, $5, $6, $7::timestamptz, true, 'news'
        from ecosystem_projects where slug = $1
      on conflict (project_id, source_url) do update set
        title_en = excluded.title_en,
        title_zh = excluded.title_zh,
        summary_en = excluded.summary_en,
        summary_zh = excluded.summary_zh,
        published_at = excluded.published_at,
        updated_at = now()`,
      [
        project.slug,
        project.update.titleEn,
        project.update.titleZh,
        project.update.summaryEn,
        project.update.summaryZh,
        project.update.sourceUrl,
        project.update.publishedAt,
      ],
    );
  }
}

console.log(
  `Verified ${catalog.verifiedExistingSlugs.length} existing projects and imported ${catalog.projects.length} projects.`,
);
