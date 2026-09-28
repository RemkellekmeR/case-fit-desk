# Remmy handoff — Case Fit Desk

**Deadline:** Sat Oct 4, 2026 11:59pm PDT
**Contest:** https://dev.to/challenges/sanity-2026-09-16 Path One
**Repo:** https://github.com/RemkellekmeR/case-fit-desk

RemmyPockets org was not accessible from GitHub MCP; repo is under RemkellekmeR. Transfer later if desired.

## Authoritative source on the build box

- Full scaffold: `/workspace/case-fit-desk` (npm installable; `npm run build` OK)
- Tarball: `/workspace/case-fit-desk-src.tgz`
- Local git is complete. To sync GitHub cleanly after `gh auth login` as RemkellekmeR:

```bash
cd /workspace/case-fit-desk
git push -u origin main --force-with-lease
```

## Blockers (need Remmy)

1. Sanity login (`npx sanity login`) + create free project, public dataset `production`
2. Enable Context: Manage → Labs → Context
3. Org-level Context Viewer token (Manage → API → Tokens at **organization** level — not project token)
4. Two Context MCP endpoints (dataset wins over KB on one endpoint):
   - `case-fit-groq` — dataset source only
   - `case-fit-kb` — Knowledge Base sources only (upload `kb-sources/*.md`)
5. LLM key: `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` / `GEMINI_API_KEY`
6. Vercel deploy with server env vars from `.env.example`
7. DEV.to post later (do not automate)

## Studio + seed

```bash
cd apps/studio
npx sanity login
# set NEXT_PUBLIC_SANITY_PROJECT_ID / SANITY_STUDIO_PROJECT_ID
npx sanity dataset import ../../seed/all.ndjson production --replace
npx sanity schema deploy
npx sanity deploy
```

## Env (server-side only)

```
SANITY_CONTEXT_MCP_URL=
SANITY_CONTEXT_KB_MCP_URL=
SANITY_ORGANIZATION_TOKEN=
NEXT_PUBLIC_SANITY_PROJECT_ID=
NEXT_PUBLIC_SANITY_DATASET=production
LLM_PROVIDER=openai
OPENAI_API_KEY=
```

## Demo prompt

Will Expert Sleepers FH-2 fit in the Make Noise 104HP skiff?
Expect fail on depth (51mm vs 38mm) with Sanity citations; KB may show store (~35mm) vs manual (51mm) contradiction.

Full contest checklist and more detail: see local HANDOFF.md after git push.
