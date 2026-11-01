# TuyDui integration contract (v1, additive workspace API)

Source candidate: `integration/frontend-handoff-2026-11-01`, base `50c5e85`.
Browser API calls MUST use `frontend/src/lib/api.ts` and same-origin `/api/*`.
Next.js rewrites forward requests to the server-only `BACKEND_URL` set **before build**.
No browser `BACKEND_URL`, AI credential, service role key or privileged database key.

## Authentication and authorization

`Authorization: Bearer <Supabase access token>` is required except for health.
The API verifies the token with Supabase Auth; it does not merely decode a JWT.
Database queries/RPCs use the caller's token and public anon key, preserving RLS.
Project IDs are UUIDs from `projects.id`. Owner or accepted owner/editor membership
is required for processing/saves; accepted viewers can load workspace data.
Missing/invalid/expired credentials: 401; insufficient project permission: 403;
malformed project ID: 400; unavailable auth/database/rate-limit service: 503.
No anonymous fallback project and no client-supplied `userId` attribution.
Nested nonempty project IDs must match the authorized project.

## HTTP endpoints

| Method/path | Request | Success |
| --- | --- | --- |
| GET `/api/health` | none; public, no provider/database dependency | `{ "status":"ok", "service":"tuydui-backend" }` |
| GET `/api/ai` | authenticated; optional `?usage=1` | provider/model/configured status; optional caller-only local usage summary |
| POST `/api/ai` | JSON task payload below | `{task, proposalOnly:true, data, usage}` |
| POST `/api/documents` | FormData `file` (PDF), `projectId` (UUID) | `{proposalOnly:true, document, pageCount, data:Requirement[], usage}` |
| POST `/api/changes` | JSON `{projectId,text,requirements,nodes,members}` OR multipart `file`, `context` (JSON with same fields); `projectId` may also be a form field | `{proposalOnly:true, document?, data:ChangeReview, usage}` |
| POST `/api/ai/analyze-change` | legacy JSON `{projectId,rawRequest,currentRequirements?}`; `currentScope` remains supported | `{mode:"provider",proposalOnly:true,data,usage}` |
| GET `/api/workspace?projectId=<UUID>` | token; member read | `{snapshot:WorkspaceState|null,revision:number}`; absent row returns null/0 |
| PUT `/api/workspace` | JSON `{projectId,revision,snapshot:WorkspaceState}` | `{revision: number}`; atomic next revision |

Health means the HTTP process is alive, **not** that AI/Supabase are configured.
All responses have `Cache-Control: no-store`. Unknown path: JSON 404; unsupported
method: JSON 405 with Allow; oversized HTTP body: 413 (13 MiB total).

### AI tasks (names preserved)

All tasks require project authorization; except draft, top-level `projectId` is required.

| Task | Other request fields | `data` |
| --- | --- | --- |
| `extract_requirements` | `text`, `document?:{id,name,version,sourceType}` | `Requirement[]` |
| `classify_client_message` | `rawRequest`, `currentRequirements`, optional `nodes,members` | `ChangeProposal` |
| `analyze_change_impact` | same | `ImpactItem[]` |
| `compare_requirement_pair` | `current:Requirement[]`, `incoming:[{title,description,category?,sourceQuote?,page?}]` | settled diffs and pending semantic decisions |
| `draft_change_explanation` | `change:{projectId,rawRequest,summary,classification,...}`, `existingScopeSummary?` | string |
| `suggest_project_structure` | `requirements`, optional `members` | `SuggestedNode[]` |

Canonical exact TypeScript schemas: `backend/src/services/ai/contract.ts`,
`backend/src/domain/models.ts`; validation: `backend/src/services/ai/validate.ts`.
`Requirement` has `id,projectId,title,description,category,clarity,evidence,suggestedRoles,approved`.
Evidence retains `documentId,page?,quote`; never invent source references.
`ChangeReview` retains `classification,magnitude,summary,explanation,confidence,clientMessage,edits`.
Node, requirement and member IDs supplied in a context remain stable.
AI output is a proposal; neither an AI response nor PDF upload confirms a baseline.

