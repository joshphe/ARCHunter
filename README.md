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

## Public page views

Apply `009_site_page_views.sql` with the existing migration runner and `DATABASE_URL_UNPOOLED` before deploying:

```bash
vercel env run -- npm run db:migrate -- 009_site_page_views.sql
```

The sidebar shows **Total page views / 累计浏览**, calculated as legacy `total_visits` plus new `total_page_views`. Both counters remain separate in storage, so historical visits are included once without modifying either counter. The tooltip explains that the total includes historical visits and that the new page-view definition starts at `page_views_started_at`. A visible public page load, reload, a change to another workspace, or opening a project profile adds one new view. Repeated selection of the current workspace, filters, search, directory pagination, language/theme changes and map interactions do not. Back/forward navigation between profiles and restored browser pages count as views. This total combines historical session counts with subsequent page views and does not represent unique visitors.

The client coalesces events for 750 ms and sends up to 20 at once. A bounded retry queue survives document navigation within the tab. Requests and unload beacons reuse event UUIDs, so retries and duplicate React effects cannot increment twice. An atomic insert-and-increment query deduplicates across server instances. Event IDs expire after seven days (pruned in indexed batches of up to 200 per recording), while submissions expire after 24 hours. No IP, persistent visitor identity, full URL, search text, referrer or per-workspace analytics are stored. Failed reads show unknown rather than zero.

Local development, Vercel preview deployments, authenticated administrator traffic and recognizable crawler user agents are excluded from recording. Server-side origin and event validation provide basic filtering, not proof of a unique human. The public total is CDN-cached for 60 seconds and may serve a stale snapshot for up to another 120 seconds, while successful recordings return the latest total. Recording is asynchronous and never blocks navigation. No extra analytics service or environment secret is required.

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

Apply `007_stable_map_slots.sql` before deploying this version:

```bash
vercel env run -- npm run db:migrate -- 007_stable_map_slots.sql
```

Use `DATABASE_URL_UNPOOLED` for migrations. The migration adds an immutable `map_slot` address, retains the original 14 project reservations, and assigns new records an automatic address. Slots are never compacted when projects are hidden or removed. Existing admin edits preserve their address without consuming new sequence values.

Project land is now fixed independently of live market cap. Original neighborhoods retain mixed parcel sizes; additional neighborhoods use fixed medium parcels with pedestrian gaps. Missing members retain reserved land. Market cap controls the eight building height bands; architecture identity stays unchanged. Missing market cap remains unknown rather than zero. Building height and size do not indicate safety or quality.

Seven architectural families use distinct geometry and materials. Decorative civic landmarks occupy parks and waterfront space and never represent projects. Logo billboards use the directory avatar source with symbol fallback. Search and category/cap filters operate on the map; clicking a project opens its details panel.

Shared landscape components add layered broadleaf, cypress, flowering and palm trees, raised shrub and flower beds, wooden benches and shaded pergolas. Vacant parcels contain orthogonal garden paths; street and waterfront planting stays outside project footprints. Decorative placement is deterministic and introduces no animation or polling.

Pointer dragging pans the map; the wheel zooms around the cursor with hidden scrollbars. Fit-to-map restores the entire island. The current tab remembers zoom, island-relative camera position, selected project, filters and panel state. Map profile links include `from=map`; their detail page offers a return-to-map link. Saved state restores across workspace changes, browser back and reloads in the same tab; it does not require a user account.

## Public loading and query shape

The overview, launchpad pulse and network activity modules fetch and render independently, each with its own timeout and retry state. Failed refreshes retain the previous snapshot. Unmounting cancels active requests.

`/api/ecosystem-projects` returns `ProjectSummary` records from one query: display/search fields, observation totals, latest risk summary and at most three published news updates per project. Full descriptions, products, scoring notes and review histories are fetched only by the full project/admin routes. Directory search covers names, handles, symbols, contracts, categories and bilingual taglines. The detail metrics endpoint reads only the published project's token address before calling the market provider.

## Network usage data

The overview uses Arc Mainnet Blockscout's public Stats service at `https://explorer.arc.io/stats-service/api/v1/lines` without an API key. Daily series are `newTxns`, `activeAccounts`, `newContracts` and `txnsFee`; fee units are validated as USDC. Arcscan was replaced after its public API returned Cloudflare 530 / 1033.

