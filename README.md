# TuyDui

TuyDui turns a client brief into a project map. A project manager uploads a PDF or pastes the brief text. The app extracts the requirements and breaks them into branches, so the work is easier to scan than a long document.

A hosted demo is available at [https://tuydui.vercel.app](https://tuydui.vercel.app). No installation is needed to try it.

The demo keeps the map, requirements, and history in the browser. It does not create accounts. Refreshing the page keeps that browser's saved workspace. Uploaded PDF files are read for their text and are not stored on the hosted server.

## What it does

- Reads a text-based PDF, or pasted brief text, and proposes one requirement per distinct request.
- Quotes the source page for a PDF requirement. It does not treat the proposal as approved scope.
- Builds a project map with a project node, phases, and smaller branches.
- Lets the user zoom, pan, and drag the map.
- Compares a later brief with the current map before changing anything.
- Leaves the map unchanged when the request is already covered or too vague.
- Updates only the affected branches after the user applies a small change.
- Writes a client-ready note only when the request adds a whole new system. The note says the cost will increase and why. It never includes a price, hours, or a deadline.

TuyDui proposes and explains. It does not confirm scope, calculate a price, or send anything to a client.

## Prerequisites

- [Node.js 20.9 or newer](https://nodejs.org/)
- npm, which is included with Node.js
- An API key for the configured AI provider, if you want extraction and map generation to work locally

The hosted demo already has the server-side AI configuration. Local extraction, map generation, and change review need the key below.

## Run it locally

```bash
npm install
cp .env.example .env.local
```

On Windows PowerShell, copy the file with:

```powershell
Copy-Item .env.example .env.local
```

Open `.env.local` and set these server-side values:

```text
AI_PROVIDER=maxplus
AI_MODEL=claude-opus-5
MAXPLUSAI_API_KEY=your_key_here
MAXPLUSAI_BASE_URL=https://api.maxplus-ai.cc
MAXPLUSAI_POOL=claude-native
```

The key must stay in `.env.local`. Do not put it in frontend code or commit it. `.env.example` lists the variable names only.

Then start the app:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

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

The Supabase and billing variables in `.env.example` are reserved for later. This version does not use them.

## Built with

- Next.js 16
- React 19
- TypeScript
- unpdf, for reading text from PDFs
- MaxPlusAI's Claude-compatible API, using the `claude-opus-5` model
- Vercel, for the hosted demo

## AI assistance

Claude, through Claude Code, was used as a coding assistant for parts of the implementation, including the workspace interface, PDF extraction flow, map layout, and change-review flow. The assistant did not decide product scope or submit the project. No model was trained for this project.
