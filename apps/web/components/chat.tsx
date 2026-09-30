'use client'

import {useMemo, useState} from 'react'
import {useChat} from '@ai-sdk/react'
import {DefaultChatTransport} from 'ai'
import {FitVerdictCard} from './fit-verdict-card'
import {extractFitVerdicts, stripFitVerdictFences, type FitVerdict} from '@/lib/parse-verdicts'

const SUGGESTIONS = [
  'Will Expert Sleepers FH-2 fit in the Make Noise 104HP skiff?',
  'Does Maths fit the Erica 84HP case on HP and depth?',
  'Compare FH-2 depth: store listing vs manual vs structured module doc.',
  'Can Blck_Noir and arbhar share the Make Noise skiff power budget?',
]

type ContradictionNote = {label: string; ref: string; excerpt: string}

function messageText(message: {parts?: Array<{type: string; text?: string}>; content?: string}): string {
  if (typeof message.content === 'string' && message.content) return message.content
  if (!message.parts) return ''
  return message.parts
    .filter((p) => p.type === 'text' && p.text)
    .map((p) => p.text as string)
    .join('\n')
}

export function Chat() {
  const [input, setInput] = useState('')
  const [demoVerdict, setDemoVerdict] = useState<FitVerdict | null>(null)
  const [demoNotes, setDemoNotes] = useState<ContradictionNote[]>([])
  const [demoBusy, setDemoBusy] = useState(false)
  const [demoError, setDemoError] = useState<string | null>(null)

  const transport = useMemo(() => new DefaultChatTransport({api: '/api/chat'}), [])
  const {messages, sendMessage, status, error, setMessages} = useChat({transport})

  const busy = status === 'submitted' || status === 'streaming'

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    const text = input.trim()
    if (!text || busy) return
    setInput('')
    await sendMessage({text})
  }

  async function runSuggestion(text: string) {
    if (busy) return
    setInput('')
    await sendMessage({text})
  }

  async function runSeedDemo() {
    if (demoBusy) return
    setDemoBusy(true)
    setDemoError(null)
    try {
      const res = await fetch('/api/fit', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          moduleSlug: 'expert-sleepers-fh-2',
          caseSlug: 'make-noise-104hp-skiff',
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || `HTTP ${res.status}`)
      }
      setDemoVerdict(data.verdict as FitVerdict)
      setDemoNotes((data.contradictionNotes as ContradictionNote[]) || [])
    } catch (err) {
      setDemoVerdict(null)
      setDemoNotes([])
      setDemoError(err instanceof Error ? err.message : 'Demo fit failed')
    } finally {
      setDemoBusy(false)
    }
  }

  const latestAssistant = [...messages].reverse().find((m) => m.role === 'assistant')
  const latestText = latestAssistant ? messageText(latestAssistant) : ''
  const chatVerdicts = extractFitVerdicts(latestText)
  const verdicts = demoVerdict ? [demoVerdict, ...chatVerdicts] : chatVerdicts

  return (
    <div className="layout">
      <section className="panel">
        <div className="panel-header">Fit check chat</div>
        <div className="panel-body chat-messages">
          {messages.length === 0 ? (
            <div className="bubble assistant">
              <div className="role">agent</div>
              Ask whether a module fits a case. I only pass/fail from Sanity structured fields
              (HP, depthMm, powerMa) and cite document ids. Without Sanity MCP, use{' '}
              <strong>Demo (seed data)</strong> for a deterministic FH-2 vs skiff check.
            </div>
          ) : null}
          {messages.map((m) => {
            const text = messageText(m)
            const display = m.role === 'assistant' ? stripFitVerdictFences(text) : text
            return (
              <div key={m.id} className={`bubble ${m.role === 'user' ? 'user' : 'assistant'}`}>
                <div className="role">{m.role}</div>
                {display || (m.role === 'assistant' ? '...' : '')}
              </div>
            )
          })}
          {error ? (
            <div className="bubble assistant" style={{borderColor: 'var(--fail)'}}>
              <div className="role">error</div>
              {error.message}
            </div>
          ) : null}
        </div>
        <form className="composer" onSubmit={onSubmit}>
          <div className="composer-row">
            <button
              type="button"
              className="primary"
              onClick={runSeedDemo}
              disabled={demoBusy}
              title="POST /api/fit using monorepo seed JSON (no LLM / Sanity required)"
            >
              {demoBusy ? 'Running demo...' : 'Demo (seed data)'}
            </button>
            {SUGGESTIONS.map((s) => (
              <button key={s} type="button" className="chip" onClick={() => runSuggestion(s)} disabled={busy}>
                {s}
              </button>
            ))}
          </div>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="e.g. Will FH-2 fit my Make Noise skiff?"
            disabled={busy}
          />
          <div className="composer-row">
            <button className="primary" type="submit" disabled={busy || !input.trim()}>
              {busy ? 'Checking...' : 'Check fit'}
            </button>
            <button type="button" onClick={() => setMessages([])} disabled={busy || messages.length === 0}>
              Clear
            </button>
          </div>
        </form>
      </section>

      <aside className="panel">
        <div className="panel-header">Fit verdict cards</div>
        <div className="panel-body">
          {demoError ? (
            <div className="bubble assistant" style={{borderColor: 'var(--fail)', marginBottom: '0.75rem'}}>
              <div className="role">demo error</div>
              {demoError}
            </div>
          ) : null}
          {verdicts.length === 0 ? (
            <>
              <p style={{color: 'var(--muted)', marginTop: 0}}>
                Structured verdict cards from the Demo button or the latest assistant reply appear here.
              </p>
              <ul className="hint-list">
                <li>Pass / fail / warn / insufficient_data</li>
                <li>HP remaining, depth clearance, power rails</li>
                <li>Citations to Sanity / seed document ids</li>
                <li>Never invent missing HP/depth/power</li>
                <li>Demo path: FH-2 vs Make Noise skiff fails on depth (51mm {'>'} 38mm)</li>
              </ul>
            </>
          ) : (
            <>
              {verdicts.map((v, i) => (
                <FitVerdictCard key={`${v.moduleName}-${v.caseName}-${i}`} verdict={v} />
              ))}
              {demoNotes.length > 0 ? (
                <div className="verdict" style={{borderColor: 'var(--warn)'}}>
                  <div className="status" style={{background: '#3a3010', color: 'var(--warn)'}}>
                    KB CONTRADICTION
                  </div>
                  <h3>Store listing vs manual (FH-2 depth)</h3>
                  <ul className="hint-list">
                    {demoNotes.map((n) => (
                      <li key={n.ref}>
                        <strong>{n.label}</strong> <code>{n.ref}</code>: {n.excerpt}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </>
          )}
        </div>
      </aside>
    </div>
  )
}