All requests run concurrently with a seven-second provider timeout and a five-minute cache. Partial failures preserve available series, and each card selects its own latest complete UTC day. Incomplete/current-day points remain in the trend but never become headline values. The provider does not expose computation time or index height in these chart responses: the UI labels request time as Fetched and leaves those unknown metadata fields unset.

## Cross-chain capital radar

The capital workspace provides an ARC-centered network, chain brand marks, stable node slots, a network/trend toggle, fullscreen, direction filters, chain inspection and 24H/7D windows. A selected chain filters its trend and transfer ledger. Records have ten rows per page, amount/recent sorting and explorer proofs. Themes, keyboard focus and reduced-motion preferences are supported. Offscreen and hidden-tab animations stop. Demo values require an explicit Preview action and retain a visible demo label.

### Free collection and storage

- Apply `db/migrations/008_cctp_capital_flows.sql` with the existing migration runner and a direct runtime connection. No credentials belong in the repository.
- `arc_cctp_transfers` stores verified USDC principal, deduplicated by transaction hash and log index. Only newly inserted events contribute to persistent hourly rollups in `arc_cctp_hourly`.
- `arc_cctp_scan_ranges` records scanned block/time bounds, including verified empty ranges. Interrupted backfills skip saved ranges on the next pass. Adjacent ranges determine actual contiguous coverage; data beyond a gap cannot silently appear as complete coverage.
- `arc_cctp_collector_state` holds a database lease, cooldown and progress, shared by all function instances. Read responses use aggregates and a few proofs; they never download the full ledger.
- The official free Arc mainnet RPC (`https://rpc.mainnet.arc.io`, chain 5042) is queried in 10,000-block ranges, with log requests paced at least 1.1 seconds apart. The last 20 blocks are excluded from persisted scans. No paid API, subscription, additional database or user account is required.
- A single Hobby-compatible daily cron (`17 1 * * *`, UTC; scheduling precision depends on Vercel) invokes `/api/cron/capital-flows`. Configure `CRON_SECRET` as a Vercel production Secret; authorization is required and fails closed when it is missing. Each invocation has a bounded 240-second work budget inside a 300-second function limit.
- `/api/capital/flows` returns saved results first. `after()` can run a bounded incremental catch-up behind the database lease. Partial initial history resumes server-side; browser polling only reads saved progress. Completed collection has a five-minute cooldown, with a shorter cooldown while backfilling. The daily job runs independently of open pages. Freshness therefore depends on the daily job and traffic-driven catch-ups; this is not a real-time feed or a minute-level cron.
- `/api/admin/capital/collect` supports owner-authorized POST backfill. For initial local collection, start the development server with Vercel runtime environment variables, then run `vercel env run -- npm run capital:backfill`. The script signs a short-lived admin cookie in memory and calls localhost only. It never writes or prints secrets.

### Measurement

Outflows are USDC `DepositForBurn` events from Circle's published local TokenMessengers. Inflows pair `MessageReceived` with an actual USDC `MintAndWithdraw` in the same transaction, matching recipient and gross amount (recipient amount plus mint fee). This supports non-EVM origins without inferred sender addresses. Amounts use six USDC decimals and represent gross principal. Inflow uses Arc execution time; outflow uses Arc burn time, so pending transfers can fall in different windows.

Snapshots include UTC bounds, block bounds, excluded-event count, coverage percentage, freshness, daily/hourly trends and recent transaction proofs. Unknown intervals remain blank, not zero. A stale snapshot or incomplete scan is labeled explicitly. Gateway, non-CCTP bridges, direct issuer mint/redemptions, exchange wallet movements and same-chain transfers are excluded. Particle motion expresses aggregate direction, not per-transaction playback.

Sources: https://developers.circle.com/cctp/references/contract-addresses ; https://developers.circle.com/cctp/concepts/supported-chains-and-domains ; https://github.com/circlefin/evm-cctp-contracts/tree/master/src/messages/v2 . Chain marks are mirrored from DefiLlama's public icon CDN; unsupported marks retain text fallbacks.
