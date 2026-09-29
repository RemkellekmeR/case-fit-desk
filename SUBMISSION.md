# Sanity Challenge — Path One submission draft

**Do not publish until Remmy fills placeholders and reviews.**  
Tag: `#sanitychallenge`  
Template inspiration: contest Path One prompt on https://dev.to/challenges/sanity-2026-09-16

---

## Title

Case Fit Desk: an eurorack case-fit agent that refuses to invent HP, depth, or milliamps

## Subtitle / elevator

Before buying another module, ask if it fits *your* case. Sanity Context MCP queries structured `module` / `case` docs (and a Knowledge Base with a deliberate depth contradiction) so the agent returns cited pass/fail verdict cards.

## Links

| Field | Value |
| --- | --- |
| GitHub repo | https://github.com/RemkellekmeR/case-fit-desk |
| Live agent URL | _TODO: Vercel URL_ |
| Sanity project ID | _TODO_ |
| Public dataset URL | _TODO: https://\<projectId\>.api.sanity.io/v2021-06-07/data/query/production?query=*%5B0%5D_ |
| Deployed Studio | _TODO: https://case-fit-desk.sanity.studio_ |
| Context MCP (GROQ) | _TODO: endpoint name / org (no token)_ |
| Context MCP (KB) | _TODO_ |

## Description

### The weird human problem

Modular synthesizer shoppers buy 8HP of joy and discover it does not physically fit: too deep for the skiff, not enough HP left, PSU already gasping, or a neighbor that blocks the jacks. Forums are full of vibes; vendors occasionally disagree with their own manuals.

### Why Sanity Context

- **GROQ mode** over typed documents: `hp`, `depthMm`, `powerMa`, `railClearanceMm`, `powerBudgetMa`, `incompatibleWith`
- **Knowledge Base mode** (second MCP endpoint) indexes a store listing vs manual excerpt that contradict on FH-2 depth
- One endpoint cannot serve both (dataset wins), so the agent connects to **two** Context MCPs and routes by tool descriptions

### Agent behavior

- Returns **fit verdict cards** (pass/fail/warn/insufficient_data) with numbers + citations
- **Never invents** missing structured specs
- Server-side only: Vercel AI SDK + `@ai-sdk/mcp`

### Stack

Next.js App Router, Vercel AI SDK (`ai@6`, `@ai-sdk/mcp@1`), Sanity Studio, OpenAI/Anthropic/Gemini via env.

## Demo script for judges

1. Open the live agent.
2. Ask: “Will Expert Sleepers FH-2 fit in the Make Noise 104HP skiff?”
3. Expect **fail** on depth (51mm vs 38mm) with Sanity document citations.
4. Ask to compare store listing vs manual depth — KB should surface the contradiction; structured data remains authoritative.
5. Ask about Maths in the Erica 84HP case — expect **pass** on HP/depth with remaining HP noted.
6. Optionally open Studio Vision and run:

```groq
*[_type == "module" && name match "FH-2"][0]{name, hp, depthMm, powerMa}
*[_type == "case" && slug.current == "make-noise-104hp-skiff"][0]{name, usableHp, railClearanceMm, powerBudgetMa}
```

## Team

- Remmy / Jamey Kael — _TODO DEV handles_

## Notes / honesty

Built with AI agents for scaffolding; product logic and schema are intentional for Path One judging (structured content + Context + KB).
