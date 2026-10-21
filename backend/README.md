# TuyDui backend

Standalone Node.js/TypeScript HTTP API. Requires Node.js 22.14 or newer.
It has no Next.js or React dependency.

Install dependencies from the repository root with `npm install`, then run
`npm run setup:env`. Set the private credentials in `backend/.env.local`.

```bash
cd backend
npm run dev
```

The API listens on http://localhost:4000. `PORT` and `HOST` are configurable.

| Endpoint | Methods | Purpose |
| --- | --- | --- |
| `/api/health` | GET | Health check |
| `/api/ai` | GET, POST | Provider status and AI tasks |
| `/api/documents` | POST | PDF extraction |
| `/api/changes` | POST | Review a brief or PDF change |
| `/api/ai/analyze-change` | POST | Older change classification endpoint |

All POST endpoints require `Authorization: Bearer <Supabase access token>`.
The frontend proxies requests, so the browser does not require cross-origin access.
GET provider status retains its existing behavior.

`npm run build` compiles to `dist/`; `npm start` runs the compiled server.
`npm test` builds and tests HTTP behavior. `npm run check` checks types.
Deploy independently as a Node.js service with `npm run build` and `npm start`.
Set secrets through the hosting environment and set the frontend's `BACKEND_URL`
to the backend's public origin before building the frontend.

`supabase/migrations/` and database scripts live here. Run `npm run db:setup`,
`npm run db:migration`, or `npm run db:collaboration` from this directory when needed.
These commands retain the existing database-script behavior; they are not run at startup.

PDF copies and AI usage logs live in `backend/data/`. Use persistent storage for
deployments that need these files. The existing rate limit is per process and
resets when the backend restarts.
