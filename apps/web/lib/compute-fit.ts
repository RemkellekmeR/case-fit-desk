import type {FitVerdict} from '@/lib/parse-verdicts'
import {
  findCase,
  findModule,
  fh2ContradictionNotes,
  loadLocalSeed,
  type SeedCase,
  type SeedIncompatibility,
  type SeedModule,
} from '@/lib/local-seed'

export type FitRequest = {
  moduleSlug?: string
  caseSlug?: string
  moduleQuery?: string
  caseQuery?: string
  query?: string
}

export type FitResponse = {
  mode: 'local-seed'
  verdict: FitVerdict
  contradictionNotes: Array<{label: string; ref: string; excerpt: string}>
  matched: {
    moduleId: string
    moduleSlug: string
    caseId: string
    caseSlug: string
  }
}

function railOk(
  moduleMa: number | null | undefined,
  budgetMa: number | null | undefined,
): boolean | null {
  if (moduleMa === null || moduleMa === undefined || budgetMa === null || budgetMa === undefined) {
    return null
  }
  return moduleMa <= budgetMa
}

function relevantIncomps(mod: SeedModule, cas: SeedCase): SeedIncompatibility[] {
  const {incompatibilities} = loadLocalSeed()
  return incompatibilities.filter((inc) => {
    const refs = (inc.modules || []).map((m) => m._ref)
    if (!refs.includes(mod._id)) return false
    const reason = `${inc.title} ${inc.reason}`.toLowerCase()
    if (reason.includes('skiff') && cas.slug.current.includes('skiff')) return true
    if (inc.severity === 'hard' && reason.includes('depth')) {
      return cas.railClearanceMm !== null && mod.depthMm !== null && mod.depthMm > cas.railClearanceMm
    }
    return inc.severity === 'soft' || inc.severity === 'advisory' || refs.length === 1
  })
}

export function computeFitVerdict(mod: SeedModule, cas: SeedCase): FitVerdict {
  const hpOk =
    mod.hp === null || cas.usableHp === null ? null : mod.hp <= cas.usableHp
  const remaining =
    mod.hp === null || cas.usableHp === null ? null : cas.usableHp - mod.hp
  const depthOk =
    mod.depthMm === null || cas.railClearanceMm === null
      ? null
      : mod.depthMm <= cas.railClearanceMm

  const p12 = railOk(mod.powerMa?.plus12, cas.powerBudgetMa?.plus12)
  const p5 = railOk(mod.powerMa?.plus5, cas.powerBudgetMa?.plus5)
  const m12 = railOk(mod.powerMa?.minus12, cas.powerBudgetMa?.minus12)
  const powerChecks = [p12, p5, m12]
  const powerOk = powerChecks.every((v) => v === null)
    ? null
    : powerChecks.every((v) => v === null || v === true)

  const incompatibilities = relevantIncomps(mod, cas).map((i) => ({
    title: i.title,
    severity: i.severity,
    reason: i.reason,
  }))
  const hardIncompat = incompatibilities.some((i) => i.severity === 'hard')

  let status: FitVerdict['status'] = 'pass'
  if (hpOk === null && depthOk === null) {
    status = 'insufficient_data'
  } else if (hpOk === false || depthOk === false || hardIncompat) {
    status = 'fail'
  } else if (powerOk === false || incompatibilities.some((i) => i.severity === 'soft')) {
    status = 'warn'
  }

  const failBits: string[] = []
  if (depthOk === false) {
    failBits.push(
      `depth ${mod.depthMm}mm exceeds case rail clearance ${cas.railClearanceMm}mm`,
    )
  }
  if (hpOk === false) {
    failBits.push(`HP ${mod.hp} does not fit usable ${cas.usableHp}HP`)
  }
  if (hardIncompat) {
    failBits.push('hard incompatibility cited in seed')
  }

  const summary =
    status === 'fail'
      ? `FAIL: ${mod.name} does not fit ${cas.name} - ${failBits.join('; ')}.`
      : status === 'warn'
        ? `WARN: ${mod.name} fits ${cas.name} on HP/depth but power or soft incompat flags apply.`
        : status === 'insufficient_data'
          ? `Insufficient structured HP/depth on seed docs for ${mod.name} vs ${cas.name}.`
          : `PASS: ${mod.name} fits ${cas.name} on HP, depth, and solo power budget.`

  const citations: FitVerdict['citations'] = [
    {label: 'module', ref: mod._id},
    {label: 'case', ref: cas._id},
  ]
  for (const inc of relevantIncomps(mod, cas)) {
    citations.push({label: 'incompatibility', ref: inc._id})
  }

  return {
    status,
    moduleName: `${mod.manufacturer} ${mod.name}`,
    caseName: `${cas.manufacturer} ${cas.name}`,
    hp: {
      module: mod.hp,
      caseUsable: cas.usableHp,
      remainingIfInstalledAlone: remaining,
      ok: hpOk,
    },
    depth: {
      moduleMm: mod.depthMm,
      caseMaxMm: cas.railClearanceMm,
      ok: depthOk,
    },
    power: {
      module: {
        plus12: mod.powerMa?.plus12 ?? null,
        plus5: mod.powerMa?.plus5 ?? null,
        minus12: mod.powerMa?.minus12 ?? null,
      },
      caseBudget: {
        plus12: cas.powerBudgetMa?.plus12 ?? null,
        plus5: cas.powerBudgetMa?.plus5 ?? null,
        minus12: cas.powerBudgetMa?.minus12 ?? null,
      },
      ok: powerOk,
      note:
        powerOk === false
          ? 'Module draw exceeds case budget on at least one rail (solo install).'
          : 'Solo install vs empty-case budget; real systems share rails with neighbors.',
    },
    incompatibilities,
    citations,
    summary,
  }
}

