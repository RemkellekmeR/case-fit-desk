---
doc: scope
status: approved
---

# Case Fit Desk

Before you buy another eurorack module, check whether it fits *your* case — HP, depth after the rails, power milliamps, and known incompatibilities — using structured Sanity content and an agent that refuses to invent missing specs.

## The Unique Kernel
Fit answers come from typed Sanity documents (`module`, `case`, `incompatibility`) queried through Sanity Context MCP (GROQ for authoritative numbers; a second KB-only MCP for manuals/store prose), rendered as cited pass / fail / warn / insufficient_data verdict cards. Marketing copy never silently overrides structured `depthMm` / `hp` / power.

## Who It's For
A modular synthesizer shopper (Remmy’s contest persona: someone about to click “buy” on another 8HP module) who today relies on forum vibes, optimistic store listings, and partial manuals — and sometimes discovers the module is too deep for a skiff, eats the remaining HP, or fights a neighbor.

## The Core Loop
Open Case Fit Desk → ask “will *this* module fit *this* case?” (or tap a suggestion / Demo seed button) → agent retrieves structured fields (and optional KB contradiction notes) → read a fit verdict card with numbers and citations → decide whether to buy, measure, or edit Studio content. Come back for the next candidate module or another case in the rack.

## Inspiration & Identity
Dark, practical rack-shop energy: IBM Plex Sans, monospace citations, mint/blue accents, pass-green / fail-pink / warn-amber status chips. Tone: concise, slightly nerdy, no sales pitch. Contest framing badges (Sanity Challenge · Path One, Context MCP · GROQ + KB). Demo beat: Expert Sleepers FH-2 vs Make Noise 104HP skiff fails on depth (51mm > 38mm) while KB shows store ~35mm vs manual 51mm.

## Why This Matters to the Learner
Remmy built Case Fit Desk for Sanity Challenge Path One and is capturing as-built planning docs for Build With AI: Basics — proving structured content + Context MCP can drive a trustworthy fit agent, not inventing another marketplace.

## What "Working" Looks Like
Locally: `npm run dev` (and optional Studio) with seed data; **Demo (seed data)** or chat returns a fail card for FH-2 vs Make Noise skiff with citations; optional chat with an LLM key uses either Sanity Context MCPs or `DEMO_LOCAL` seed tools. Studio at https://case-fit-desk.sanity.studio/ on project `fdonr7im` / `production`. Production Vercel + full LLM-backed live demo may still be incomplete — say so honestly; do not claim Live deploy if not done.

## The POC Boundary
- Three Sanity document types: Eurorack Module, Eurorack Case, Incompatibility Rule
- Seed catalog (~40 modules, 3 cases, 3 rules) + `kb-sources` FH-2 contradiction
- Next.js chat UI + fit verdict cards; server-only MCP / LLM
- Two Context MCP endpoints: `case-fit-groq` (dataset) and `case-fit-kb` (KB only)
- Local `DEMO_LOCAL` / `POST /api/fit` path when MCP or cloud is unavailable

## Later
Broader catalog curation, multi-module rack planning (shared remaining HP/power across neighbors), richer Studio editorial workflows, and a completed public Vercel deploy once Remmy finishes HANDOFF blockers.

## Explicitly Cut
- **Manufacturer document type** — manufacturer is a string on module/case; no separate doc type
- **Auth / accounts / saved racks** — single shared catalog + chat session; no login
- **Marketplace, shopping cart, affiliate buy links** — fit advice only, not commerce
- **Claiming production Live deploy as done** — Vercel + LLM production path still incomplete per HANDOFF; local/demo path is the honest working slice
