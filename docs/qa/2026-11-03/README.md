# QA evidence — 2026-11-03 re-verification

Verification branch: `integration/frontend-handoff-2026-11-03`, created from
`integration/frontend-handoff-2026-11-01` at `d410f376c4285b4ea2a2bf57dc316dfc1fe53838`
in a separate worktree. No application runtime code changed in this pass.

Environment: Windows 10, Node 24.16.0, npm 11.13.0. Fixture values were used for
build/browser checks (`BACKEND_URL=http://127.0.0.1:4100`,
`NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:4401`,
`NEXT_PUBLIC_SUPABASE_ANON_KEY=local-test-public-key`). Fixture success is not live
Supabase/AI/Google acceptance.

| File | Contents | Result |
| --- | --- | --- |
| `install.txt` | `npm ci` in a fresh worktree | PASS, 0 vulnerabilities |
| `typecheck.txt` | `npm run check` (Next typegen + tsc, both workspaces) | PASS |
| `tests.txt` | `npm test` (11 backend, 7 frontend, 1 contract + project-flow QA) | PASS |
| `build.txt` | `npm run build` (Next 16.4.3 + backend tsc) | PASS |
| `browser-tests.txt` | `npm run test:e2e` (5 Playwright tests) | PASS |
| `dependency-audit.json` | `npm audit --omit=dev --json` | 0 vulnerabilities |
| `secrets-check.txt` | `npm run security:secrets` (216 tracked paths) | PASS (pattern guard only) |
| `dev-default-ports.txt` | Default `npm run dev`: backend 4000, frontend 3000, proxy, tutorial | PASS |
| `production-probes.json` | Read-only public probes of `https://tuydui.vercel.app` | `/`, `/login`, `/projects` 200; `/tutorial` and `/api/health` 404 |
| `github-verification.json` | Public GitHub API: default branch, PR #1, branch heads, CI runs | PR #1 open/draft; CI success at `d410f37` |
| `vercel-deployment.json` | Read-only authenticated Vercel project/deployment metadata (no secrets) | Root `.`, no Git link, production from dirty `main@e456eef` |
| `vercel-env-names.txt` | 2026-11-03 project; values shown only as `Encrypted` | No `BACKEND_URL`/`NEXT_PUBLIC_APP_URL` |

Nothing here authorizes a production deployment, database mutation, credential
rotation or Git history rewrite. Live staging, Google OAuth, real AI provider,
multi-session concurrency, credential rotation and release approval remain
owner-gated and are not claimed as passing.
