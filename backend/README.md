# TuyDui backend

Independent Node 24 HTTP API. Install from repository root with `npm ci`.
Copy `.env.example` to `backend/.env.local` and set approved staging configuration.
`SUPABASE_URL` and `SUPABASE_ANON_KEY` are required for caller-token RLS access.
AI provider credentials stay server-side. The request path does not use service-role keys.

```sh
npm run dev:backend
npm run build --workspace backend
npm run start:backend
npm run check --workspace backend
npm run test --workspace backend
```

Default bind: `0.0.0.0:4000` (HOST/PORT configurable). Health is public; AI status,
processing and workspace endpoints require a validated bearer token. Owner/accepted
editor can process/save; viewers can read project workspaces.

- [Exact API/Supabase contract](../docs/API_CONTRACT.md)
- [Staging/deployment/rollback](../docs/DEPLOYMENT_RUNBOOK.md)
- [Credential rotation and owner actions](../docs/OWNER_ACTIONS.md)

Migrations `001`–`008` are reviewed SQL changes, never run at server startup.
Legacy `db:*` scripts do not apply the whole ordered ledger; do not blindly run them
on a shared/production database. PDFs use private Supabase Storage plus a durable
manifest. Workspace revisions, baseline snapshots and AI quota reservations use
PostgreSQL. Local `data/ai-usage.jsonl` is diagnostic only, not quota/billing truth.
The unused legacy BrowserProjectStore is retained for source compatibility; production
workspace routes use the caller-authorized database repository.

Docker build: `docker build -f backend/Dockerfile -t tuydui-backend .` from root.
The image is a deployment option, not evidence that a backend host exists or was deployed.
