# TuyDui

TuyDui is a workspace for a project manager who receives a client brief and needs to see the work before agreeing to it. The app reads the brief, lists the requirements with their source pages, and arranges them as a map of branches.

Try it at [https://tuydui.vercel.app](https://tuydui.vercel.app).

The running app is the Next.js route at `/workspace`. Files under `legacy/` are an old static prototype and are not used. `docs/product-vision.md` is the earlier product direction, not a list of finished features. `MVP_BUILD_STATUS.md` says what this submission does today.

## How a request moves

1. The browser sends the PDF or pasted text to a Next.js route on the server.
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

On a local machine, the original PDF is also saved under `data/documents/`. The hosted server reads the PDF in memory and does not keep that file, because its disk is read-only. The extracted requirements and the map remain in the browser.

## Known limits

- There are no accounts. The workspace is local to the browser.
- The Supabase file in `supabase/migrations/` is a schema draft. This app does not connect to it.
- Billing variables in `.env.example` are unused.
- A scanned PDF cannot be read.
- The app does not report an accuracy score. There is no benchmark in this repository.
- `src/domain/requirement-match.ts` can match identical text in code, but the current review screen asks the model directly.
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
