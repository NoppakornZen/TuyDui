# Stabilize split API, project authorization, workspace persistence and frontend handoff

**Base:** `feat/uxui-redesign` (`50c5e85684750a1c94a7ab1140703108c26891ef`).
**Head:** `integration/frontend-handoff-2026-11-01`.
Draft integration PR, not a production release request. Main has unrelated Git history.

## Problem and behavior

Authenticated callers could previously process any project ID; shared workspace data
and baseline state lived in the browser. This change enforces caller-token RLS and
owner/editor authorization before processing, adds atomic server-side snapshot
revisions/baselines/rate reservations and private PDF storage, and preserves local
data for recovery. Existing API paths/tasks/FormData fields and UI design remain.

Frontend developers keep the API client and persistence hook while changing presentation.
PR scope checks, CODEOWNERS, type/build/security checks, PostgreSQL migration tests,
mock browser project/PDF/AI flow and optional real staging acceptance are supplied.
Next.js is pinned to 16.4.3; the executed production dependency audit is zero findings.

## Review focus

- Migrations 006–008 must be reviewed/applied to isolated staging, after existing-schema
  comparison and cross-project relationship preflight. No production SQL is executed.
- `project_workspaces.snapshot` is authoritative for current UI state; normalized
  existing tables are preserved, not silently synchronized. Confirm this product boundary.
- Intentional tightening: authenticated AI status, no public live-provider diagnostics,
  UUID project IDs required, no fallback anonymous/unassigned project processing.
- Auth redirects now use `/auth/callback`; owner must update/validate the allowlist.
- Archived local data is exported for manual recovery when both local and shared data exist.
- No paid provider/live OAuth/live Supabase assertions are made from local test fixtures.

## Validation and remaining gates

See `docs/COMPLETION_REPORT.md` and raw evidence under `docs/qa/` for final commands,
PASS/FAIL/NOT TESTED/BLOCKED results and screenshots. Live credentials/staging are
owner-provided; workflow guards fail explicitly when missing.

Required before handoff/release: owner adoption/branch protection, deployed staging
backend+frontend, live acceptance evidence, historical secret revocation/rotation,
reviewed cutover/rollback and explicit production release approval.

Do not merge into unrelated `main`, force push, rewrite history, or deploy production
as part of reviewing this preparation PR.