function parseFreeText(query: string): {moduleQuery?: string; caseQuery?: string} {
  const q = query.trim()
  const vs = q.split(/\b(?:vs\.?|versus|in|into|for)\b/i)
  if (vs.length >= 2) {
    return {moduleQuery: vs[0].trim(), caseQuery: vs.slice(1).join(' ').trim()}
  }
  const fit = q.match(/will\s+(.+?)\s+fit\s+(?:in\s+|into\s+)?(.+?)[?.!]*$/i)
  if (fit) return {moduleQuery: fit[1].trim(), caseQuery: fit[2].trim()}
  return {moduleQuery: q}
}

export function resolveFitRequest(input: FitRequest): {
  mod: SeedModule
  cas: SeedCase
} {
  let moduleQuery = input.moduleSlug || input.moduleQuery
  let caseQuery = input.caseSlug || input.caseQuery

  if ((!moduleQuery || !caseQuery) && input.query) {
    const parsed = parseFreeText(input.query)
    moduleQuery = moduleQuery || parsed.moduleQuery
    caseQuery = caseQuery || parsed.caseQuery
  }

  if (!moduleQuery && !caseQuery) {
    moduleQuery = 'expert-sleepers-fh-2'
    caseQuery = 'make-noise-104hp-skiff'
  }

  const mod = moduleQuery ? findModule(moduleQuery) : null
  const cas = caseQuery ? findCase(caseQuery) : null

  if (!mod) {
    throw new FitLookupError(
      `Unknown module: ${moduleQuery ?? '(missing)'}. Try slug expert-sleepers-fh-2 or name FH-2.`,
      404,
    )
  }
  if (!cas) {
    throw new FitLookupError(
      `Unknown case: ${caseQuery ?? '(missing)'}. Try slug make-noise-104hp-skiff or "Make Noise skiff".`,
      404,
    )
  }
  return {mod, cas}
}

export class FitLookupError extends Error {
  status: number
  constructor(message: string, status = 400) {
    super(message)
    this.status = status
  }
}

export function runLocalFit(input: FitRequest = {}): FitResponse {
  const {mod, cas} = resolveFitRequest(input)
  const verdict = computeFitVerdict(mod, cas)
  const isFh2Skiff =
    mod.slug.current === 'expert-sleepers-fh-2' ||
    cas.slug.current.includes('skiff') ||
    mod.name.toLowerCase().includes('fh-2')

  const contradictionNotes = isFh2Skiff ? fh2ContradictionNotes() : []

  if (contradictionNotes.length) {
    const store = contradictionNotes.find((n) => n.ref.includes('store-listing'))
    const manual = contradictionNotes.find((n) => n.ref.includes('manual-excerpt'))
    const bits: string[] = []
    if (store) bits.push(`Store listing (${store.ref}) claims skiff-friendly ~35mm depth.`)
    if (manual) bits.push(`Manual (${manual.ref}) requires 51mm clear depth.`)
    bits.push(
      `Structured seed ${mod._id} depthMm=${mod.depthMm} is authoritative; skiff clearance ${cas.railClearanceMm}mm -> depth fail.`,
    )
    verdict.summary = `${verdict.summary} Contradiction: ${bits.join(' ')}`
    for (const n of contradictionNotes) {
      verdict.citations = verdict.citations || []
      verdict.citations.push({label: n.label, ref: n.ref})
    }
  }

  return {
    mode: 'local-seed',
    verdict,
    contradictionNotes,
    matched: {
      moduleId: mod._id,
      moduleSlug: mod.slug.current,
      caseId: cas._id,
      caseSlug: cas.slug.current,
    },
  }
}
