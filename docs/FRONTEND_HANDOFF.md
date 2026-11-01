# Frontend redesign V3 handoff

Candidate repository: `https://github.com/NoppakornZen/TuyDui`.
Candidate canonical branch: `integration/frontend-handoff-2026-11-01`.
Base split commit: `50c5e85` (full hash and final delivery commit in completion report).
**Team adoption and staging acceptance are required before calling this the canonical branch.**
Do not merge unrelated `main` history into this branch.

```sh
git clone https://github.com/NoppakornZen/TuyDui.git
cd TuyDui
git checkout integration/frontend-handoff-2026-11-01
git switch -c frontend/redesign-v3
npm ci
```

Use Node.js 24 (tested) or supported Node >=22.14. Copy `frontend/.env.example`
and `backend/.env.example` to `.env.local` inside each directory; enter values from
the team's approved **staging** secret store. Never copy the exposed historical env files.
`npm run setup:env` can copy an existing trusted local config without replacing
files, but is inappropriate for unreviewed old/exposed credentials.

Frontend vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
`NEXT_PUBLIC_APP_URL`, server-only `BACKEND_URL` (default localhost:4000).
Backend vars: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `AI_PROVIDER`, `AI_MODEL`,
`MAXPLUSAI_API_KEY`, `MAXPLUSAI_BASE_URL`, `MAXPLUSAI_POOL`, `PORT`, `HOST`.
Service-role/admin/billing credentials are never required by a frontend developer.
Only the MaxPlus provider is currently implemented; other key names in the example
do not mean those providers are operational.

```sh
npm run dev:backend     # terminal 1, localhost:4000
npm run dev:frontend    # terminal 2, localhost:3000
# Or set BACKEND_URL to the approved HTTPS staging backend before frontend build/dev.
npm run check
npm test
npm run build
npx playwright install chromium
npm run test:e2e
npm run security:secrets
npm audit --omit=dev --audit-level=high
```

Browser fixture tests require a frontend production build with:
`BACKEND_URL=http://127.0.0.1:4100`, `NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:4401`,
`NEXT_PUBLIC_SUPABASE_ANON_KEY=local-test-public-key`.
These are local **test fixtures**, not live Supabase/AI verification. The CI workflow
sets them automatically; do not deploy that build. Preview builds use staging vars.

## Edit boundaries

Allowed on `frontend/*` branches: presentation in `frontend/app/**`, assets under
`frontend/public/**`, regression tests under `frontend/tests/**`.
Protected: `frontend/app/auth/**`, `frontend/app/components/AuthProvider.tsx`,
`LocaleProvider.tsx`, `frontend/src/lib/**`, `frontend/src/domain/**`, Next config,
package manifests/lockfile, backend, migrations, scripts, workflows, secret files.
Ask for an integration PR with CODEOWNER review if protected logic must change.
Do not alter stable node/requirement/project IDs, auth header, task names, FormData
fields, database/RPC names or storage keys during a layout change.

Workspace persistence is encapsulated in `use-workspace-sync.ts` and
`workspace-repository.ts`; state contract in `workspace-state.ts`. Keep their
calls/state wiring when editing workspace presentation. Some view interactions
and AI proposal mapping remain in the page; moving them requires passing the same
contract/browser tests. No UX redesign is included in this preparation work.

## PR workflow and definition of done

```sh
git add frontend/app frontend/public frontend/tests
git commit -m "Update frontend presentation"
git push -u origin frontend/redesign-v3
```

Open a PR **against the adopted split integration branch**, label `frontend-only`.
Include changed routes, desktop/tablet/mobile screenshots, test outputs and preview URL.
CI checks changed-file boundaries, secret patterns, audit, types, tests, both builds,
proxy, guards, workspace save/reload and responsive routes. Backend contract tests
and real SQL migration tests run on frontend PRs too. Do not remove failing checks.

Acceptance requires protected branch rules + CODEOWNER review, passing CI, a preview
connected to a real staging backend, the live staging smoke, and manually evidenced
test-account OAuth/PDF/AI/sharing/quota/concurrency checks in the deployment runbook.
The owner deploys/cuts over only after these gates and explicit release approval.
API changes require updating [API_CONTRACT.md](API_CONTRACT.md), paired tests and
backward-compatible rollout. A green local mock suite alone does not approve handoff/release.
