## What changed

Describe affected routes and behavior; attach 1440/768/390 screenshots for UI changes.

## Scope and validation

- Branch target is the adopted split baseline (no unrelated-history merge).
- Frontend-only branches use `frontend/...` and the `frontend-only` label.
- State/auth/API wiring, stable IDs, task/FormData fields and local recovery are preserved.
- Typecheck, tests, builds, secret checks and dependency audit: attach actual results.
- Staging preview URL and actual backend JSON health: attach evidence.
- If protected integration files change, request CODEOWNER review and describe compatibility/migration.

## Live acceptance / release

Distinguish fixture tests from real OAuth/AI/Supabase tests. List NOT TESTED/BLOCKED
items and link the staging acceptance evidence. Production release requires owner
approval, credential remediation and the deployment/rollback runbook.
