# TuyDui frontend

Next.js presentation, browser Supabase auth/RLS, and same-origin API client.
See [Frontend handoff](../docs/FRONTEND_HANDOFF.md) for the complete current workflow.

Install from repository root with `npm ci`. Copy `.env.example` to `.env.local` in
this directory using approved staging values. Never expose server credentials.

```sh
npm run dev:frontend
npm run check --workspace frontend
npm run build --workspace frontend
npm run start:frontend
```

Default UI: localhost:3000. Default backend proxy target: localhost:4000.
Set server-only `BACKEND_URL` before building; Vercel builds require explicit HTTPS.
Browser APIs go through `src/lib/api.ts`, which supplies the current Supabase token.
Protected browser routes use AuthProvider and Google callback `/auth/callback`.
Shared state uses `workspace-repository.ts` and `use-workspace-sync.ts`; preserve
this wiring during layout changes. Local storage is a retained recovery cache.

[API contract](../docs/API_CONTRACT.md) · [Deployment runbook](../docs/DEPLOYMENT_RUNBOOK.md)

Candidate split branch requires owner adoption. Neither passing local builds nor
fixture-based browser tests prove production or live staging integration is ready.
