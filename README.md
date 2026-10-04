# ARC Watch

Public dashboard for ARC protocol metrics and a curated project directory.

## Run locally

```bash
npm install
npm run dev
```

Project directory data is read from Neon. Configure `DATABASE_URL`, `ADMIN_PASSWORD`, and `ADMIN_SESSION_SECRET` as server-only Vercel environment variables. Do not add their values to source files or client-side `NEXT_PUBLIC_` variables. For local development, run the app or migration with Vercel's environment runner so secrets do not need to be copied into the repository.

Token market data is fetched server-side from DEX Screener and refreshed every five minutes. To enrich it with OKX holder counts and total network fees, optionally configure `OKX_API_KEY`, `OKX_SECRET_KEY`, `OKX_API_PASSPHRASE`, and `OKX_PROJECT_ID`. Arc defaults to OKX chain index `5042`; override it with `OKX_ARC_CHAIN_INDEX` if OKX changes the index.

Arc stablecoin supply history uses DeFiLlama’s public Stablecoins API without an API key. The capital workspace presents changes in reported USD-pegged stablecoin supply as a trend indicator; this does not identify bridge inflows or outflows. Requests are cached for 30 minutes.

After linking the repository to the Vercel project and configuring its environment variables, initialize the database with:

```bash
vercel env run -- npm run db:migrate
vercel env run -- npm run db:migrate:scores
vercel env run -- npm run db:migrate:score-history
vercel env run -- npm run db:migrate:site-visits
```

The migration creates the project directory and project updates tables and imports the existing Vort and KAIRO entries. It can be re-run safely.

When `DATABASE_URL` is unavailable, the public directory falls back to the bundled KAIRO profile. Vort has been removed from that fallback because it is archived. The admin area still requires the database.

## Rug archive

Apply `004_rug_projects.sql` before deploying the Rug workspace. `/?view=rug` reads the independent archive via `/api/rug-projects`. A database error is shown as an error, not an empty archive.

In `/admin`, select an existing project and expand “移入 Rug 档案”. Supply both incident descriptions, then archive it. This stores its complete project row and updates as immutable initial snapshots, removes publication and recommendation flags, and classifies the record as a user report pending independent verification. Repeated submissions preserve the first snapshot. The archive table can hold a verified classification, incident date and evidence links when supporting material is established; the intake action never claims independent verification automatically.

Public project queries and token lists exclude archived records even if a stale editor attempts to republish one. The admin save endpoint also refuses archived projects. Historical scores in the archive are labeled as historical, not current recommendations. Existing archived project URLs redirect to the archive.

## Project management

Open `/admin` and sign in with the administrator password configured for the deployment. Project records are stored in `ecosystem_projects`; project announcements and source links are stored in `ecosystem_project_updates`. The public directory only returns published records.

The `arc-project-intake` Codex skill gathers and checks project details from official sources, then prepares project metadata and recent updates for the authenticated admin workflow.

## Deploy

Vercel deploys the connected GitHub branch using the default Next.js build settings. Environment-variable changes apply to new deployments.

### Structured risk reviews

Apply `db/migrations/005_project_risk_reviews.sql` before deploying this version. `project_risk_reviews` stores append-only bilingual findings, priority, evidence status, source URLs and review dates; the latest saved record is current. Admin risk reviews save separately from project descriptions and observation scores. Existing editorial risk updates can be retained with `update_kind=risk` while news remains separate.

Directory filters, contract search, sort and page are stored in the URL and restored within the browser session, including scroll position after opening a project. Market cap and protocol TVL have separate columns and sorting; no automatic market refresh is enabled.

Validation: `node --test tests/project-risk.test.cjs`.
