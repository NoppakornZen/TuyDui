# TuyDui — Frontend Redesign V3 handoff

Verified 2026-11-01. Read [QA_REPORT.md](QA_REPORT.md) for evidence and gates.
Clean-clone QA and a real frontend-only PR passed. Approved staging configuration,
team adoption and live acceptance remain missing; fixture success is not live acceptance.

## A. Source and Git

- Repository: `https://github.com/NoppakornZen/TuyDui`.
- Designated handoff candidate: `integration/frontend-handoff-2026-11-01`.
  Owner must adopt it as canonical. Default branch is still unrelated `main`;
  its latest QA commit adds generated artifacts, not the split source integration.
- Verified application/base SHA: `ac5acda2038f1d7f0e9d17dc033318103b53363b`.
  Split ancestor: `50c5e85684750a1c94a7ab1140703108c26891ef`.
  Later documentation commits preserve that application behavior and rerun CI.
- Create `frontend/redesign-v3`; PR target is the adopted integration branch above.
  Integration review PR #1 targets `feat/uxui-redesign` and remains draft/unmerged.

MacBook zsh/bash commands (clone split directly, avoiding main's historical env files):

```sh
git clone --single-branch --branch integration/frontend-handoff-2026-11-01 https://github.com/NoppakornZen/TuyDui.git TuyDui
cd TuyDui
git rev-parse HEAD
git switch -c frontend/redesign-v3
node --version
npm ci
```

Install Node **24 LTS** first with your approved manager. Verified Windows Node
24.16.0/npm 11.13.0 and Node 24 Linux CI; macOS itself was NOT TESTED.
To receive backend updates on the same history:

```sh
git fetch origin
git switch frontend/redesign-v3
git merge origin/integration/frontend-handoff-2026-11-01
npm ci
npm run check
npm test
```

Resolve conflicts with the integration owner and rerun QA. Never merge unrelated
main, force push or use `--allow-unrelated-histories`.

## B. Real local/staging connection

Paths: `frontend/` and `backend/`. From repository root:

```sh
cp frontend/.env.example frontend/.env.local
cp backend/.env.example backend/.env.local
```

Enter approved **staging** configuration from the platform owner's environment
manager. No approved staging URL/config was supplied for this verification.

| File | Required variable names |
| --- | --- |
| `frontend/.env.local` | `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, server-only `BACKEND_URL` |
| `backend/.env.local` for local real backend | `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `AI_PROVIDER=maxplus`, `AI_MODEL`, `MAXPLUSAI_API_KEY`, `MAXPLUSAI_BASE_URL`, `MAXPLUSAI_POOL`, `PORT=4000`, `HOST` |

Browser gets only public Supabase config and its own user token. Do not supply
service-role/JWT signing keys, DB credentials, provider keys or production accounts
to frontend developers. Provider secrets stay with the backend owner/runtime.
Unused admin/billing/other-provider examples are not required or implemented features.

```sh
# Terminal 1: approved backend env; reviewed migrations applied to staging first
npm run dev:backend
# Terminal 2: frontend BACKEND_URL=http://127.0.0.1:4000
PORT=3101 npm run dev:frontend
```

Backend: `http://127.0.0.1:4000`; frontend default: `http://localhost:3000`.
Explicit **3101** passed the dev-start drill because this test machine returned
unrelated Vite HTML at port 3000. Exact local routing cause is unverified; unrelated
services were not killed. Align APP_URL and approved OAuth allowlists with your port.
With an approved HTTPS staging BACKEND_URL, start only the frontend. Keep API calls
same-origin `/api/*`; no backend origin hardcoding in browser code. Rebuild after
changing proxy/public build variables.

```sh
curl -fsS http://127.0.0.1:4000/api/health
curl -fsS http://127.0.0.1:3101/api/health
# Both must return JSON: {"status":"ok","service":"tuydui-backend"}
```

Health verifies connectivity, not Supabase/provider configuration.

## C. Credentials-free local regression mode

Real Node backend/PDF parser with **mock Supabase and AI**, never live acceptance.
This runs automated authenticated workspace flows but cannot exercise real Google
sign-in or provide a live authenticated manual workspace session. In a test-only shell:

```sh
export NEXT_TELEMETRY_DISABLED=1
export BACKEND_URL=http://127.0.0.1:4100
export NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:4401
export NEXT_PUBLIC_SUPABASE_ANON_KEY=local-test-public-key
npm run check
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

Tests start/stop fixture `4401`, backend `4100`, production frontend `3100`, and
seed synthetic sessions. Keep ports free. For inspection run
`npx playwright test --headed --debug` in the same shell and step through the
workflow in Inspector. Do not start duplicate fixture servers. Never deploy this
test build: unset dummy overrides and rebuild using approved staging configuration.

## D. Preserve integration boundaries

UX/UI paths: `frontend/app/**`, `frontend/public/**`, `frontend/tests/**`, except
protected auth/providers. Preserve `frontend/src/lib/**`, `frontend/src/domain/**`,
`frontend/app/auth/**`, `AuthProvider.tsx`, `LocaleProvider.tsx`.
Key libraries: `api.ts`, `auth.ts`, `supabase.ts`, `project-queries.ts`,
`workspace-state.ts`, `workspace-repository.ts`, `use-workspace-sync.ts`.
Backend/migrations/scripts/workflows/manifests/lockfile/Next config require a
separate integration PR and owner review; they are not frontend-only scope.

[API_CONTRACT.md](API_CONTRACT.md) defines endpoints, tasks, FormData, Supabase
tables/RPCs and errors. Keep workspace hook/state wiring when changing presentation.
Preserve project/requirement/node IDs, relationships and storage keys. Server snapshots
are shared truth; localStorage is legacy/recovery storage. Never clear it, silently
merge conflicts, fake save success or rewrite baseline/history to simplify a layout.

## E. Testing and delivery

Verified scripts: `npm run check`, `npm test`, `npm run build`, `npm run test:e2e`,
`npm run security:secrets`, `npm audit --omit=dev --audit-level=high`.
Use the fixture build variables above for browser tests. Existing browser coverage:
1440/768/390 routes/overflow/console, guards/callback/logout, proxy, PDF/map,
notes reload, baseline/changes and quota. Test changed controls and screenshots too.

Real frontend/backend acceptance requires approved HTTPS staging origins, migrations,
dedicated accounts and provider config. Owner runs `npm run test:staging` with
`STAGING_FRONTEND_URL`, `STAGING_BACKEND_URL`, `STAGING_OWNER_TOKEN`,
`STAGING_OUTSIDER_TOKEN`, `STAGING_PROJECT_ID` from the secret manager.
See [DEPLOYMENT_RUNBOOK.md](DEPLOYMENT_RUNBOOK.md) for opt-in mutation-suite env names,
three-account setup, Google/manual acceptance and rollback. Missing config fails
explicitly; no staging URL is currently verified.

```sh
git add frontend/app frontend/public frontend/tests
git diff --cached
git commit -m "Update frontend presentation"
git push -u origin frontend/redesign-v3
```

Open PR against the adopted integration branch. Prefix `frontend/` activates the
scope gate; add `frontend-only` label when available. Include changed routes,
QA outputs, three-width screenshots and approved staging preview URL.
Hosted checks enforce scope, clean install, secrets/audit, types, both-workspace
tests/contracts/builds and browser regressions. QA-only PR #2 proved this exact
return path and was closed unmerged; do not copy its comment-only commit.

Repository owner adopts/protects the branch and enables required checks/CODEOWNER
review. Integration maintainer reviews/merges after CI and real staging acceptance.
Deployment owner releases only after security remediation and explicit approval;
frontend developers do not deploy production or apply SQL migrations.
API changes need paired contract/tests and a compatible rollout.

Rollback owner restores recorded Vercel deployment/root/env and compatible backend
image per runbook; retain additive DB/PDF/workspace data. Never drop data/reset
history for a frontend rollback. Responsibilities: [OWNER_ACTIONS.md](OWNER_ACTIONS.md).
