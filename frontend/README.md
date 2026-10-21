# TuyDui frontend

Next.js UI, browser authentication, project collaboration, and static assets.
Install dependencies from the repository root with `npm install`, then run
`npm run setup:env` to create local configuration without replacing existing files.

```bash
cd frontend
npm run dev
```

Open http://localhost:3000. Run the backend in another terminal on port 4000.
`BACKEND_URL` in `.env.local` points the `/api/*` proxy at that backend. Set it
to the deployed backend URL before a production build. Browser requests stay
on the frontend origin and carry the Supabase bearer token through the proxy.

Only public Supabase configuration belongs here. AI keys and the Supabase
service role key belong in `backend/.env.local`.

`npm run check` checks types. `npm run build` builds the frontend.
`npm start` serves that production build. Deploy with this directory as the
Next.js project root and install dependencies using the root workspace lockfile.

Project data still uses the Supabase browser SDK and its RLS policies, as in the
existing application. The separate backend owns AI, PDF processing, and admin credentials.
