# ARC Watch

Public dashboard for ARC protocol metrics and a curated project directory.

## Run locally

```bash
npm install
npm run dev
```

Project directory data is read from Neon. Configure `DATABASE_URL`, `ADMIN_PASSWORD`, and `ADMIN_SESSION_SECRET` as server-only Vercel environment variables. Do not add their values to source files or client-side `NEXT_PUBLIC_` variables. For local development, run the app or migration with Vercel's environment runner so secrets do not need to be copied into the repository.

Token market data is fetched server-side from DEX Screener and refreshed every five minutes. To enrich it with OKX holder counts and total network fees, optionally configure `OKX_API_KEY`, `OKX_SECRET_KEY`, `OKX_API_PASSPHRASE`, and `OKX_PROJECT_ID`. Arc defaults to OKX chain index `5042`; override it with `OKX_ARC_CHAIN_INDEX` if OKX changes the index.

After linking the repository to the Vercel project and configuring its environment variables, initialize the database with:

```bash
vercel env run -- npm run db:migrate
```

The migration creates the project directory and project updates tables and imports the existing Vort and KAIRO entries. It can be re-run safely.

When `DATABASE_URL` is unavailable, the public directory falls back to the bundled Vort and KAIRO profiles so local previews remain usable. The admin area still requires the database.

## Project management

Open `/admin` and sign in with the administrator password configured for the deployment. Project records are stored in `ecosystem_projects`; project announcements and source links are stored in `ecosystem_project_updates`. The public directory only returns published records.

The `arc-project-intake` Codex skill gathers and checks project details from official sources, then prepares project metadata and recent updates for the authenticated admin workflow.

## Deploy

Vercel deploys the connected GitHub branch using the default Next.js build settings. Environment-variable changes apply to new deployments.
