# TuyDui — split frontend/backend baseline

This branch prepares frontend redesign work without redesigning the interface or
changing production. Candidate canonical branch: `integration/frontend-handoff-2026-11-01`,
based on split commit `50c5e85684750a1c94a7ab1140703108c26891ef`.
Team adoption, live staging acceptance and credential rotation remain release gates.

## Start here

- [Frontend handoff](docs/FRONTEND_HANDOFF.md): clone, environment names, commands, edit boundaries and PR workflow.
- [API/Supabase contract](docs/API_CONTRACT.md): bearer auth, project access, stable schemas and state persistence.
- [Deployment and rollback](docs/DEPLOYMENT_RUNBOOK.md): isolated staging, migrations, hosting and release gates.
- [Owner actions](docs/OWNER_ACTIONS.md): exposed historical keys, external configuration and product/data decisions.
- [Source audit](docs/INTEGRATION_AUDIT.md): branch evidence and initial risks.
- [Completion and QA report](docs/COMPLETION_REPORT.md): executed results and explicit untested/blocked items.

## Architecture

```text
frontend/       Next.js pages, components, browser Supabase auth and RLS queries
  src/lib/      API client, shared workspace repository, persistence hook
backend/        Node HTTP API, token verification, project authorization, AI/PDF
  supabase/     Ordered SQL migrations, RLS, quotas, immutable baseline and storage
scripts/        Local orchestration, CI guards, local test fixtures, staging checks
.github/        PR checks, CODEOWNERS and manually approved staging workflow
```

Frontend `/api/*` requests proxy to a separately hosted backend using server-only
`BACKEND_URL`. Each processing/write endpoint verifies the caller's Supabase JWT
and project permissions. Owner/editor can process or save; viewers can read.
Project creation remains the existing RLS-protected quota RPC.

Shared workspace state lives in `project_workspaces` with compare-and-swap revisions.
Local data remains a recovery cache; it is never forcibly deleted. Baselines are
immutable database snapshots. PDFs live in a private Supabase bucket; AI quotas are
reserved atomically in PostgreSQL. Existing normalized project tables remain preserved;
the snapshot boundary and recovery policy are documented rather than silently remapped.

## Commands

Use Node 24 (tested), install from the workspace root:

```sh
npm ci
npm run dev:backend
npm run dev:frontend
npm run check
npm test
npm run build
npm audit --omit=dev --audit-level=high
npm run security:secrets
```

Create each workspace's `.env.local` from its `.env.example` using approved staging
configuration. Never copy credentials from tracked historical env files. See the
handoff guide for browser-test build variables, `npm run test:e2e`, and opt-in live
staging commands. Local fixtures and real SQL tests do not establish live OAuth,
provider, deployment or database readiness.

No direct merge of unrelated `main`/split histories, force push, production deploy,
or production database mutation is part of this work. Earlier top-level setup/status
documents are historical; the linked integration documents supersede their deployment
and readiness claims.
