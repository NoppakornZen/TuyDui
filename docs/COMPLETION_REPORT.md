# TuyDui integration completion report — 2026-11-01

## Delivery and verdict

The local split development baseline is implemented and verified. Full handoff and
production readiness remain blocked by owner-controlled staging and security gates.
No production deployment, production database change, credential rotation, unrelated
history merge, force push or history rewrite was performed.

| Readiness | Verdict | Reason |
| --- | --- | --- |
| READY FOR FRONTEND REDESIGN | READY locally; team adoption required | Separate frontend/backend, documented contracts, recoverable server persistence and local workflow tests pass. Use the candidate branch below. |
| READY FOR FRONTEND HANDOFF | BLOCKED | Hosted CI and real staging acceptance must pass; repository owner must adopt the branch and enforce review/protection rules. |
| READY FOR PRODUCTION DEPLOYMENT | BLOCKED | Deployment provenance/configuration unverified, historical credentials require owner remediation, live integration untested, release approval absent. |

Candidate canonical branch: `integration/frontend-handoff-2026-11-01`.
Base: `feat/uxui-redesign`, full SHA
`50c5e85684750a1c94a7ab1140703108c26891ef`.
The split branch contains independent Next.js and Node workspaces and the tutorial
route. `main` (`3cf5f38`) has unrelated history; it is not this PR's merge target.
Commit/PR publication and hosted CI status are recorded in the delivery update below.
Existing untracked `.claude/` was excluded from all changes.

## Implementation

| Area | Changes / principal files |
| --- | --- |
| Authorization | `backend/src/lib/project-access.ts`, `rate-limit.ts`, all AI/PDF/change/workspace routes: verified bearer user, caller-token RLS, owner/accepted editor permissions, UUID and cross-project checks. AI diagnostics require auth; live diagnostic calls are disabled. |
| Shared persistence | Migration `006`, `routes/workspace.ts`: authorized revision compare-and-swap, conflict 409, atomic initial baseline, database quota reservations and private document manifests. Deleting projects/manifests cannot reset account reservations. |
| Database security | Migrations `007`–`008`: free-project direct-insert defense, immutable baseline, cross-project relationships, private PDF storage policies. Existing normalized tables retained. |
| PDF / AI | `services/documents.ts`, provider retry and routes: real PDF signature/size/text checks, durable private storage, server identity, explicit errors, shared provider deadline, timeout 504, rate-limit 429. No fake successful storage fallback. |
| Frontend integration | `workspace-state.ts`, `workspace-repository.ts`, `use-workspace-sync.ts`: server source of truth, serialized saves, recoverable local backups/export, legacy import only when server empty, conflict stop. Workspace page consumes these interfaces. |
| Auth / UI behavior | Current-token same-origin API requests, central `/auth/callback`, session/logout guard, real elapsed time, actual project members, preserve edited proposals. Only demonstrated mobile overflow/readability fixes; no redesign. |
| Security / deployment | Next.js 16.4.3, lockfile update, zero production audit findings, secret commit guard, env examples, backend Dockerfile and deployment/rollback runbook. |
| CI / handoff | Integration and protected-environment staging workflows, frontend file-scope check, CODEOWNERS, PR template, contract/unit/SQL/browser tests, frontend guide and owner action register. |

Architecture: browser → same-origin Next `/api/*` proxy → separate Node backend →
Supabase Auth/PostgreSQL/private Storage and server-side AI provider. Frontend still
uses approved Supabase project/member/invite RPCs under RLS. Privileged credentials
are never required by the browser. New `project_workspaces.snapshot` is authoritative
for shared UI data; old normalized tables are preserved but not auto-synchronized.
That boundary and legacy recovery ownership need product-owner approval before release.

Existing API paths, task names and FormData fields are retained. Intentional tightening
(UUID project IDs, authenticated status, disabled public live diagnostics, no unassigned
processing) and migration prerequisites are documented in [API_CONTRACT.md](API_CONTRACT.md).

## Executed QA

All results below refer to the local candidate source on November 1, 2026 unless
explicitly marked public production. Mock services are isolated test fixtures, never
presented as evidence of live Supabase/Google/provider success.

