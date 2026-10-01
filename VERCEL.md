# Vercel wiring — Case Fit Desk

No secrets in git. `.env` / `.env.local` are gitignored. Use Vercel Project → Settings → Environment Variables.

## Import

1. Import https://github.com/RemkellekmeR/case-fit-desk
2. Keep **Root Directory** = repo root (this repo’s `vercel.json` already sets install/build for the monorepo)
3. Framework: Next.js (auto)
4. Build: `npm run build --workspace=apps/web` (from `vercel.json`)
5. Node 20.x

## Env vars to paste (Production + Preview)

Copy names from `.env.example`. Required for Path One live judge path:

| Name | Notes |
| --- | --- |
| `SANITY_CONTEXT_MCP_URL` | GROQ/dataset Context MCP |
| `SANITY_CONTEXT_KB_MCP_URL` | KB-only Context MCP |
| `SANITY_ORGANIZATION_TOKEN` | org Context Viewer token (not project token) |
| `NEXT_PUBLIC_SANITY_PROJECT_ID` | `fdonr7im` |
| `NEXT_PUBLIC_SANITY_DATASET` | `production` |
| `OPENAI_API_KEY` **or** `ANTHROPIC_API_KEY` **or** `GEMINI_API_KEY` | Remmy drops one |
| `LLM_PROVIDER` | `openai` / `anthropic` / `google` matching the key |
| `DEMO_LOCAL` | `0` on production so chat uses real Context MCPs |

Optional: `SANITY_API_WRITE_TOKEN`, model overrides from `.env.example`.

## After first deploy

1. Smoke the judge prompts in `DEV_POST.md`
2. Paste URL into `SUBMISSION.md` + `DEV_POST.md` as **LIVE_URL**
3. Ping Dig with the live URL
4. Remmy must explicitly approve DEV Publish — do not auto-submit

## Local mirror (box)

Secrets live in `.env.local` on the build box only. When Remmy provides an LLM key, set it there and in Vercel the same day.
