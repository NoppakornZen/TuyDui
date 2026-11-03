# Owner actions required before handoff / production

No secret values appear in this report. Local credentials of unknown provenance and
historically exposed keys were not used to contact or mutate the production database.
On 2026-11-03 the Vercel project, latest production deployment metadata and production
environment variable **names** were inspected read-only through the authenticated CLI/API.
No values were read or printed and no project setting was changed; evidence is in
[qa/2026-11-03/](qa/2026-11-03/).

| Owner | Where / action | Verification | Impact if not done |
| --- | --- | --- | --- |
| Repository owner | Review/adopt candidate split branch; set default/target branch and CODEOWNER/required-check/no-direct-push rules in GitHub Settings → Rules | A frontend-only PR is blocked for protected files; required Integration checks and owner review are enforced | YAML alone cannot enforce the team workflow |
| Vercel/deployment owner | Provenance verified read-only on 2026-11-03: Root Directory `.`, no project Git link, latest production `dpl_3Kq7F4DUT1Pp2s91jBdYp5Ge33rt` built 2026-10-11 from dirty `main@e456eef`, no `BACKEND_URL`/`NEXT_PUBLIC_APP_URL` configured. Remaining: decide CLI vs Git deployment, adopt the split branch, set Root Directory `frontend/`, configure public env and HTTPS `BACKEND_URL`, and deploy only with approval | Read deployment metadata and env names in authenticated Vercel; confirm a split deployment serves backend JSON at `/api/health` and `/tutorial` 200; record branch/SHA/root | Production stays on the stale monolith and the split cannot be released |
| Supabase / platform owner | Provision isolated staging project, compare schema, back up, apply 001–008 as appropriate; provision private PDF bucket and dedicated accounts | Migration ledger plus read/write RLS and RPC checks from runbook | New APIs intentionally fail closed when migrations/config are absent |
| Backend owner | Choose approved Node/Docker hosting and deploy reviewed staging image; set URL/public anon key/provider runtime vars in its secret manager | Backend `/api/health` JSON plus authenticated workspace/AI/PDF tests | Frontend cannot use a real backend |
| Frontend/Vercel owner | Separate staging deployment, Root Directory `frontend/`, root-lockfile install, staging `BACKEND_URL` before build and public Supabase vars | Proxy health matches backend JSON; tutorial/login/projects/workspace load | Current production still has missing tutorial/backend routes |
| Supabase + Google OAuth owner | Add exact staging `/auth/callback` to Supabase redirect allowlist and configure Google provider callback; preserve legacy approved callback during transition | Real Google sign-in, session refresh/reload and sign-out on a dedicated test account | Mock authentication tests cannot establish real OAuth readiness |
| AI provider owner | Revoke/rotate exposed `MAXPLUSAI_API_KEY`; audit provider usage/billing/logs for historical access | Old key rejected, replacement works only through server staging env, logs reviewed | Exposed key may still permit abuse/charges |
| Supabase owner | Rotate exposed `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_SECRET_KEY`, `SUPABASE_JWT_SECRET` as applicable to project key model; rotate/reissue affected anon/publishable keys alongside JWT changes and coordinate session impact | Old privileged keys rejected; user sessions and new public keys validated in staging; no privileged browser bundle key | Historical credentials can bypass RLS; rotation may invalidate sessions unless coordinated |
| Database owner | Rotate exposed `POSTGRES_PASSWORD` and credential-bearing `POSTGRES_URL`, `POSTGRES_PRISMA_URL`, `POSTGRES_URL_NON_POOLING`; audit DB/auth logs | Old credentials fail, new connections work, all authorized consumers updated | Historical database access remains possible |
| Vercel owner | Review historical `VERCEL_OIDC_TOKEN` exposure/expiry and usage/audit logs; revoke active credentials if applicable | No reusable exposed token remains; provider audit reviewed | Token lifetime/use cannot be assumed from filename/history |
| Security/repository owner | Enable secret scanning/push protection, repository secret store, audit all refs/forks/caches; decide history cleanup with collaborators | New commit guard passes and credential rotation recorded; cleanup plan approved | Deleting files alone never revokes old keys; history remains accessible |
| QA + product owner | Run dedicated-account live/staging suite and document legacy local-data/old-PDF import ownership; approve current snapshot-as-source-of-truth boundary | Staging evidence covers quota concurrency, PDF/AI, sharing, revisions, baseline, recovery | Local fixtures do not prove live integration; old data recovery may require manual review |
| Release owner | Approve production release only after blockers close; record cutover/rollback IDs and backups | Signed release checklist and post-cutover health/workflow checks | Production release is not authorized or ready |

Evidence: `origin/main` contains `.env.local.backup` (AI settings/key) and
`.env.production` (AI, Supabase, database URLs/password and Vercel deployment/OIDC
variable names). Names alone are not proof that a value is currently valid; owner
must determine issuance, exposure period, expiry and revoke/rotate appropriately.
No force push/history rewrite is performed or proposed as an automatic action.

## Product/data decisions

- New `project_workspaces.snapshot` stores the existing UI state without rewriting its
  synthetic requirement/node IDs into normalized UUID tables. Normalized tables remain
  preserved but are not auto-synchronized. Approve this explicit boundary before release,
  or commission a versioned normalized import with ID mapping and recovery tests.
- If both local and shared data exist, shared data wins and local data is archived/exportable.
  Automatic merging is intentionally not implemented: a project owner must review recovered
  edits before manually reapplying them. No local data is forcibly cleared.
- Confirm whether old backend hosts have on-disk PDFs requiring a supervised private-bucket
  import. The agent cannot inspect unidentified hosts or claim those files were migrated.
