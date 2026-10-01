# Remmy handoff — Case Fit Desk

You (Remmy) must complete these steps; the executor cannot create a Sanity project or mint org tokens without your login.

**Deadline:** Sat Oct 4, 2026 11:59pm PDT  
**Contest:** https://dev.to/challenges/sanity-2026-09-16 Path One  
**Repo:** https://github.com/RemkellekmeR/case-fit-desk  
(RemmyPockets org was not accessible from GitHub MCP; created under `RemkellekmeR`. Transfer later if desired.)

## Blockers for the agent (need you)

1. **Sanity account login** on the build box or your machine (`npx sanity login`)
2. **Create Sanity project** (free tier OK), public dataset `production`
3. **Enable Sanity Context** for the org: Manage → Labs → Context
4. **Mint org-level Context Viewer token** (Manage → API → Tokens at **organization** level — not a project token)
5. **LLM API key** (`OPENAI_API_KEY` preferred; Anthropic or Gemini also supported)
6. **Vercel deploy** (or other host) with server env vars

## Step-by-step

### A. Sanity project + Studio

```bash
cd apps/studio
npx sanity login
npx sanity init --project-plan free   # or create in https://www.sanity.io/manage and paste project id
```

Set in repo root `.env.local` and optionally `apps/studio/.env`:

```
NEXT_PUBLIC_SANITY_PROJECT_ID=<id>
NEXT_PUBLIC_SANITY_DATASET=production
SANITY_STUDIO_PROJECT_ID=<id>
SANITY_STUDIO_DATASET=production
```

Update `sanity.config.ts` / `sanity.cli.ts` already read these env vars.

```bash
# from apps/studio
npx sanity dataset import ../../seed/all.ndjson production --replace
npx sanity schema deploy     # required for GROQ Context MCP
npx sanity deploy            # hosted Studio — also required for Path One GROQ Context
```

Studio hostname suggestion: `case-fit-desk`.

### B. Context MCP endpoints (two)

Docs: https://www.sanity.io/docs/ai/sanity-context

Important: **one MCP endpoint cannot usefully serve both dataset + Knowledge Base** — if a dataset source is attached, it wins and KB sources are ignored. Create **two** MCPs in the Context app:

1. **`case-fit-groq`** — source = dataset `<projectId>.production`  
   Tools: `initial_context`, `groq_query`, `schema_explorer`, …
2. **`case-fit-kb`** — sources = Knowledge Base only (no dataset)

Copy each endpoint URL (shape like):

`https://api.sanity.io/vX/context/organizations/<orgId>/mcp/<endpointName>`

Env:

```
SANITY_CONTEXT_MCP_URL=<groq endpoint>
SANITY_CONTEXT_KB_MCP_URL=<kb endpoint>
SANITY_ORGANIZATION_TOKEN=<org Context Viewer token>
```

### C. Knowledge Base (demo contradiction)

1. Create a Knowledge Base in the Context app.
2. Upload / attach files from `kb-sources/`:
   - `store-listing-fh2-skiff.md` (claims ~35mm skiff-friendly)
   - `manual-excerpt-fh2-depth.md` (claims **51mm**)
3. Build the KB; resolve any issues if prompted.
4. Attach that KB **only** to the `case-fit-kb` MCP.

Structured `module-expert-sleepers-fh-2` has `depthMm: 51` — agent should cite contradiction and fail skiff fit from structured depth.

### D. LLM keys

```
LLM_PROVIDER=openai
OPENAI_API_KEY=...
# or ANTHROPIC_API_KEY / GEMINI_API_KEY
```

### E. Local smoke test

```bash
npm install
npm run dev
```

Open http://localhost:3000 — try: “Will Expert Sleepers FH-2 fit in the Make Noise 104HP skiff?”

Expect: **fail** on depth (51 > 38), citations to Sanity ids, optional KB notes on listing vs manual.

### F. Vercel

1. Import `RemkellekmeR/case-fit-desk`
2. Root Directory: leave repo root; Build Command: `npm run build --workspace=apps/web`; Output: Next default for `apps/web`  
   **or** set Root Directory to `apps/web` and install from workspace carefully.
3. Add all server env vars from `.env.example` (see also `VERCEL.md`).
4. Deploy. Paste public URL into `SUBMISSION.md` / `DEV_POST.md` as **LIVE_URL**.

### G. DEV.to (Remmy only — do not automate)

Paste from `DEV_POST.md`, publish with tag `#sanitychallenge` only after Remmy explicitly says Publish. Include:

- Sanity project ID and/or public dataset URL
- Deployed Studio URL
- Agent / app URL (**LIVE_URL**)
- Short note that Context uses **two** MCP endpoints (GROQ + KB)

## Contest checklist

- [x] Public GitHub repo
- [x] Public Sanity dataset + deployed Studio
- [x] Schema deployed (`sanity schema deploy`)
- [x] Context enabled + org Context Viewer token
- [x] GROQ MCP endpoint working
- [x] KB built + KB-only MCP endpoint working
- [ ] Agent deployed; demo prompts work
- [ ] SUBMISSION.md / DEV_POST.md LIVE_URL filled; DEV post published by Remmy
- [x] No secrets in git

## What the executor already did

- Scaffolded monorepo (Studio schemas, Next agent, seed, KB markdown, docs)
- Created public GitHub repo
- Validated seed JSON structure (`npm run seed:validate`)
- Filled Sanity IDs in SUBMISSION; added paste-ready DEV_POST.md + VERCEL.md

## What remains blocked without Remmy

- LLM API key (OpenAI / Anthropic / Gemini)
- Vercel production deploy (wiring documented in `VERCEL.md`; secrets only in Vercel UI / local `.env.local`)
- Explicit **Publish** on DEV.to (`DEV_POST.md` is paste-ready once LIVE_URL is real)

Already done on Builder rails: public repo, Sanity project `fdonr7im`, Studio, seeded public dataset, Context MCPs + org token in local env, SUBMISSION.md IDs filled.

## Sync note (executor → Remmy)

Full scaffold lives on the build box at `/workspace/case-fit-desk` (local git commit ready) and as `/workspace/case-fit-desk-src.tgz`.

If GitHub is missing any files after MCP uploads, from a machine with `gh auth login` as RemkellekmeR:

```bash
cd /workspace/case-fit-desk   # or extract the tarball
git remote -v                 # origin → https://github.com/RemkellekmeR/case-fit-desk.git
git push -u origin main       # or --force-with-lease if rewriting probe commits
```
