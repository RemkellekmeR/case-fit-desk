import type {FitVerdict} from '@/lib/parse-verdicts'

function Metric({label, value}: {label: string; value: string}) {
  return (
    <div>
      <span>{label}</span>
      <div>{value}</div>
    </div>
  )
}

function fmt(n: number | null | undefined, unit = ''): string {
  if (n === null || n === undefined) return '—'
  return `${n}${unit}`
}

export function FitVerdictCard({verdict}: {verdict: FitVerdict}) {
  const cls =
    verdict.status === 'pass'
      ? 'pass'
      : verdict.status === 'fail'
        ? 'fail'
        : verdict.status === 'warn'
          ? 'warn'
          : 'warn'

  return (
    <article className={`verdict ${cls}`}>
      <div className="status">{verdict.status.toUpperCase()}</div>
      <h3>
        {verdict.moduleName} → {verdict.caseName}
      </h3>
      <p style={{margin: '0 0 0.6rem', color: 'var(--muted)'}}>{verdict.summary}</p>
      <div className="metric-grid">
        <Metric
          label="HP"
          value={
            verdict.hp
              ? `${fmt(verdict.hp.module)} / ${fmt(verdict.hp.caseUsable)} usable · remain ${fmt(verdict.hp.remainingIfInstalledAlone)} · ${verdict.hp.ok === null ? '?' : verdict.hp.ok ? 'OK' : 'NO'}`
              : '—'
          }
        />
        <Metric
          label="Depth"
          value={
            verdict.depth
              ? `${fmt(verdict.depth.moduleMm, 'mm')} vs max ${fmt(verdict.depth.caseMaxMm, 'mm')} · ${verdict.depth.ok === null ? '?' : verdict.depth.ok ? 'OK' : 'NO'}`
              : '—'
          }
        />
        <Metric
          label="Power +12 / +5 / −12"
          value={
            verdict.power
              ? `${fmt(verdict.power.module.plus12)}/${fmt(verdict.power.module.plus5)}/${fmt(verdict.power.module.minus12)} mA vs budget ${fmt(verdict.power.caseBudget.plus12)}/${fmt(verdict.power.caseBudget.plus5)}/${fmt(verdict.power.caseBudget.minus12)} · ${verdict.power.ok === null ? '?' : verdict.power.ok ? 'OK' : 'TIGHT'}`
              : '—'
          }
        />
        <Metric
          label="Incompatibilities"
          value={
            verdict.incompatibilities?.length
              ? verdict.incompatibilities.map((i) => `${i.severity}: ${i.title}`).join('; ')
              : 'none cited'
          }
        />
      </div>
      {verdict.power?.note ? (
        <p style={{margin: '0.5rem 0 0', fontSize: '0.85rem', color: 'var(--muted)'}}>
          {verdict.power.note}
        </p>
      ) : null}
      {verdict.citations?.length ? (
        <div className="citations">
          Citations:{' '}
          {verdict.citations.map((c, i) => (
            <span key={`${c.ref}-${i}`}>
              {i > 0 ? ' · ' : ''}
              {c.label} <code>{c.ref}</code>
            </span>
          ))}
        </div>
      ) : null}
    </article>
  )
}