### Workspace persistence

`WorkspaceState` is defined in `frontend/src/lib/workspace-state.ts`:
`nodes,edges,requirements,changes,history,nodeNotes,documents,zoom,pan,baselineConfirmed`.
`project_workspaces.snapshot` is the current UI workspace source of truth.
Existing normalized tables are preserved and are **not** silently backfilled or
assumed synchronized with the snapshot. Normalized imports need a separate reviewed migration.
The immutable `baseline_snapshots` row is created in the same transaction as the
first save with `baselineConfirmed:true`; the project timestamp is updated there.
PUT requires the last loaded revision; 409 means another save won. Never auto-retry
with a newer revision or overwrite another user's work.

`WorkspaceRepository` loads the server before allowing autosave. A legacy local
workspace is imported only when the server has no snapshot; original IDs remain.
If both exist, server wins and local data is archived under
`briefdiff-recovery-<userId>-<projectId>` (earlier archives receive timestamp suffixes).
Local data is never forcibly deleted. Export retained data for manual recovery;
there is no automatic merge/import over an existing shared workspace.
After a save failure/conflict, local editing is retained and server sync stops;
reload reconciles from server, retaining a recovery copy.

### PDF, storage and limits

Only PDFs with `%PDF-` signature, 1 byte–12 MiB and selectable text are supported.
Scanned/image-only PDFs fail explicitly (OCR is not supplied).
Private bucket: `project-documents`; paths `<projectUUID>/<documentUUID>.pdf`.
Versions are allocated under a database row lock in `project_documents`.
Upload/storage failures are errors, never successful local-file fallbacks.
Metadata may be returned with a provider error so an uploaded brief can be recovered.
The new manifest is additive; old on-disk PDFs need an owner-supervised import if
any exist on a previous backend host. Do not claim old blobs have been migrated.

AI quota: 5 reservations/hour and 10/day per account across workers, stored in
`ai_request_reservations`, serialized in PostgreSQL. Failed provider attempts count
as reservations. Clients must honor 429 + `Retry-After`; no automatic paid retries.
Private PDF reservations independently allow 5/hour and 10/day per account inside
the public database RPC; deleting failed manifests does not reset that quota.
Provider JSON parsing may retry once within a shared timeout budget. UI uses busy
state and elapsed time, no fabricated completion percentage.

### Errors and compatibility

Errors retain `{error:string}` and may include `resetIn` or `document`.
400 invalid input; 401 auth; 403 project access; 409 save conflict; 413 size;
422 unreadable PDF/invalid provider output; 429 quota; 502 upstream failure;
503 unconfigured/unavailable dependency; 504 timed-out AI request.
`GET /api/ai?live=1` is now 403 (operator dashboard only); global unauthenticated
usage is intentionally closed. Previously implicit project fallbacks are removed.
Existing frontend calls already supply the real project UUID. External clients
must add it and tokens before cutover. Existing paths/task names/FormData names,
table names and invite/quota RPC names are preserved.

## Supabase browser contract

Tables: `projects`, `project_members`, `project_invites`, `profiles` (RLS protected).
Project creation: `create_project_with_free_limit(project_name,project_client_name,project_description)`.
Sharing: `lookup_invite(invite_code_input)`, `accept_project_invite(invite_code_input)`.
Do not replace creation with direct inserts. Project quota is checked by both RPC
and insert trigger; shared projects do not count. Existing project use is allowed.
Auth: Google OAuth → `<frontend-origin>/auth/callback` → validated stored local
redirect or `/projects`. Old redirect origins must remain allowed during staging
validation. Supabase session refresh/storage remains SDK-managed.

Contract changes require paired client/server tests, CODEOWNER review and this
document updated; additive changes first, staging validation before retiring aliases.
