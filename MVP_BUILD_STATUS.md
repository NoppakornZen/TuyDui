# BriefDiff MVP Build Status

The visual prototype remains the current runnable entry point (`index.html`). The next implementation layer is now in place:

- `src/domain/models.ts` defines the core product entities.
- `src/domain/scope-engine.ts` contains pure scope and baseline rules.
- `src/services/ai-provider.ts` defines the replaceable server-side AI contract.
- `src/services/project-store.ts` defines storage behind an adapter.
- `supabase/migrations/001_initial.sql` defines the first production database schema and owner policies.

## Next implementation order

1. Create a Next.js application shell and move the existing workspace UI into React components.
2. Connect the map to `ProjectSnapshot` data and replace demo-only map persistence.
3. Apply the Supabase migration and add authentication.
4. Add project/team/document CRUD.
5. Server-side PDF processing is still next. The MaxPlusAI Claude Native adapter is in place: `POST /api/ai` validates model output and records token usage in `data/ai-usage.jsonl`.
6. Add baseline confirmation, scope decisions, approval snapshots, and audit events.

The AI adapter intentionally throws a clear configuration error until a server-side provider is configured. No API key belongs in the browser.
