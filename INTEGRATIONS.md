# Integration boundaries

BriefDiff can run without Supabase. The AI adapter is live when `AI_PROVIDER=maxplus` and `MAXPLUSAI_API_KEY` are set on the server.

- `src/services/ai/`: server-side MaxPlusAI Claude Native adapter. `POST /api/ai` runs one task and returns a validated proposal. The key stays in `MAXPLUSAI_API_KEY` and is never sent to the browser.
- `src/services/billing-provider.ts`: subscription checkout and webhook verification.
- `src/services/project-store.ts`: local browser storage now, Supabase/Postgres later.
- `.env.example`: the only configuration surface for Supabase, AI and billing credentials.

Secrets must only be read by server-side code. Never rename a secret to a `NEXT_PUBLIC_*` variable.

The first production setup should fill in Supabase credentials, run the migration in `supabase/migrations`, then configure the AI provider. Billing can remain `manual` while the product is being validated.
