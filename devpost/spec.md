---
doc: spec
status: approved
---

# Case Fit Desk — Technical Spec

## How This Works, In Plain Language

Case Fit Desk has three cooperating pieces:

1. **Sanity Studio** (`apps/studio`) — editors enter eurorack modules, cases, and incompatibility rules as structured documents (project `fdonr7im`, dataset `production`).
2. **Sanity Context MCP** — two HTTP MCP endpoints the server connects to: one GROQ/dataset (`case-fit-groq`) for authoritative HP / depth / power, and one Knowledge Base-only (`case-fit-kb`) for manual/store markdown. Dataset wins over KB on a single endpoint, so we keep two.
3. **Next.js web app** (`apps/web`) — chat UI talks to `/api/chat` (LLM + MCP or local seed tools) and `/api/fit` (deterministic seed fit). The UI parses `fit-verdict` JSON fences into cards.

This shape stays small: one shopper page, server-only secrets, and a local DEMO_LOCAL / seed path when cloud MCP or LLM is not ready. PRD ref: `prd.md > The Core Journey`.

## The Core Journey Through the System

1. User opens the Next.js page → React `Chat` component loads.
2. **Demo path:** browser `POST /api/fit` with FH-2 + Make Noise skiff slugs → `runLocalFit` reads monorepo seed JSON → `computeFitVerdict` → JSON verdict + contradiction notes → `FitVerdictCard`.
3. **Chat + MCP path:** browser `POST /api/chat` → server connects both Context MCPs (`lib/mcp.ts`), builds system prompt with initial contexts (`lib/system-prompt.ts`), `streamText` with MCP tools → model emits prose + ` ```fit-verdict ` → UI extracts cards.
4. **Chat + local seed path:** if `DEMO_LOCAL=1` or MCP env missing, and an LLM key exists → same chat route uses `local_*` tools (`lib/local-tools.ts`) over seed/kb-sources instead of MCP.
5. User sees fail for FH-2 vs skiff when depth 51mm > rail clearance 38mm; citations point at document ids / KB file labels.

PRD ref: `prd.md > The Core Journey`.

## Stack

| Piece | Choice | Why / notes |
| --- | --- | --- |
| Monorepo | npm workspaces `apps/*` | Studio + web share seed at repo root |
| Studio | Sanity `^5.31.2`, `@sanity/vision`, React 19 | Schemas + Vision; Studio host `case-fit-desk` |
| Web | Next.js `^15.5` App Router, React 19 | Server routes for MCP/LLM |
| Agent | Vercel AI SDK `ai@^6`, `@ai-sdk/mcp@^1`, `@ai-sdk/react`, provider packages OpenAI/Anthropic/Google | Streaming chat + MCP tools |
| Validation | Zod `^3.25` | Local tool schemas |
| Runtime | Node `>=20.19` | Workspace engines field |

Docs: https://www.sanity.io/docs · https://www.sanity.io/docs/ai/sanity-context · https://sdk.vercel.ai/

## Where It Runs and How Someone Tries It

**Runtime:** Browser UI + Node.js Next server. Studio is separate (`sanity dev` / hosted Studio).

**Environment (see `.env.example`):**

- `NEXT_PUBLIC_SANITY_PROJECT_ID=fdonr7im`, `NEXT_PUBLIC_SANITY_DATASET=production`
- `SANITY_CONTEXT_MCP_URL`, `SANITY_CONTEXT_KB_MCP_URL`, `SANITY_ORGANIZATION_TOKEN` (org Context Viewer)
- At least one of `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` / `GEMINI_API_KEY`, plus `LLM_PROVIDER`
- `DEMO_LOCAL=1` for seed-tool chat / when MCP unset

**Local start:**

```bash
cp .env.example .env.local   # fill values — HANDOFF.md
npm install
npm run seed:validate
npm run dev:studio           # http://localhost:3333
npm run dev                  # http://localhost:3000
```

**Demo recording beat:** open the app → **Demo (seed data)** or ask “Will Expert Sleepers FH-2 fit in the Make Noise 104HP skiff?” → expect **fail** depth 51 > 38 with citations; optional depth-compare prompt for store vs manual vs structured.

**Deploy status (honest):** Sanity project + Studio https://case-fit-desk.sanity.studio/ exist. Public GitHub: `RemkellekmeR/case-fit-desk`. **Production Vercel + production LLM wiring remain incomplete** until Remmy finishes HANDOFF (env vars, deploy). Do not claim Live deploy done. Deployment is optional for Build With AI Basics; local demo + public repo satisfy the planning/demo posture described here.

## Look and Feel

As implemented in `apps/web/app/globals.css` and `page.tsx`: dark panels, mint/blue accents, pass/fail/warn chips, IBM Plex Sans + monospace citations, two-column chat | verdicts layout. Interface copy matches system prompt tone — practical, concise, slightly nerdy. No design-system package; plain CSS variables. Consistent with Stack (no Tailwind requirement in-repo).

PRD ref: `prd.md > Look and Feel`.

## Components

### Sanity Studio schemas

Document types `module`, `case`, `incompatibility` under `apps/studio/schemaTypes/`. Deployed Studio + `sanity schema deploy` required for GROQ Context.

PRD ref: `prd.md > Features and Behavior > Structured content (Sanity Studio)`.

### Next.js page + Chat UI

`app/page.tsx` hero + `<Chat />`. `components/chat.tsx` uses `useChat` / `DefaultChatTransport` → `/api/chat`, suggestion chips, Demo button → `/api/fit`, parses verdicts via `parse-verdicts.ts`.

PRD ref: `prd.md > Screens and Layout`, `Fit check chat`.

### FitVerdictCard

`components/fit-verdict-card.tsx` renders status, HP/depth/power metrics, incompatibilities, citations.

PRD ref: `prd.md > Fit verdict cards`.

### `/api/chat`

`app/api/chat/route.ts` — MCP or local tools + `streamText`; closes MCP clients on finish/error.

### `/api/fit`

`app/api/fit/route.ts` — pure local seed fit; GET/POST; no LLM.

### compute-fit / local-seed / local-tools

`lib/compute-fit.ts` implements HP/depth/power/incompat status rules and FH-2 contradiction summary. `lib/local-seed.ts` loads seed JSON. `lib/local-tools.ts` exposes `local_*` AI tools when DEMO_LOCAL / MCP missing.

### MCP connector

`lib/mcp.ts` — `createMCPClient` HTTP transport with Bearer org token; prefixes KB tools; strips duplicate `initial_context` tool in favor of fetched initial-context text.

### System prompt

`lib/system-prompt.ts` — Case Fit Desk rules, fit-verdict fence schema, tool routing, never invent specs.

## Data Model

### `module` (Eurorack Module)

| Field | Type | Notes |
| --- | --- | --- |
| name, manufacturer | string | required |
| slug | slug | from name |
| hp | number | required integer HP |
| depthMm | number | required; behind panel |
| powerMa | object | plus12, plus5, minus12 (mA) |
| incompatibleWith | ref[] → module | optional neighbors |
| notes | text | optional |
| sources | {label, url}[] | citation sources |

Lives in Sanity dataset `production` (and mirrored in `seed/modules.ndjson` / `modules.json`). Updated in Studio or via `sanity dataset import`. Demo: `module-expert-sleepers-fh-2` has `depthMm: 51`.

### `case` (Eurorack Case)

| Field | Type | Notes |
| --- | --- | --- |
| name, manufacturer | string | required |
| slug | slug | |
| usableHp | number | required |
| rows | number | optional |
| railClearanceMm | number | max module depth |
| powerBudgetMa | object | plus12, plus5, minus12 |
| formFactor, notes | string/text | optional |

Seed cases include `make-noise-104hp-skiff` (`railClearanceMm: 38`), `intellijel-7u-104hp`, `erica-84hp`.

### `incompatibility` (Incompatibility Rule)

| Field | Type | Notes |
| --- | --- | --- |
| title | string | required |
| modules | ref[] → module | min 2 |
| severity | hard \| soft \| advisory | default hard |
| reason | text | required |
| sourceNote | string | optional |

Three seed rules in `seed/incompatibilities.ndjson`.

### Fit verdict (UI/API shape)

Emitted as JSON inside `fit-verdict` fences / `/api/fit` response: `status`, `moduleName`, `caseName`, `hp`, `depth`, `power`, `incompatibilities`, `citations`, `summary`. Not stored; computed per request. Session chat messages are client state only.

### Knowledge Base sources (files, not Sanity docs)

`kb-sources/store-listing-fh2-skiff.md` (~35mm claim) and `kb-sources/manual-excerpt-fh2-depth.md` (51mm). Attached to KB-only MCP in production Context setup; local path reads via `fh2ContradictionNotes()`.

## File Structure

```
case-fit-desk/
├── apps/
│   ├── studio/
│   │   ├── sanity.config.ts
│   │   ├── sanity.cli.ts
│   │   └── schemaTypes/
│   │       ├── index.ts
│   │       ├── module.ts
│   │       ├── case.ts
│   │       └── incompatibility.ts
│   └── web/
│       ├── app/
│       │   ├── layout.tsx
│       │   ├── page.tsx
│       │   ├── globals.css
│       │   └── api/
│       │       ├── chat/route.ts
│       │       └── fit/route.ts
│       ├── components/
│       │   ├── chat.tsx
│       │   └── fit-verdict-card.tsx
│       └── lib/
│           ├── mcp.ts
│           ├── system-prompt.ts
│           ├── compute-fit.ts
│           ├── local-seed.ts
│           ├── local-tools.ts
│           ├── parse-verdicts.ts
│           └── models.ts
├── seed/                 # NDJSON/JSON (~40 modules, 3 cases, 3 rules)
├── kb-sources/           # FH-2 store vs manual contradiction markdown
├── scripts/validate-seed.mjs
├── docs/architecture.md
├── HANDOFF.md
├── SUBMISSION.md
├── README.md
├── scope.md / prd.md / spec.md
└── devpost/              # Build With AI workspace (learner-profile gitignored)
    ├── scope.md
    ├── prd.md
    ├── spec.md
    └── learner-profile.md
```

## External Services and Dependencies

| Service | Usage | Keys / notes |
| --- | --- | --- |
| Sanity Content Lake | project `fdonr7im`, dataset `production` | public read for contest; write via Studio / import token |
| Sanity Studio hosted | https://case-fit-desk.sanity.studio/ | `npx sanity deploy` |
| Sanity Context MCP | GROQ endpoint + KB-only endpoint | `SANITY_ORGANIZATION_TOKEN` (org Context Viewer, not project token); docs: https://www.sanity.io/docs/ai/sanity-context |
| LLM provider | OpenAI / Anthropic / Gemini via AI SDK | server-side API key; `LLM_PROVIDER` |
| Vercel (optional) | host `apps/web` | env from `.env.example`; **production deploy incomplete** |
| GitHub | https://github.com/RemkellekmeR/case-fit-desk | public repo |

No client-side Sanity or LLM credentials.

## Important Failure Modes

- **MCP / org token missing or wrong** → chat falls back to DEMO_LOCAL seed tools if enabled, or 500/503 with HANDOFF hint; `/api/fit` still works from seed.
- **No LLM key while using chat** → 503 JSON explaining Demo `/api/fit` path.
- **Missing structured HP/depth** → `insufficient_data` status; agent instructed not to invent numbers.
- **KB vs structured contradiction** → cite both; structured depth wins for fail/pass (FH-2 demo).

## What Was Simplified and Why

- **Solo-install power check** instead of full rack neighbor accounting — enough for contest demo; fuller version needs saved rack state and multi-module power aggregation.
- **Manufacturer as string** instead of a manufacturer document type — avoids extra schema/join for POC.
- **Local seed mirror + DEMO_LOCAL** instead of requiring cloud MCP for every demo — Remmy blockers (login, org token, Vercel) must not block the vertical slice.
- **Single chat page** instead of catalog browser / account app — kernel is the fit question, not inventory UX.

## Decisions and Open Issues

**Decisions**

- Dual Context MCP endpoints — learner/product requirement from Sanity Context behavior (dataset wins over KB).
- Fit-verdict fence format — agreed contract between system prompt and UI parser.
- Never invent specs — product rule encoded in prompt + insufficient_data status.
- As-built planning docs for Build With AI Basics while primary contest track remains Sanity Path One.

**Learner uncertainty / clarification**

Dual-endpoint MCP was the non-obvious concept: one Context MCP with a dataset source ignores KB. Clarified in README/HANDOFF and implemented as two env URLs in `lib/mcp.ts`. Evidence: working dual-connect code + kb-sources contradiction demo.

**Still open**

- Production Vercel URL and production LLM key wiring (from `prd.md > Open Questions`) — Remmy HANDOFF; do not claim Live.
- Ensuring both MCP endpoints + KB build are verified in each environment Remmy uses for the contest video.
