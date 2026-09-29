import {tool} from 'ai'
import {z} from 'zod'
import {runLocalFit} from '@/lib/compute-fit'
import {fh2ContradictionNotes, findCase, findModule, loadLocalSeed} from '@/lib/local-seed'

export function shouldUseLocalSeedTools(): boolean {
  if (process.env.DEMO_LOCAL === '1' || process.env.DEMO_LOCAL === 'true') return true
  const token = process.env.SANITY_ORGANIZATION_TOKEN
  const groq = process.env.SANITY_CONTEXT_MCP_URL
  const kb = process.env.SANITY_CONTEXT_KB_MCP_URL
  return !token || (!groq && !kb)
}

export function hasLlmKey(): boolean {
  return Boolean(
    process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY || process.env.GEMINI_API_KEY,
  )
}

export function buildLocalSeedTools() {
  return {
    local_list_modules: tool({
      description:
        'List eurorack modules from local monorepo seed JSON (DEMO_LOCAL / no Sanity MCP). Returns id, slug, name, hp, depthMm.',
      inputSchema: z.object({
        query: z.string().optional().describe('Optional name/slug filter'),
      }),
      execute: async ({query}) => {
        const {modules} = loadLocalSeed()
        const q = (query || '').toLowerCase()
        const rows = modules
          .filter(
            (m) =>
              !q ||
              m.name.toLowerCase().includes(q) ||
              m.slug.current.includes(q) ||
              m.manufacturer.toLowerCase().includes(q),
          )
          .slice(0, 40)
          .map((m) => ({
            _id: m._id,
            slug: m.slug.current,
            name: m.name,
            manufacturer: m.manufacturer,
            hp: m.hp,
            depthMm: m.depthMm,
            powerMa: m.powerMa,
          }))
        return {count: rows.length, modules: rows}
      },
    }),
    local_list_cases: tool({
      description: 'List cases from local monorepo seed JSON with usableHp and railClearanceMm.',
      inputSchema: z.object({
        query: z.string().optional(),
      }),
      execute: async ({query}) => {
        const {cases} = loadLocalSeed()
        const q = (query || '').toLowerCase()
        const rows = cases
          .filter(
            (c) =>
              !q ||
              c.name.toLowerCase().includes(q) ||
              c.slug.current.includes(q) ||
              c.manufacturer.toLowerCase().includes(q),
          )
          .map((c) => ({
            _id: c._id,
            slug: c.slug.current,
            name: c.name,
            manufacturer: c.manufacturer,
            usableHp: c.usableHp,
            railClearanceMm: c.railClearanceMm,
            powerBudgetMa: c.powerBudgetMa,
          }))
        return {count: rows.length, cases: rows}
      },
    }),
    local_get_module: tool({
      description: 'Get one module by slug, id, or free-text name from local seed.',
      inputSchema: z.object({query: z.string()}),
      execute: async ({query}) => {
        const mod = findModule(query)
        if (!mod) return {error: `No module matched ${query}`}
        return mod
      },
    }),
    local_get_case: tool({
      description: 'Get one case by slug, id, or free-text name from local seed.',
      inputSchema: z.object({query: z.string()}),
      execute: async ({query}) => {
        const cas = findCase(query)
        if (!cas) return {error: `No case matched ${query}`}
        return cas
      },
    }),
    local_compute_fit: tool({
      description:
        'Compute a structured fit-verdict from local seed (HP, depth, power, incompatibilities) plus KB contradiction notes when relevant. Prefer this over inventing numbers.',
      inputSchema: z.object({
        moduleQuery: z.string().describe('Module slug or name, e.g. expert-sleepers-fh-2 or FH-2'),
        caseQuery: z.string().describe('Case slug or name, e.g. make-noise-104hp-skiff'),
      }),
      execute: async ({moduleQuery, caseQuery}) => {
        return runLocalFit({moduleQuery, caseQuery})
      },
    }),
    local_kb_contradictions: tool({
      description:
        'Return store-listing vs manual contradiction excerpts for FH-2 depth from kb-sources markdown.',
      inputSchema: z.object({}),
      execute: async () => ({notes: fh2ContradictionNotes()}),
    }),
  }
}

export const LOCAL_SEED_SYSTEM_ADDENDUM = `
## Local seed mode (DEMO_LOCAL / Sanity MCP unavailable)
- Sanity Context MCP is not connected. Use the local_* tools that read monorepo seed JSON/NDJSON and kb-sources markdown.
- Treat seed structured fields (hp, depthMm, powerMa, usableHp, railClearanceMm) as authoritative - same as GROQ would return after import.
- Always call local_compute_fit for pass/fail cards; still emit a \`\`\`fit-verdict\`\`\` fence matching the tool verdict.
- Cite seed document _id values (e.g. module-expert-sleepers-fh-2, case-make-noise-104hp-skiff).
- Surface KB contradiction notes when present (store ~35mm vs manual 51mm vs structured 51mm).
`
