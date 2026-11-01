# TuyDui — Final QA verification and frontend handoff

Date: **2026-11-01**. This verifies existing integration work, not a redesign or
new backend implementation. Application runtime code was not changed in this pass.
A separate frontend-only PR probe changed only a CSS comment and was closed unmerged.

## 1. Source verified

| Item | Verified fact |
| --- | --- |
| Repository | `https://github.com/NoppakornZen/TuyDui` |
| Handoff candidate | `integration/frontend-handoff-2026-11-01`; team canonical adoption still required |
| Clean-clone application QA/base SHA | `ac5acda2038f1d7f0e9d17dc033318103b53363b` |
| Split ancestor | `50c5e85684750a1c94a7ab1140703108c26891ef` (`feat/uxui-redesign`) |
| Frontend-only probe SHA | `88646dcb73f4ef6a73cd1d71c62341869f715bf7`; one CSS comment only; NOT merged |
| Default/current main | `main`, `796852d95cfea7bfca452ca9952508538f122358` |
| Main's latest “ตรวจเช็ค QA” commit | Adds 14 generated backend-dist/report/screenshot files, not the split source/config/tests. This is not proof of source adoption. |
| Integration review | Draft PR #1 → `feat/uxui-redesign`, open/unmerged at verification |
| Shared history | Main and candidate have no common ancestor; no forced merge/history rewrite performed |

The original checkout remains on main; its untracked `.claude/` was untouched.
A new remote clone in a separate ignored test directory received no old `.env`,
node_modules or generated builds. This report is committed to the candidate branch.
Its delivery commit SHA/CI appear in GitHub history and the final delivery message;
the application QA SHA above makes test evidence reproducible.

Source/PR/CI evidence: [github-verification.json](qa/final-handoff/github-verification.json).
Implementation provenance: [COMPLETION_REPORT.md](COMPLETION_REPORT.md).

## 2. Test matrix

PASS applies only to the listed method/environment. Mock/embedded SQL success is
never a claim that deployed Google, Supabase, Storage or AI passed acceptance.

