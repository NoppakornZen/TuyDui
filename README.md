# TuyDui

## Frontend and backend projects

The repository contains two npm workspaces that run and deploy independently:

```text
frontend/       Next.js UI, browser auth, public assets
backend/        Node.js API, AI/PDF services, private credentials
  supabase/     Database migrations
scripts/        Commands that start both projects and prepare local env files
```

The frontend runs on port 3000 and proxies `/api/*` to the backend on port 4000.
Set `BACKEND_URL` in `frontend/.env.local` before building for a different backend.
See [frontend/README.md](frontend/README.md) and [backend/README.md](backend/README.md)
for separate run and deployment instructions. Older setup documents describe the
previous single-project deployment and should be read with this structure in mind.

TuyDui is a workspace for a project manager who receives a client brief and needs to see the work before agreeing to it. The app reads the brief, lists the requirements with their source pages, and arranges them as a map of branches.

**🔐 Production version now requires login** – Try it at [https://tuydui.vercel.app](https://tuydui.vercel.app).

⚠️ **Current Status:** Ready for beta testing with real users. **Not ready for paid launch** – missing billing system and complete legal documents. See `SETUP.md` for deployment steps.

The running app is the Next.js route at `/workspace`. Files under `legacy/` are an old static prototype and are not used. `docs/product-vision.md` is the earlier product direction, not a list of finished features. `MVP_BUILD_STATUS.md` says what this submission does today.

## ✨ What's New (Production-Ready Features)

- ✅ **Google OAuth Login** – Users must login before using AI features
- ✅ **Rate Limiting** – 10 AI requests/day, 5 requests/hour per user (free tier)
- ✅ **Database Schema** – Supabase migration ready (`supabase/migrations/001_initial.sql`)
- ✅ **Secure API Routes** – All AI endpoints protected with authentication
- ✅ **Privacy Policy & Terms** – Draft versions in `PRIVACY.md` and `TERMS.md`

## How a request moves

1. The browser sends the PDF or pasted text through the frontend proxy to the separate Node.js backend.
2. `unpdf` reads the text layer, one page at a time. A scanned page with no text is rejected.
3. The server sends that text and a fixed instruction to the MaxPlusAI Claude-compatible API. The model must return one JSON object.
4. The server checks the JSON before the browser sees it. If it is invalid, the server asks once more. It does not invent missing fields.
5. The browser lays the returned branches out as a map and stores the workspace in `localStorage`.
6. A later brief goes through the same check. The map changes only after the user presses **Apply to current map**.

The model proposes requirements, structure, and a change classification. It does not confirm scope, choose a price, or contact the client. Requirement ids and node ids in a review must come from the input; unknown ids are dropped.

## What it does

- Reads a text-based PDF, or pasted brief text, and proposes one requirement per distinct request.
- Quotes the source page for a PDF requirement. It does not treat the proposal as approved scope.
- Builds a project map with a project node, phases, and smaller branches.
- Lets the user zoom, pan, and drag the map.
- Compares a later brief with the current map before changing anything.
- Leaves the map unchanged when the request is already covered or too vague.
- Updates the affected branches after the user applies the review. A whole new system can also add branches, and it includes a client note.
- Writes a client-ready note only when the request adds a whole new system. The note says the cost will increase and why. It never includes a price, hours, or a deadline.

TuyDui proposes and explains. It does not confirm scope, calculate a price, or send anything to a client.

## Prerequisites

- [Node.js 22.14 or newer](https://nodejs.org/)
- npm, which is included with Node.js
- An API key for the configured AI provider, if you want extraction and map generation to work locally
- **For production:** Supabase account for authentication and database

The hosted demo already has the server-side AI configuration. Local extraction, map generation, and change review need the key below.

## Run it locally

```bash
npm install
npm run setup:env
npm run dev
```

To run the projects in separate terminals from the repository root:

```bash
npm run dev:frontend
npm run dev:backend
```

The setup command creates `frontend/.env.local` and `backend/.env.local` without
replacing existing files. It also migrates values from an older root `.env.local`
when present. Root `.env.local` is no longer loaded by either running project.
Set public Supabase values in the frontend and private credentials in the backend:

```text
# backend/.env.local
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
AI_PROVIDER=maxplus
AI_MODEL=claude-opus-5
MAXPLUSAI_API_KEY=your_key_here
MAXPLUSAI_BASE_URL=https://api.maxplus-ai.cc
MAXPLUSAI_POOL=claude-native

# frontend/.env.local
BACKEND_URL=http://127.0.0.1:4000
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

Private keys belong only in `backend/.env.local`. Do not commit env files. Each
project has its own `.env.example` listing the variables it needs.

The combined command starts both services:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The backend health check is
[http://localhost:4000/api/health](http://localhost:4000/api/health).

To check types without starting the server:

```bash
npm run check
```

To run a production build locally:

```bash
npm run build
npm start
```

## How to use it

1. Open the workspace and go to **Requirements**.
2. Upload a PDF that contains selectable text, then choose **Read PDF**. TuyDui stores the proposals and builds the map.
3. Or paste brief text, choose **Extract from text**, review the proposals, choose **Add for review**, and then choose **Build map** on the map page.
4. Open **Project map**. Scroll to zoom, right-drag to move, and select a card to read its summary.
5. To review later feedback, open **Changes**, paste a new brief or upload another PDF, and choose **Review**.
6. Read the summary first. Choose **Apply to current map** to update the affected branches, or **Cancel** to leave the map unchanged.
7. If the result is a whole new system, copy the client note and send it yourself. TuyDui does not send it.

A scanned PDF with no text layer cannot be read. The app shows an error instead of guessing.

On a local machine, original PDFs are saved under `backend/data/documents/`.
Existing local PDFs and usage logs have moved with the backend. Configure persistent
storage on the backend host when these files need to survive redeployment.

## Known limits

- Authentication and shared project data require a configured Supabase project and its RLS policies.
- Supabase migrations live in `backend/supabase/migrations/`.
- Billing variables in `backend/.env.example` are unused.
- A scanned PDF cannot be read.
- The app does not report an accuracy score. There is no benchmark in this repository.
- `backend/src/domain/requirement-match.ts` can match identical text in code, but the current review screen asks the model directly.
- The hosted deployment needs the server-side API key and available provider credit. If that call fails, extraction and review fail with the provider error.

## Built with

- Next.js 16
- React 19
- TypeScript
- unpdf, for reading text from PDFs
- MaxPlusAI's Claude-compatible API, using the `claude-opus-5` model
- Vercel, for the hosted demo

## AI assistance

Claude, through Claude Code, was used as a coding assistant while building this repository. It helped write and revise the Next.js workspace, the PDF extraction route, the map layout, the change-review flow, and these docs. I decided what the product should and should not do, checked the behavior, and prepared the submission. No model was trained for this project.

# Sat Oct  3 16:42:21 SEAST 2026
