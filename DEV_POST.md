# Paste-ready DEV.to draft — Sanity Challenge Path One

**Remmy: review, add your DEV handle, then Publish yourself.**  
Tag required: `#sanitychallenge`  
Contest: https://dev.to/challenges/sanity-2026-09-16  
Do **not** publish until Remmy explicitly says to Publish.

---

## Title

Case Fit Desk: an eurorack case-fit agent that refuses to invent HP, depth, or milliamps

## Body (paste below)

Modular shoppers buy 8HP of joy and find out it does not fit: too deep for the skiff, not enough HP left, or the PSU is already gasping. Forums are vibes; manuals and store listings sometimes disagree.

**Case Fit Desk** is a Path One agent that answers “will this module fit *my* case?” using **Sanity structured content + Context MCP** — not keyword trivia.

### Why structured content

- Typed `module` / `case` docs: `hp`, `depthMm`, `powerMa`, `railClearanceMm`, `powerBudgetMa`, `incompatibleWith`
- Agent returns **fit verdict cards** (pass / fail / warn / insufficient_data) with numbers and citations
- It **never invents** missing specs

### Why two Context MCPs

One Context endpoint cannot usefully serve dataset + Knowledge Base together (dataset wins). So we use:

1. **GROQ / dataset MCP** — authoritative fit math  
2. **KB-only MCP** — store listing vs manual prose with a deliberate FH-2 depth contradiction

Structured depth stays authoritative when the KB conflicts.

### Links judges need

| | |
| --- | --- |
| GitHub | https://github.com/RemkellekmeR/case-fit-desk |
| Live agent | https://case-fit-desk.vercel.app |
| Sanity project ID | `fdonr7im` |
| Public dataset (sample query) | https://fdonr7im.api.sanity.io/v2021-06-07/data/query/production?query=*%5B_type%20==%20%22module%22%5D%5B0...3%5D%7Bname%2Chp%2CdepthMm%7D |
| Studio | https://case-fit-desk.sanity.studio/ |

### How to test (judges)

1. Open https://case-fit-desk.vercel.app.
2. Ask: “Will Expert Sleepers FH-2 fit in the Make Noise 104HP skiff?”  
   Expect **fail** on depth (51mm vs 38mm) with Sanity citations.
3. Ask to compare store listing vs manual depth — KB should surface the contradiction; structured data wins.
4. Ask about Maths in the Erica 84HP case — expect **pass** on HP/depth with remaining HP noted.
5. Optional Studio Vision:

```groq
*[_type == "module" && name match "FH-2"][0]{name, hp, depthMm, powerMa}
*[_type == "case" && slug.current == "make-noise-104hp-skiff"][0]{name, usableHp, railClearanceMm, powerBudgetMa}
```

### Stack

Next.js App Router, Vercel AI SDK (`ai` + `@ai-sdk/mcp`), Sanity Studio, OpenAI/Anthropic/Gemini via env.

### Team

Remmy / Morgan Kael — DEV handle: **TODO_DEV_HANDLE**

### Honesty

Scaffolded with AI agents; schema, seed, KB contradiction, and “never invent specs” behavior are intentional for Path One.

`#sanitychallenge`

---

## Remmy Publish gate

- [x] LIVE_URL set: https://case-fit-desk.vercel.app  
- [ ] DEV handle filled  
- [ ] Remmy explicitly said **Publish** (Builder will not publish for you)