| Check | Result | Evidence / limits |
| --- | --- | --- |
| `npm run check` | PASS | [typecheck.txt](qa/typecheck.txt), frontend and backend. |
| `npm test` | PASS | [tests.txt](qa/tests.txt): 11 backend + 7 frontend + 1 cross-workspace = 19 tests, plus project-flow QA script. |
| Migration / RLS tests | PASS locally | Actual migrations 001–008 in PGlite with emulated Supabase auth/storage schemas: owner/outsider/editor/viewer, direct quota bypass, persistence/conflict, baseline, invite use, child relationships, PDF storage and quota persistence on deletion. Not live multi-session PostgreSQL proof. |
| Auth / API contracts | PASS with mocks | Missing/invalid/expired JWT, denied project access, current token/FormData/proxy, quota Retry-After; backend provider-unavailable behavior. |
| PDF / provider behavior | PASS locally | Real generated selectable-text PDF parsing and references, malformed bytes, mocked provider schema/retry/failure behavior. Scanned/large real-world files and live provider latency remain untested. |
| `npm run build` | PASS | [build.txt](qa/build.txt), Next 16.4.3 frontend and TypeScript backend. Test-only env overrides used; do not deploy this build. |
| `npm run test:e2e` | PASS | [browser-tests.txt](qa/browser-tests.txt): 5 Playwright tests, real local backend and PDF parser with mock Supabase/provider. Public routes, callback, project create, PDF/AI/map, notes save/reload, baseline, changes, quota, logout. |
| UI 1440 / 768 / 390 | PASS within smoke scope | Public/project/workspace route overflow assertions and no browser console/page errors. Selected [screenshots](qa/screenshots/) retained; workspace mobile inspected. This is not a comprehensive UX audit. |
| Production dependencies | PASS | `npm audit --omit=dev`: [after](qa/dependency-audit-after.json), zero vulnerabilities; [before](qa/dependency-audit-before.json) retains prior findings. |
| Tracked-file secret guard | PASS | [secrets-check.txt](qa/secrets-check.txt). Pattern-based guard is not exhaustive history scanning or credential revocation. |
| Live staging smoke | BLOCKED | [staging-smoke.txt](qa/staging-smoke.txt): fails explicitly because approved URLs/tokens/project are absent. |
| Real staging workflow | BLOCKED | [staging-flow.txt](qa/staging-flow.txt): approved disposable environment and dedicated credentials absent. Prepared opt-in mutation suite was not run. |
| Google OAuth, refresh, live expired JWT | NOT TESTED live | Callback/session/logout tested with fixtures only; Google/Supabase configuration requires owner access. |
| Live quota concurrency / schema comparison | NOT TESTED | No authorized Supabase staging instance; local serialized engine is not multi-session lock evidence. |
| Real AI, real storage, sharing/client review | NOT TESTED live | Local contracts/SQL coverage exists; deployed service behavior and full client-review acceptance need dedicated staging evidence. |
| Docker image build | NOT TESTED | Docker unavailable. Backend Node build/start path verified by local tests. |
| Hosted CI and branch protections | Pending publication / owner setup | Workflow YAML does not enable required checks or CODEOWNER rules automatically. See delivery update. |

The final test/build round includes the quota persistence changes. Browser tests passed
on the same frontend/backend application source; the later SQL-only changes were
verified by the final migration tests.

## Deployment facts and proposed configuration

Public probes at `2026-11-01T12:06:54Z`–`12:06:55Z`:

| Production path | Observed response |
| --- | --- |
| `/` | 200 HTML |
| `/tutorial` | 404 HTML |
| `/api/health` | 404 HTML; not backend JSON |

Raw evidence: [production-probes.json](qa/production-probes.json).
These observations do not establish the deployed Git SHA or branch.

| Setting | Status |
| --- | --- |
| Production branch / SHA / Vercel root | UNVERIFIED; authenticated Vercel owner action required. |
| Production backend host / public URL / BACKEND_URL | UNVERIFIED; not inferred from repository. |
| Candidate frontend root | Proposed `frontend/`; root-lockfile install, Next build, staging public Supabase vars and HTTPS `BACKEND_URL` before build. |
| Candidate backend | Node 24 long-running service or reviewed Docker image; `npm ci`, `npm run build --workspace backend`, `npm run start:backend`. Host/URL must be chosen by owner. |
| Storage / limits | Private Supabase bucket and database reservations from migrations 006–008; no ephemeral PDF source of truth. |
| OAuth | Proposed exact staging `/auth/callback` and approved Supabase/Google callback allowlists; current deployed allowlists unverified. |
| Staging | Configuration and acceptance scripts prepared, no live deployment performed. |
| Cutover / rollback | [DEPLOYMENT_RUNBOOK.md](DEPLOYMENT_RUNBOOK.md); staging proof, credential remediation, backups and explicit release approval required. |

## Frontend handoff and owner actions

Start with [FRONTEND_HANDOFF.md](FRONTEND_HANDOFF.md). Create `frontend/redesign-v3`
from the reviewed candidate integration branch. Presentation changes belong under
`frontend/app/`, `frontend/public/`, `frontend/tests/`; auth/integration/data libraries,
backend, migrations, manifests/config and workflows require integration-owner review.
Keep the API client, persistence hook, IDs, state schemas and wire contracts intact.
Run the documented types, tests, builds, browser and security checks; submit a PR to
the adopted split branch with `frontend-only`, screenshots and real staging preview.
The deployment owner controls staging acceptance and production release.

[OWNER_ACTIONS.md](OWNER_ACTIONS.md) assigns who/where/how/verification/impact for:
branch adoption/protection, Vercel deployment provenance, isolated staging schema and
hosting, OAuth allowlists, test accounts, live acceptance, secret remediation and
release approval. Historical exposed categories include AI provider keys, Supabase
privileged/JWT keys, database credentials/URLs and Vercel OIDC credentials. Values
were never printed and no historical credential was used for live mutations.
Removal from a new commit does not revoke those credentials.

## Delivery update

Implementation is prepared on the isolated integration branch. Publication status,
commit SHA, draft PR and hosted CI results will be recorded after publication.
