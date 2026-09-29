import {existsSync, readFileSync} from 'node:fs'
import {join} from 'node:path'

export type PowerRails = {
  plus12: number | null
  plus5: number | null
  minus12: number | null
}

export type SeedModule = {
  _id: string
  _type: 'module'
  name: string
  manufacturer: string
  slug: {_type: 'slug'; current: string}
  hp: number | null
  depthMm: number | null
  powerMa: PowerRails
  notes?: string
  incompatibleWith?: Array<{_ref: string}>
}

export type SeedCase = {
  _id: string
  _type: 'case'
  name: string
  manufacturer: string
  slug: {_type: 'slug'; current: string}
  usableHp: number | null
  rows?: number
  railClearanceMm: number | null
  powerBudgetMa: PowerRails
  formFactor?: string
  notes?: string
}

export type SeedIncompatibility = {
  _id: string
  _type: 'incompatibility'
  title: string
  modules: Array<{_ref: string}>
  severity: string
  reason: string
  sourceNote?: string
}

export type KbNote = {
  id: string
  label: string
  path: string
  text: string
}

let cache: {
  modules: SeedModule[]
  cases: SeedCase[]
  incompatibilities: SeedIncompatibility[]
  kbNotes: KbNote[]
  root: string
} | null = null

export function resolveMonorepoRoot(): string {
  const candidates = [
    process.cwd(),
    join(process.cwd(), '..'),
    join(process.cwd(), '../..'),
    join(process.cwd(), '../../..'),
  ]
  for (const c of candidates) {
    if (existsSync(join(c, 'seed', 'modules.json')) && existsSync(join(c, 'seed', 'cases.json'))) {
      return c
    }
  }
  throw new Error(
    'Cannot locate seed/modules.json. Run from the monorepo root or apps/web so ../../seed resolves.',
  )
}

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf8')) as T
}

function readNdjson<T>(path: string): T[] {
  return readFileSync(path, 'utf8')
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line) as T)
}

function loadKbNotes(root: string): KbNote[] {
  const files: Array<{id: string; label: string; file: string}> = [
    {
      id: 'kb-store-listing-fh2-skiff',
      label: 'Store listing FH-2 (demo)',
      file: 'store-listing-fh2-skiff.md',
    },
    {
      id: 'kb-manual-excerpt-fh2-depth',
      label: 'Manual excerpt FH-2 depth (demo)',
      file: 'manual-excerpt-fh2-depth.md',
    },
  ]
  const out: KbNote[] = []
  for (const f of files) {
    const path = join(root, 'kb-sources', f.file)
    if (!existsSync(path)) continue
    out.push({
      id: f.id,
      label: f.label,
      path: `kb-sources/${f.file}`,
      text: readFileSync(path, 'utf8'),
    })
  }
  return out
}

export function loadLocalSeed() {
  if (cache) return cache
  const root = resolveMonorepoRoot()
  const modules = readJson<SeedModule[]>(join(root, 'seed', 'modules.json'))
  const cases = readJson<SeedCase[]>(join(root, 'seed', 'cases.json'))
  const incompatibilities = readNdjson<SeedIncompatibility>(
    join(root, 'seed', 'incompatibilities.ndjson'),
  )
  const kbNotes = loadKbNotes(root)
  cache = {modules, cases, incompatibilities, kbNotes, root}
  return cache
}

