export type FitVerdict = {
  status: 'pass' | 'fail' | 'warn' | 'insufficient_data'
  moduleName: string
  caseName: string
  hp?: {
    module: number | null
    caseUsable: number | null
    remainingIfInstalledAlone: number | null
    ok: boolean | null
  }
  depth?: {
    moduleMm: number | null
    caseMaxMm: number | null
    ok: boolean | null
  }
  power?: {
    module: {plus12: number | null; plus5: number | null; minus12: number | null}
    caseBudget: {plus12: number | null; plus5: number | null; minus12: number | null}
    ok: boolean | null
    note: string | null
  }
  incompatibilities?: Array<{title: string; severity: string; reason: string}>
  citations?: Array<{label: string; ref: string}>
  summary: string
}

const FENCE = /```fit-verdict\s*([\s\S]*?)```/gi

export function extractFitVerdicts(text: string): FitVerdict[] {
  const out: FitVerdict[] = []
  for (const match of text.matchAll(FENCE)) {
    try {
      const parsed = JSON.parse(match[1].trim()) as FitVerdict
      if (parsed && parsed.status && parsed.moduleName && parsed.caseName) {
        out.push(parsed)
      }
    } catch {
      // ignore malformed cards
    }
  }
  return out
}

export function stripFitVerdictFences(text: string): string {
  return text.replace(FENCE, '').trim()
}
