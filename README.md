# Case Fit Desk

**Sanity Challenge 2026 — Path One** agent: before you buy another eurorack module, know if it fits *your* case.

- Structured content in Sanity: `module`, `case`, `incompatibility`
- Agent harness: Next.js App Router + Vercel AI SDK + `@ai-sdk/mcp`
- Sanity Context MCP: **GROQ mode** for authoritative HP / depth / power, plus an optional **second KB-only MCP** for manual/store prose (dataset wins over KB on a single endpoint, so we use two)
- Fit verdict cards: pass / fail / warn / insufficient_data with citations — **never invents missing specs**

Contest: https://dev.to/challenges/sanity-2026-09-16  
Due: Sat Oct 4, 2026 11:59pm PDT

> Remmy submits the DEV.to post later. This repo is the build / demo asset. Do **not** submit from this scaffold alone without filling Sanity project IDs.

## Repo layout

```
apps/studio/     Sanity Studio v4+ (schemas + deploy)
apps/web/        Next.js agent UI + /api/chat
seed/            NDJSON/JSON importables (~40 modules, 3 cases, 3 rules)
kb-sources/      Demo markdown with deliberate FH-2 depth contradiction
HANDOFF.md       Exact Remmy steps: Sanity login → Context → Vercel
SUBMISSION.md    DEV.to Path One template placeholders
```

## Quick start (local, after Sanity exists)

```bash
cp .env.example .env.local   # fill values — see HANDOFF.md
npm install
npm run seed:validate
npm run dev:studio           # http://localhost:3333
npm run dev                  # http://localhost:3000
```

Import seed (from `apps/studio`, after `sanity login` + project id set):

```bash
cd apps/studio
npx sanity dataset import ../../seed/all.ndjson production --replace
npx sanity schema deploy
npx sanity deploy
```

## Environment variables

| Var | Where | Purpose |
| --- | --- | --- |
| `SANITY_CONTEXT_MCP_URL` | server | GROQ/dataset Context MCP endpoint |
| `SANITY_CONTEXT_KB_MCP_URL` | server | Optional KB-only Context MCP endpoint |
| `SANITY_ORGANIZATION_TOKEN` | server | **Org-level** Context Viewer token (not project token) |
| `NEXT_PUBLIC_SANITY_PROJECT_ID` | studio + web | Sanity project id |
| `NEXT_PUBLIC_SANITY_DATASET` | studio + web | usually `production` |
| `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` / `GEMINI_API_KEY` | server | At least one LLM key |
| `LLM_PROVIDER` | server | `openai` \| `anthropic` \| `google` |

Never commit secrets. Tokens stay server-side only.

## Why structured content matters here

Keyword search cannot safely answer “will FH-2 fit my Make Noise skiff?” You need:

1. Numeric `depthMm` vs `railClearanceMm`
2. `hp` vs `usableHp`
3. Per-rail `powerMa` vs `powerBudgetMa`
4. Explicit incompatibility refs
5. Optional KB contradiction: store listing claims ~35mm; manual excerpt says **51mm**; structured doc agrees with the manual

The agent is instructed to refuse pass/fail when structured fields are missing.

## Demo prompts

- Will Expert Sleepers FH-2 fit in the Make Noise 104HP skiff?
- Does Maths fit the Erica 84HP case on HP and depth?
- Compare FH-2 depth: store listing vs manual vs structured module doc.
- Can Blck_Noir and arbhar share the Make Noise skiff power budget?

## Deploy

1. Complete HANDOFF.md (Sanity project, Studio deploy, Context MCPs, org token).
2. Push this repo (already public under the GitHub account that created it).
3. Import to Vercel → set env vars → deploy `apps/web` (Root Directory: `apps/web`) or use the monorepo install at repo root with `npm run build --workspace=apps/web`.

## License

MIT
