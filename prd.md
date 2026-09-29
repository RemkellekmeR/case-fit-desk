---
doc: prd
status: approved
---

# Case Fit Desk — Product Requirements

Case Fit Desk is a eurorack case-fit agent for modular shoppers: ask whether a module fits a named case, get cited pass/fail/warn/insufficient_data cards from Sanity structured content (and optional KB prose). Source: `scope.md > The Unique Kernel`, `Who It's For`, `The Core Loop`.

## The Core Journey

1. Arrive at the web app (local http://localhost:3000 or a future host) and read the hero: Case Fit Desk checks HP, depth, power, and incompatibilities without inventing specs.
2. First use: either click **Demo (seed data)** for a deterministic FH-2 vs Make Noise 104HP skiff check, or type / tap a suggestion such as “Will Expert Sleepers FH-2 fit in the Make Noise 104HP skiff?”
3. Core loop: the agent (or `/api/fit`) resolves module + case from structured data, compares HP / depth / power / incompatibility rules, and emits a fit verdict card with citations.
4. Optional: ask to compare store listing vs manual vs structured depth for FH-2 — KB/contradiction notes surface ~35mm vs 51mm; structured `depthMm: 51` remains authoritative and the skiff (38mm clearance) fails.
5. Success: a clear status (pass / fail / warn / insufficient_data), numbers the user can verify, and document ids / KB labels — enough to decide buy / measure / edit Studio.

## Screens and Layout

Single page (`apps/web/app/page.tsx`):

- **Hero** — badges, title, short purpose copy
- **Fit check chat** (left panel) — message list, suggestion chips, Demo button, composer textarea, Check fit / Clear
- **Fit verdict cards** (right panel) — cards from Demo and/or latest assistant `fit-verdict` fences; empty state lists what cards show
- **Footer note** — MCP vs Demo seed / HANDOFF pointer

No separate settings, auth, or catalog browser screens. Sanity Studio is a separate app (`apps/studio`) for editors, not part of the shopper chat surface.

## Look and Feel

Dark rack-desk UI (`globals.css`): background `#0c0f14`, panels `#141a24`, text `#e8eef8`, muted `#9aa8bd`, accent mint `#7ee0c3` / blue `#8ab4ff`, status pass `#3dd68c` / fail `#ff6b7a` / warn `#f5c542`. Typography: IBM Plex Sans + ui-monospace for citations. Two-column layout collapsing to one on narrow viewports. Copy is practical and slightly nerdy; no marketplace chrome.

## Features and Behavior

### Fit check chat

- User sends free-text fit questions; suggestions prefill common demos (FH-2 vs skiff, Maths vs Erica 84HP, FH-2 depth compare, Blck_Noir + arbhar power on skiff).
- When Sanity Context MCP + LLM are configured, `/api/chat` streams an agent reply with GROQ/KB tools and a ` ```fit-verdict ` JSON fence the UI parses into cards.
- When `DEMO_LOCAL=1` or MCP env is missing: chat uses local seed tools **if** an LLM key is present; otherwise chat returns a clear 503 pointing at `POST /api/fit`.
- **Demo (seed data)** always calls `POST /api/fit` for FH-2 vs Make Noise skiff — no LLM required — and shows the verdict plus KB contradiction notes.

### Fit verdict cards

- Statuses: `pass` | `fail` | `warn` | `insufficient_data`
- Metrics: HP (module / usable / remaining if alone), depth (mm vs max clearance), power (+12 / +5 / −12 vs budget), incompatibilities, citations, summary
- Fail if HP, depth, or a hard incompatibility fails; warn for soft power / advisory incompat when HP/depth pass; insufficient_data when required structured fields are missing — **never invent** HP, depth, or power

### Structured content (Sanity Studio)

Editors maintain:

- **Eurorack Module** — name, manufacturer, slug, hp, depthMm, powerMa (+12/+5/−12), incompatibleWith refs, notes, sources
- **Eurorack Case** — name, manufacturer, slug, usableHp, rows, railClearanceMm, powerBudgetMa, formFactor, notes
- **Incompatibility Rule** — title, modules (≥2 refs), severity hard/soft/advisory, reason, sourceNote

Project `fdonr7im`, dataset `production`, Studio https://case-fit-desk.sanity.studio/

### Context MCP + KB contradiction

- `case-fit-groq` — dataset GROQ (authoritative specs)
- `case-fit-kb` — Knowledge Base only (`kb-sources` store vs manual FH-2 depth)
- Two endpoints because dataset wins over KB on a single Context endpoint

## States and Boundaries

- **First use / empty chat** — assistant bubble explains structured-only pass/fail and points to Demo (seed data)
- **Demo success** — fail card for FH-2 vs skiff (51 > 38) plus contradiction notes when relevant
- **Chat error** — error bubble with message; MCP/LLM misconfig surfaces hint toward HANDOFF / `/api/fit`
- **Insufficient data** — card status `insufficient_data`; agent must not invent missing fields
- **Persistence** — no saved user racks or accounts; chat is session UI state; catalog lives in Sanity (or local seed JSON)
- **Secrets** — org Context token and LLM keys are server-only; never ship to the browser

## Product Decisions

- **Structured docs beat marketing copy** — KB may contradict; structured `depthMm` wins for pass/fail
- **Two MCP endpoints** — required by Context dataset-over-KB behavior, not optional complexity
- **Local DEMO_LOCAL / `/api/fit`** — contest vertical slice works without waiting on every cloud blockers
- **No invented catalog types** — only module, case, incompatibility
- **Honest deploy status** — production Vercel + LLM live path called out as incomplete until Remmy finishes HANDOFF

## What We're Building

Everything already in the POC boundary: Studio schemas + seed (~40 modules, 3 cases, 3 rules), kb-sources contradiction, Next.js chat + verdict cards, dual MCP client, local seed tools and `/api/fit`, system prompt that forbids inventing specs. Planning docs for Build With AI: Basics describe this as-built product.

## Deferred From the POC

- Account system / saved “my case” profiles
- Full multi-module rack planner (remaining HP/power across many neighbors beyond solo + simple power notes)
- Public production Vercel URL as a hard requirement of the Basics planning slice (optional for contest; blocked on Remmy keys/env)

## Possible Later Enhancements

Richer incompatibility graph tooling; more cases/modules; Studio-side validation UX; completed live deploy with both MCP endpoints wired in Vercel env.

## Non-Goals

- Manufacturer as its own Sanity document type — out of scope; string field is enough
- Auth, shopping cart, marketplace, buy buttons — fit advice only
- Inventing missing HP/depth/power in the agent — explicit product rule
- Submitting Devpost / DEV.to from the agent — Remmy-owned (HANDOFF / SUBMISSION)
- Claiming Live deploy complete when Vercel/LLM production is still incomplete

## Open Questions

- **Production Vercel URL + LLM key in production** — still incomplete; must be answered before claiming a public live demo (can wait for ship; local/demo is enough for as-built planning). Source: HANDOFF.md blockers.
- **Org Context Viewer token + real MCP URLs in every environment** — Remmy-owned; local DEMO_LOCAL covers the vertical slice meanwhile.
- Contest dual-write (Sanity Path One + Build With AI Basics docs) — intentional; do not merge submission flows.
