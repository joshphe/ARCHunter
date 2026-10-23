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

## Public site visits

Apply `009_site_page_views.sql` with the existing migration runner and `DATABASE_URL_UNPOOLED` before deploying:

```bash
vercel env run -- npm run db:migrate -- 009_site_page_views.sql
```

The sidebar shows **Total visits / 累计访问**. The first public page opened in a browser tab session counts once. Refreshes, workspace changes and project navigation in the same session do not increment it again. Administrator pages are excluded, and directly opening a project profile can count the initial visit. A per-tab session marker survives reloads and navigation. A shared in-flight promise prevents route changes and React effect replays from issuing another request in the same document. If browser session storage is unavailable, only the total is read.

Each counted session uses one atomic increment of `total_visits`. The previously accumulated `total_page_views` remains a fixed historical component in the displayed sum, so restoring session counting does not reset the total. The prior page-view queue, batching timer, unload beacons and workspace tracking are disabled. JSON page-view batches from tabs still running the previous deployment are acknowledged without a database write. Historical migration files and data are retained, and no new event records or per-workspace analytics are written.

Local development, Vercel preview deployments, authenticated administrator traffic and recognizable crawler user agents are excluded from recording. Same-origin validation provides basic filtering, not proof of a unique human. Public reads retain the five-minute browser/CDN cache, with up to another five minutes of stale CDN serving during revalidation. The tab remembers the highest total it has seen to avoid a cached read lowering the displayed number after a reload. Recording is asynchronous and does not block navigation. No extra analytics service or environment secret is required.

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

## Wallet lookup

`/?view=wallet` calls the same-origin `/api/wallet?address=0x…&range=7d|30d|90d|all` route. The browser never calls the authenticated Blockscout gateway or receives an API key. Set `BLOCKSCOUT_API_KEY` as a server-only Vercel environment variable for each environment that needs history. Blockscout's free Pro API key is supported with Bearer authentication. A Production-only Secret is not automatically available during local development.

The current USDC balance uses the official Arc mainnet RPC and the six-decimal ERC-20 `balanceOf` interface at `0x3600000000000000000000000000000000000000`. It represents the same funds as native USDC, never an additional balance. Blockscout's native balance is a fallback if RPC fails. Missing balances remain unknown. Outgoing mined transactions and ERC-20 USDC transfers are scanned independently and stop when pagination reaches the requested time boundary. Scans are bounded to ten transaction pages, eight transfer pages and 18 seconds of history time. Missing/failed history remains unknown, and partial scans are explicitly labeled as observed records. ERC-20 transfer totals do not represent every native-USDC balance change.

Identical concurrent requests share one task in each server instance. Completed lookups are cached in memory for 60 seconds, incomplete ones for 15 seconds, with at most 100 cache entries and four concurrent lookups per instance. Blockscout requests are paced at least 350 ms apart per instance. There are no database reads or writes, automatic polling, payment requests or extra infrastructure. The client cancels obsolete queries so late responses cannot overwrite the current address or range.

### Token holdings and trade P&L

The wallet workspace loads `/api/wallet/portfolio?address=…&includePrices=0` before requesting quotes with `includePrices=1`. Discovery reads at most four pages / 200 ERC-20 holdings from Blockscout. USDC uses RPC, with the indexed six-decimal balance as fallback, and appears once. Other balances are indexed snapshots; protocol positions, NFTs and tokens absent from the index are outside coverage. A complete list means pagination was exhausted, not a guarantee that the index has caught up to the chain.

Quotes reuse the DEX Screener adapter in batches of 30; wallet requests never call the optional authenticated OKX APIs. Quotes are cached for five minutes, with an eight-second batch-scheduling budget. Assets without quotes, or with less than $5,000 of reported pool liquidity, stay visible but are excluded from the priced subtotal. Values are indicative, not executable sale quotes; USDC is explicitly valued at a $1 reference. Project association uses the existing public directory, without a new wallet query to Neon.

`/api/wallet/pnl?address=…&token=…&range=7d|30d|90d|all` is only requested after selecting Analyze P&L. The UI offers listed project tokens, including already-sold tokens. Analysis always reads back toward acquisition, regardless of the date filter: at most 20 token-transfer pages and the latest 40 related transactions, under a 24-second provider deadline. The balance and token decimals are pinned to one RPC block. Related receipts and transactions are fetched in bounded batches; event ordering uses block/log index rather than timestamps. These server-only requests share the wallet concurrency gate and bounded cache. Analysis snapshots are cached for two minutes (30 seconds when incomplete), independent of the range filter. Wallet endpoints do not persist addresses, transactions or analyses in Neon.

The first adapter recognizes simple wallet-initiated Uniswap v2/v3-compatible token/USDC swaps. It verifies the pool's token0/token1, the swap direction, wallet transfer deltas and receipt status. Multi-swap routes, other wallet assets, unverified pools, launchpad bonding curves and relayed activity remain unclassified. USDC consideration is computed from Arc's 18-decimal native system Transfer emitter only, never added to the duplicate six-decimal ERC-20 logs; receipts without the native stream are not inferred from opposing transfers. Gas is separate, from receipt gasUsed × effectiveGasPrice. See [Arc indexing rules](https://docs.arc.io/integrate/infrastructure/indexing-events) and the [Uniswap v2](https://github.com/Uniswap/v2-core/blob/master/contracts/interfaces/IUniswapV2Pair.sol) / [v3](https://github.com/Uniswap/v3-core/blob/main/contracts/interfaces/pool/IUniswapV3PoolEvents.sol) events.

Acquisition cost uses moving weighted average with integer native-USDC accounting. Transfers in have unknown cost, direct transfers out carry cost away without realizing a sale, and unknown cost stays unknown until the position is emptied. Partial history starts with an inferred opening quantity of unknown cost. Current basis/unrealized P&L is withheld if recorded movements do not reconcile to the RPC balance. Realized P&L follows the selected date range; unrealized P&L describes current holdings. A combined total is only shown for all available history with known costs, verified interactions and fees. It deducts verified swap Gas once; it describes the verified wallet trades within this coverage. The UI labels missing history, unrecognized interactions and unpriced assets instead of treating them as zero.

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
