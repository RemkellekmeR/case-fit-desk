# Case Fit Desk

**Sanity Challenge 2026 — Path One** agent: before you buy another eurorack module, know if it fits *your* case.

- Structured content in Sanity: `module`, `case`, `incompatibility`
- Agent harness: Next.js App Router + Vercel AI SDK + `@ai-sdk/mcp`
- Sanity Context MCP: **GROQ mode** for authoritative HP / depth / power, plus an optional **second KB-only MCP** for manual/store prose (dataset wins over KB on a single endpoint, so we use two)
- Fit verdict cards: pass / fail / warn / insufficient_data with citations — **never invents missing specs**

Contest: https://dev.to/challenges/sanity-2026-09-16
Due: Sat Oct 4, 2026 11:59pm PDT

Repo layout, env vars, demo prompts, and deploy steps: see full files in the monorepo (`HANDOFF.md`, `SUBMISSION.md`). Local source of truth on the build box: `/workspace/case-fit-desk` (npm installable; `npm run build` succeeds).

## Quick start (after Sanity exists)

```bash
cp .env.example .env.local
npm install
npm run seed:validate
npm run dev:studio
npm run dev
```

## License

MIT