| Area | Status | Method/result | Evidence and limits |
| --- | --- | --- | --- |
| Clean clone/install | PASS | Remote single-branch clone at QA SHA; Node 24.16.0/npm 11.13.0; `npm ci` exit 0, no old env/build/dependencies copied. | [install.txt](qa/final-handoff/install.txt). Windows tested; Node 24 Ubuntu CI passes. macOS NOT TESTED. |
| Typecheck | PASS | `npm run check`: Next typegen/tsc and backend tsc exit 0 before build in fresh clone. | [typecheck.txt](qa/final-handoff/typecheck.txt) |
| Unit/contract/integration scripts | PASS | `npm test`: 11 backend + 7 frontend + 1 cross-workspace = **19 tests**, zero failures, plus project-flow QA script. | [tests.txt](qa/final-handoff/tests.txt) |
| Frontend/backend build | PASS | `npm run build`: Next 16.4.3 frontend and backend TypeScript build exit 0. | [build.txt](qa/final-handoff/build.txt). Dummy fixture env; rebuild using approved env before deployment. |
| Authentication/project authorization | PASS locally | Missing/invalid/expired tokens, route guards, current bearer, mock callback/session/logout, owner/outsider/viewer checks. Backend identity comes from verified token. | Test/browser logs; not real OAuth acceptance. |
| Google OAuth/session refresh | BLOCKED live | No approved staging auth/provider config or dedicated credentials; mock callback does not exercise Google or real refresh. | Supabase/Google OAuth owner + QA. |
| Project creation/persistence | PASS locally | Browser create/save/reload, repository import/recovery/serialized saves/conflict and actual SQL RPC/RLS tests. | Test/browser logs. Live multi-device Supabase NOT TESTED. |
| Free project quota | PASS locally | SQL second-project/direct-insert rejection; existing project editable; local queued creates; browser quota UI. | PGlite is one embedded engine, not independent DB sessions. Live concurrent acceptance BLOCKED. |
| PDF upload/parsing | PASS locally | Real generated selectable-text PDF and real parser; invalid PDF rejection; mocked Storage/provider; private bucket SQL policies. | Test/browser logs. Live upload, scanned/large real-world PDF cases NOT TESTED. |
| AI extraction/errors | PASS mocked | Mock extraction/schema/retry/failure and actual backend/browser wiring. | No paid/live provider requests; deployed latency/timeout acceptance BLOCKED. |
| Project map | PASS mocked | PDF requirements generate map through backend/fixture provider; cross-workspace shapes agree. | Browser/contracts logs, no real AI generation claim. |
| Baseline/changes/history/notes | PASS locally | Baseline reload, immutable SQL snapshot, notes save/reload, change review, recovery/conflict preservation. | Test/browser logs; real shared devices/edit races remain staging gates. |
| Supabase/RLS/storage/sharing | PASS embedded SQL | Actual migrations 001–008 in PGlite/emulated auth/storage: owner/editor/viewer/outsider, invites, baseline, relationships and quota persistence. | Live schema/storage/client review/multi-session concurrency BLOCKED. |
| Frontend–backend API | PASS local | Production browser suite talks to real Node backend; dev commands return backend JSON directly on 4000 and via frontend 3101; tutorial 200. | [local-start-3101.json](qa/final-handoff/local-start-3101.json), [browser-tests.txt](qa/final-handoff/browser-tests.txt) |
| Default port 3000 dev probe | FAIL in this environment | Backend 4000 returns JSON; frontend URL at 3000 returns 200 HTML (Vite HTML observed), despite Next reporting ready. Alternate 3101 passes. | [local-start-3000.json](qa/final-handoff/local-start-3000.json). Exact local routing cause unverified; unrelated services not killed. Align APP_URL/OAuth with chosen port. |
| Responsive/navigation/console | PASS smoke | Five Playwright tests; 1440/768/390 public/project/workspace overflow, navigation and console/page-error checks. | [browser-tests.txt](qa/final-handoff/browser-tests.txt), fresh [screenshots](qa/final-handoff/screenshots/). Not full UX/accessibility audit. |
| Dependency security | PASS candidate | Current `npm audit --omit=dev --json`: zero vulnerabilities; Next pinned 16.4.3. | [dependency-audit.json](qa/final-handoff/dependency-audit.json). Does not certify unrelated main or unidentified deployed build. |
| Candidate tracked secrets | PASS guard only | Tracked-file pattern guard passes; candidate clone has no tracked historical env files. | [secrets-check.txt](qa/final-handoff/secrets-check.txt). Not exhaustive history scanning or rotation proof. |
| Main/historical secrets | BLOCKED | Current main still tracks `.env.local.backup` and `.env.production`. No values printed/used; rotation/log audit unconfirmed. | Security/Supabase/DB/provider/Vercel owners per [OWNER_ACTIONS.md](OWNER_ACTIONS.md). |
| Frontend-only PR pipeline | PASS | Actual PR #2 targets integration; one CSS comment accepted. Local protected-file diff rejected. Hosted scope/install/audit/secrets/types/tests/build/browser checks pass. | Run `41313750090`; [GitHub evidence](qa/final-handoff/github-verification.json), [scope pass](qa/final-handoff/scope-frontend-pass.txt), [protected rejection](qa/final-handoff/scope-protected-rejected.txt). Probe closed unmerged. |
| Repository protections | BLOCKED | Adoption/required checks/CODEOWNER enforcement require repository-owner setup/confirmation. Green CI does not enable rules. | Default branch remains main. |
| Live staging smoke/full workflow | BLOCKED | Both staging scripts exit 1 explicitly for missing approved config; no mutations executed. | [staging-smoke.txt](qa/final-handoff/staging-smoke.txt), [staging-flow.txt](qa/final-handoff/staging-flow.txt) |
| Production routes/health | FAIL public probes | `/` 200 HTML; `/tutorial` 404 HTML; `/api/health` 404 HTML, not backend JSON. Read-only at 2026-11-01T13:36:59Z. | [production-probes.json](qa/final-handoff/production-probes.json). Deployed branch/SHA/root/backend URL remain UNVERIFIED. |
| Docker/staging deployment/cutover | NOT TESTED | No image build/deployment; no Vercel admin token supplied; release approval absent. | Prepared runbook does not prove deployed acceptance. |

## 3. Previous problems and remaining defects

- **Project authorization:** corrected on candidate and tested locally/with actual
  migrations; not evidence those migrations are installed live.
- **localStorage-only persistence:** shared state now uses revisioned server snapshots;
  legacy/local copies remain recoverable, conflicts stop sync without silent merge.
  Snapshot/recovery product-boundary approval and live migration remain owner gates.