export function normalizeQuery(s: string): string {
  return s
    .toLowerCase()
    .replace(/[_/]+/g, ' ')
    .replace(/[^a-z0-9.+-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function scoreNameMatch(query: string, haystack: string): number {
  const q = normalizeQuery(query)
  const h = normalizeQuery(haystack)
  if (!q || !h) return 0
  if (q === h) return 100
  if (h.includes(q)) return 80
  if (q.includes(h) && h.length >= 3) return 70
  const qTokens = q.split(' ').filter(Boolean)
  const hTokens = new Set(h.split(' ').filter(Boolean))
  const hits = qTokens.filter((t) => hTokens.has(t) || [...hTokens].some((ht) => ht.includes(t) || t.includes(ht)))
  if (hits.length === 0) return 0
  return Math.min(65, 20 + hits.length * 15)
}

export function findModule(query: string): SeedModule | null {
  const {modules} = loadLocalSeed()
  const q = normalizeQuery(query)
  if (!q) return null

  const aliases: Record<string, string> = {
    'fh-2': 'expert-sleepers-fh-2',
    fh2: 'expert-sleepers-fh-2',
    'expert sleepers fh-2': 'expert-sleepers-fh-2',
    'expert sleepers fh2': 'expert-sleepers-fh-2',
  }
  const aliasSlug = aliases[q]
  if (aliasSlug) {
    const byAlias = modules.find((m) => m.slug.current === aliasSlug)
    if (byAlias) return byAlias
  }

  let best: {mod: SeedModule; score: number} | null = null
  for (const m of modules) {
    const score = Math.max(
      m.slug.current === q || m._id === q || m._id === `module-${q}` ? 100 : 0,
      m.slug.current === q.replace(/\s+/g, '-') ? 95 : 0,
      scoreNameMatch(q, m.name),
      scoreNameMatch(q, `${m.manufacturer} ${m.name}`),
      scoreNameMatch(q, m.slug.current.replace(/-/g, ' ')),
      scoreNameMatch(q, m._id.replace(/^module-/, '').replace(/-/g, ' ')),
    )
    if (!best || score > best.score) best = {mod: m, score}
  }
  return best && best.score >= 40 ? best.mod : null
}

export function findCase(query: string): SeedCase | null {
  const {cases} = loadLocalSeed()
  const q = normalizeQuery(query)
  if (!q) return null

  const aliases: Record<string, string> = {
    'make noise skiff': 'make-noise-104hp-skiff',
    'make noise 104hp skiff': 'make-noise-104hp-skiff',
    'make noise 104 hp skiff': 'make-noise-104hp-skiff',
    '104hp skiff': 'make-noise-104hp-skiff',
    '104 hp skiff': 'make-noise-104hp-skiff',
    skiff: 'make-noise-104hp-skiff',
    'cv bus case': 'make-noise-104hp-skiff',
    'intellijel 7u': 'intellijel-7u-104hp',
    'erica 84hp': 'erica-84hp',
    'erica 84 hp': 'erica-84hp',
  }
  const aliasSlug = aliases[q]
  if (aliasSlug) {
    const byAlias = cases.find((c) => c.slug.current === aliasSlug)
    if (byAlias) return byAlias
  }

  let best: {c: SeedCase; score: number} | null = null
  for (const c of cases) {
    const score = Math.max(
      c.slug.current === q || c._id === q || c._id === `case-${q}` ? 100 : 0,
      c.slug.current === q.replace(/\s+/g, '-') ? 95 : 0,
      scoreNameMatch(q, c.name),
      scoreNameMatch(q, `${c.manufacturer} ${c.name}`),
      scoreNameMatch(q, c.slug.current.replace(/-/g, ' ')),
      scoreNameMatch(q, c._id.replace(/^case-/, '').replace(/-/g, ' ')),
      q.includes('skiff') && c.slug.current.includes('skiff') ? 90 : 0,
    )
    if (!best || score > best.score) best = {c, score}
  }
  return best && best.score >= 40 ? best.c : null
}

export function fh2ContradictionNotes(): Array<{label: string; ref: string; excerpt: string}> {
  const {kbNotes} = loadLocalSeed()
  const notes: Array<{label: string; ref: string; excerpt: string}> = []
  for (const n of kbNotes) {
    const lower = n.text.toLowerCase()
    if (!lower.includes('fh-2') && !lower.includes('51mm') && !lower.includes('35mm')) continue
    const excerpt =
      n.text
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l && !l.startsWith('#') && !l.startsWith('*This'))
        .slice(0, 4)
        .join(' ')
        .slice(0, 320) || n.text.slice(0, 320)
    notes.push({label: n.label, ref: n.path, excerpt})
  }
  return notes
}
