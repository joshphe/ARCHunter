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

## Project on-chain activity

Project details include a manually triggered 7/30-day activity query. Business contracts are explicitly registered in `lib/project-activity-contracts.ts` with official attribution sources; currently Arclight's Arc vault and Foci's launch factory/router are covered. The other projects remain unconfigured for business usage. Token-contract calls are a separate opt-in scope, never a replacement for product usage.

The provider uses Arc Mainnet Blockscout (chain 5042). Optional server-only `BLOCKSCOUT_API_KEY` uses the documented PRO endpoint at `api.blockscout.com/5042`; without it, the public explorer API is attempted. Public access may be restricted. Configure the key in the hosting environment and redeploy; never use a `NEXT_PUBLIC_` prefix. No wallet, signing, transaction or automatic polling is involved.

Statistics count successful direct function calls, deduplicated by transaction hash across the listed contracts. Business scope excludes standard ERC-20 transfer/transferFrom/approve calls. Active addresses are transaction senders, not users. Multi-day returning ratio means senders active on at least two UTC dates in the selected rolling window. Internal calls, user operations, off-chain usage and undiscovered contracts are excluded. The most recent activity is the latest qualifying call observed within the last 30 days. Daily buckets use UTC and include partial boundary days. Seven-day comparison is against the preceding seven days and is omitted if the denominator is zero.

Queries are bounded to 20 pages per contract, at most three registered contracts and 22 seconds of provider time. Truncated/failed scans return explicitly partial lower bounds with no returning ratio or comparison. Complete means pagination covered the time window in the provider's index, not completeness of project coverage or index freshness. All-provider failures yield unknown metrics, never zero. Results are cached on demand for up to five minutes (failed/partial results 30 seconds), with an explicit snapshot timestamp.

Validation: `node --test tests/project-activity.test.cjs tests/project-risk.test.cjs`.
# Ecosystem city map

The eight building bands and five square parcel bands are defined in `lib/ecosystem-map-layout.ts`. USD boundaries include the lower bound and exclude the upper bound. Missing or invalid market caps remain unpriced, distinct from zero. Parcel side lengths are 64, 128, 256, 512 and 1024 (1:2:4:8:16); each larger plot has four times the area. Buildings sit within a landscaped square parcel.

Seven architectural families use distinct geometry and materials: terraced offices, gabled buildings with standing-seam metal roofs, courtyard buildings, round glass towers, twin towers, domed halls and sawtooth roofs. Smoked glass reflections, shaded concrete, recessed windows, thinner structural lines and rooftop services give the scene a contemporary architectural appearance. Each registered project has a fixed family; new project IDs receive a deterministic family. Market cap controls height and parcel scale without changing that identity. Style and building size do not indicate project safety or quality.

PROJECT_BLOCKS gives registered projects permanent clusters, mixing parcel sizes independently of category. Buddy allocation packs plots within each cluster; a 25% coordinate expansion inserts pedestrian and green space between parcels. A 112-unit corridor separates the blocks, with orthogonal streets, planting strips and a straight canal. New projects automatically receive parcels in additional clusters. Directory ordering does not affect allocation. No polling is added.

Logo pins use the directory avatar source with symbol fallback. Selecting a building opens its project card with market-cap source, timestamp, location action and profile link. Search and category/cap filters operate on the map. The side panel contains project search, filters and selected project details; architectural and parcel reference guides are omitted. Actual footprints use the five doubling sizes.

The map supports pointer dragging with mouse, touch or pen, wheel/scrollbar navigation and keyboard scrolling. A movement threshold separates clicks from drags; completed drags suppress project selection. Pointer capture keeps dragging active outside the viewport. Fit-to-map restores a view of the entire island.

Run `node --test tests/ecosystem-map.test.cjs` to check cap boundaries, parcel ratios and packing, non-overlap, road clearance, permanent cluster membership, deterministic allocation, maximum-tier capacity and all seven architectural families at every market-cap tier.
