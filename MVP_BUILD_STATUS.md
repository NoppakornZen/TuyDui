# TuyDui build status

This file says what the submitted app actually does. It is not a feature list for the product vision.

The running app is the Next.js workspace at `/workspace`. The old static prototype is kept under `legacy/` for reference and is not the entry point.

## Working now

- A text-based PDF can be uploaded and read on the server. A scanned PDF with no text layer returns an error.
- Extracted requirements stay proposals. Each PDF requirement keeps a page number and a short quote from that page.
- The app builds a project map from those requirements: one project node, phases, and smaller branches.
- The map can be zoomed, panned, and dragged. Selecting a card shows its summary.
- A later text brief or PDF is reviewed against the current map before the map changes.
- The user must apply the review. Cancel leaves the map unchanged.
- A request that is already covered, or too vague, does not change the map.
- A major new system produces a client note that says the cost will increase and why. The note has no price, hours, or deadline.
- AI output is validated on the server. One invalid response is retried once. The API key stays on the server.
- The hosted demo is https://tuydui.vercel.app. The map and history in that demo are stored in the browser.

## Present but not part of the live flow

- `src/domain/requirement-match.ts` can match identical requirements in code. The current change-review screen does not call it.
- `supabase/migrations/001_initial.sql` is a schema draft. The app does not connect to Supabase.
- `src/domain/scope-engine.ts` defines baseline rules. Confirming the baseline in the interface only sets a local flag.

## Not built

- Accounts and team permissions.
- Production database storage.
- An immutable baseline enforced by the database.
- A public page where a client approves scope.
- Payments or subscriptions.
- A permanent audit log.
- Reading scanned PDFs.
- A measured accuracy score for the AI. No benchmark is included.
