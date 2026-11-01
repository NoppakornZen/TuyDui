# Split deployment and staging acceptance

No deployment or production database mutation is performed by this preparation.

## Confirm current production (owner)

Vercel project: `tuydui` (local project metadata is only a hint). In Vercel →
Project → Settings/Git/Build and Development/Environment Variables and Deployments:
record production branch, exact deployed SHA, Root Directory, build/install commands,
domains and environment variable **names**. Do not infer deployed SHA from GitHub HEAD.
On 2026-11-01 public probes returned `/` 200 HTML, `/tutorial` 404 HTML,
`/api/health` 404 HTML. These probes do not establish which commit is deployed.
Backend hosting, public URL, configured BACKEND_URL and OAuth allowlist are unverified.

## Staging setup

1. Adopt the reviewed split candidate branch; keep current production untouched.
2. Create a separate Supabase **test** project and three dedicated test accounts.
   Compare existing staging schema and migration ledger. On a new database apply
   `backend/supabase/migrations/001` through `008` in order with an authorized SQL
   editor/approved migration runner. Never blindly rerun initial migrations or old
   `db:setup` scripts against an existing database. Snapshot/backup first.
3. Before `007`, check for existing cross-project child references. New foreign keys
   deliberately fail on inconsistent old data; repair under review, do not drop checks.
   Confirm authenticated users cannot directly INSERT projects or UPDATE owner/baseline.
4. Deploy the backend as a long-running Node 24 service (Dockerfile at backend/Dockerfile,
   build context repository root), or use install `npm ci`, build
   `npm run build --workspace backend`, start `npm run start:backend`.
   Choose and record an approved host/region/HTTPS public origin; none is invented here.
5. Backend runtime vars: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, approved AI provider/model/key
   and base/pool, `PORT`, `HOST`. Caller-authenticated APIs do not require a service key.
   Store secrets in host environment management. Do not mount historical env files.
6. Create a separate Vercel staging project/preview for this branch. Root Directory
   **frontend/**, Next.js preset, install from workspace root lockfile (`cd .. && npm ci`),
   build `npm run build` within frontend, default Next output. Allow access to workspace
   files outside Root Directory if the Vercel workspace setting requires it.
7. Before frontend build set `BACKEND_URL=<HTTPS staging backend origin>`;
   `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_APP_URL`
   point to approved staging resources. Changing BACKEND_URL requires rebuilding.
8. Supabase Auth URL Configuration: staging Site URL and exact
   `<staging-origin>/auth/callback`; Google provider callback is the Supabase Auth
   callback URL shown in that dashboard. Configure Google console accordingly.
   Keep legacy approved callbacks until cutover completes; restrict preview allowlists
   to team-controlled URLs. No credential is placed in frontend env as privileged data.
9. API access is same-origin via Next proxy. No wildcard credentialed CORS is added;
   direct browser calls to backend are unsupported. External clients send bearer tokens.
10. PDFs use the private Supabase bucket from migration `008`, not ephemeral disk.
    AI usage summaries currently use local JSONL diagnostics; reserve durable host
    volume for these diagnostics or treat them as best-effort, not billing truth.
    AI rate limits are database-backed and consistent across workers/restarts.

## Required staging evidence

Set GitHub Environment `staging` with approval rules and secrets
`STAGING_OWNER_TOKEN`, `STAGING_OUTSIDER_TOKEN`; variable `STAGING_PROJECT_ID`
points to the owner account's seeded test workspace. Tokens belong to dedicated
test accounts, expire, and must be refreshed; never print them.
Run **Staging acceptance** via workflow_dispatch with approved HTTPS frontend/backend
origins, or `npm run test:staging` with the same environment names. This smoke is
read-only: JSON health through backend and proxy, routes, missing/invalid tokens,
outsider denial and identical seeded workspace reads. Missing config fails explicitly.

Optional **run_full_flow** executes `npm run test:staging:flow` using three distinct
dedicated accounts. GitHub staging vars: `STAGING_SUPABASE_URL`,
`STAGING_SUPABASE_PROJECT_REF`; secrets: `STAGING_SUPABASE_ANON_KEY`,
`STAGING_NEW_ACCOUNT_TOKEN`, `STAGING_MEMBER_TOKEN`, `STAGING_OUTSIDER_TOKEN`.
The creation account must own zero projects. Outside the workflow set
`STAGING_ALLOW_TEST_MUTATIONS=true` only for the approved disposable environment.
The script creates/retains one QA project, concurrently checks free quota, uses a
generated PDF and real provider, saves baseline/workspace, checks conflicts, invites
an editor then downgrades to viewer. It never auto-deletes data to reset a quota.
Owner resets dedicated accounts between runs through an approved staging procedure.
This suite is prepared but cannot be called PASS until run with live test credentials.

Attach separate evidence for these tests on staging, never production:

- Google sign-in, callback, reload/session refresh, sign-out, protected routes and expired JWT.
- Test account A creates its first project, second rejected, existing project still opens/edits;
  send two simultaneous creates from distinct sessions/accounts with zero owned projects;
  one success only, direct insert denied. Record DB/RPC output without tokens.
- Account B cannot read/process/write A's project; editor invite can edit; viewer can read
  but cannot process/save; invite max_uses/expiry and role escalation are rejected.
- Authorized sample PDF upload really parses text, AI returns requirements and references,
  map is generated, edits are reviewed, baseline persists, changes can be reviewed.
  Test scanned/bad/oversized PDF, provider failure, bounded timeout and user-triggered retry.
- Reload/new browser/device retains requirements/map/history/notes/documents/baseline;
  simultaneous edits return 409 and preserve local backup; legacy data recovery export works.
- Desktop 1440, tablet 768, mobile 390: public/project/workspace routes, navigation,
  no uncaught browser errors or unintended horizontal page overflow; record screenshots.
- Test slow provider responses through the actual Vercel proxy and selected backend host.
  Verify runtime/proxy request limits accommodate the configured processing budget.
  If they do not, block release and use a reviewed asynchronous-job design or reduce budget;
  do not claim Next rewrite alone guarantees long AI requests.

## Merge/release gates and rollback

Required branch protections (owner config, not implied by YAML): Integration checks,
CODEOWNER approval, no direct pushes or force pushes, staging evidence and acceptance.
GitHub workflow files in this branch do not create repository rules automatically.
Do not merge unrelated main into this source. Choose a reviewed repository migration
strategy/new default branch; current main remains recoverable.

Before release: rotate exposed keys/JWT/database passwords, audit provider/DB/Vercel
logs, verify no unresolved high/critical production dependency advisory, obtain release
approval. Record current Vercel deployment ID, exact SHA, old root/env references,
backend image SHA and database backup. Deploy candidate to staging first.
Cutover: release backend compatible with current API; deploy new frontend with reviewed
Root Directory/env; run live read-only smoke and approved functional checks.
Rollback: restore previous Vercel deployment and its original project root/env settings,
restore compatible backend image. Additive tables stay in place; never drop workspace,
baseline or PDF data to roll back code. If writes require restoration, stop writes and
have the owner perform a reviewed recovery; reverting code alone does not undo database writes.