- **Dependencies:** candidate production audit zero after Next 16.4.3 update; deployed
  application's remediation cannot be confirmed without source provenance.
- **Secrets in Git:** unresolved. Main still tracks the files; no rotation/revocation
  confirmation. Never copy old env files or privileged keys into frontend setup.
- **Other limits:** default-port routing mismatch above, no approved live staging,
  no real OAuth/provider/storage/client-review acceptance. Some presentation/AI mapping
  remains in the workspace page behind stable repository/hook contracts. No additional
  application regression observed within executed scope.

## 4. Fresh-clone handoff drill

1. Remote clone of candidate `ac5acda…`, no copied dependencies/config/builds: PASS.
2. `npm ci`, documented types/tests/both builds: PASS.
3. Real local backend/PDF + production frontend + mock auth/provider browser flow:
   all five Playwright tests PASS.
4. Actual `npm run dev:backend` and `npm run dev:frontend`: direct/proxied JSON and
   tutorial PASS with frontend port 3101. Default port 3000 mismatch FAIL recorded.
5. Created/pushed frontend-only probe branch, opened PR to integration, scope and
   complete hosted CI PASS. Closed unmerged. No file moves or forced history merge.
6. Approved real staging backend/auth/provider connection: BLOCKED, no URL/config/accounts.

Reproducer: [local-start-probe.mjs](qa/final-handoff/local-start-probe.mjs), which
starts/cleans only its own processes. Dummy env verifies process connectivity only.
Next dev regenerated the frontend AGENTS heading and dev type-reference paths;
type generation restores build type references. No auth/data/runtime logic was edited.

## 5. Deployment facts and owner actions

No verified staging URL exists. Production branch/SHA, Vercel root, backend host/URL,
effective BACKEND_URL, OAuth redirects and live schema remain unknown. GitHub default
is not deployment provenance. Proposed split root `frontend/` and Node backend/
private bucket/migrations are described in [DEPLOYMENT_RUNBOOK.md](DEPLOYMENT_RUNBOOK.md).
No production deployment/data mutation or credential rotation performed.

| Owner | Missing action/configuration | Completion evidence |
| --- | --- | --- |
| Repository/integration owner | Adopt split candidate/PR target; enforce checks/CODEOWNER review; approve snapshot/recovery boundary | Owner decision + protected frontend PR |
| Platform/Supabase owner | Provide approved public staging frontend config once; isolated schema/migrations, auth redirects and dedicated accounts | Migration ledger + real auth/RLS/quota/save/storage acceptance |
| Backend/deployment owner | Deploy staging frontend/backend, set HTTPS BACKEND_URL/runtime secrets; verify source SHA/root/long-request limits | Actual staging URLs, direct/proxy JSON and real PDF/provider workflow |
| Security/credential owners | Revoke/rotate exposed credentials and audit logs; put replacements in approved env management | Old credentials rejected; authorized replacements/staging pass; audit recorded |
| QA/release owner | Live concurrency/client review/device acceptance, release approval and rollback record | Signed acceptance and explicit release approval |

Full who/where/how/impact: [OWNER_ACTIONS.md](OWNER_ACTIONS.md). Frontend source
handoff never requires production accounts or privileged secrets.

## 6. Separate readiness decisions

| Readiness | Status | Reason |
| --- | --- | --- |
| A. READY FOR FRONTEND DEVELOPMENT | **BLOCKED for complete real authenticated development** | Local source/regression work can start without backend rewrites. Canonical adoption and approved staging public config/live backend are missing, so real auth/data workspace development cannot be promised. |
| B. READY FOR FRONTEND HANDOFF | **BLOCKED for completed handoff** | Clone→test→frontend-only PR return is proven; docs/contracts/CI exist. Canonical/protection decisions and real staging acceptance still prevent calling integrated handoff complete. |
| C. READY FOR PRODUCTION DEPLOYMENT | **BLOCKED** | Historical security exposure, unknown configuration, failing public health/tutorial, no live acceptance or release approval. |

**Clone → Redesign → Test → Push PR:** possible now on the candidate with local/mock
regression workflow; the real PR return path was exercised. **Team accepts and
deploys as fully verified integration now:** no. Close the specific owner gates
above first; no backend rewrite or forced-history merge is needed.

Exact start/update/PR/rollback commands and environment/boundary guide:
[FRONTEND_HANDOFF.md](FRONTEND_HANDOFF.md).
