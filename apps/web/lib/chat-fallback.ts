import type {UIMessage, UIMessageStreamWriter} from 'ai'
import {FitLookupError, runLocalFit} from '@/lib/compute-fit'

export class MessageGuardError extends Error {
  status = 400
  constructor(message: string) {
    super(message)
    this.name = 'MessageGuardError'
  }
}

/** Normalize UIMessages so convertToModelMessages never sees string `content` without `parts`. */
export function normalizeUiMessages(raw: unknown): UIMessage[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    throw new MessageGuardError(
      'Request body must include a non-empty messages array (UIMessage[] with parts).',
    )
  }

  return raw.map((item, index) => {
    if (!item || typeof item !== 'object') {
      throw new MessageGuardError(`messages[${index}] must be an object`)
    }
    const msg = item as Record<string, unknown>
    const role = msg.role
    if (role !== 'user' && role !== 'assistant' && role !== 'system') {
      throw new MessageGuardError(
        `messages[${index}] must have role user|assistant|system`,
      )
    }

    const id = typeof msg.id === 'string' && msg.id ? msg.id : `msg-${index}`

    if (Array.isArray(msg.parts) && msg.parts.length > 0) {
      return {id, role, parts: msg.parts} as UIMessage
    }

    if (typeof msg.content === 'string') {
      return {
        id,
        role,
        parts: [{type: 'text', text: msg.content}],
      } as UIMessage
    }

    if (typeof msg.text === 'string') {
      return {
        id,
        role,
        parts: [{type: 'text', text: msg.text}],
      } as UIMessage
    }

    throw new MessageGuardError(
      `messages[${index}] needs parts[] or string content (got neither)`,
    )
  })
}

export function extractLastUserText(messages: UIMessage[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i]
    if (m.role !== 'user') continue
    const parts = m.parts || []
    const text = parts
      .filter((p): p is {type: 'text'; text: string} => p.type === 'text' && typeof (p as {text?: string}).text === 'string')
      .map((p) => p.text)
      .join('\n')
      .trim()
    if (text) return text
  }
  return ''
}

function collectErrorText(err: unknown, depth = 0): {blob: string; codes: number[]} {
  const msgs: string[] = []
  const codes: number[] = []
  if (!err || depth > 6) return {blob: '', codes}

  if (typeof err === 'string') {
    return {blob: err, codes}
  }

  if (err instanceof Error) {
    msgs.push(err.name, err.message)
    const anyErr = err as Error & {
      statusCode?: number
      status?: number
      lastError?: unknown
      errors?: unknown[]
      cause?: unknown
      responseBody?: string
      data?: unknown
      code?: string | number
    }
    if (typeof anyErr.statusCode === 'number') codes.push(anyErr.statusCode)
    if (typeof anyErr.status === 'number') codes.push(anyErr.status)
    if (typeof anyErr.code === 'number') codes.push(anyErr.code)
    if (typeof anyErr.code === 'string') msgs.push(anyErr.code)
    if (typeof anyErr.responseBody === 'string') msgs.push(anyErr.responseBody)
    if (anyErr.data != null) {
      try {
        msgs.push(JSON.stringify(anyErr.data))
      } catch {
        // ignore
      }
    }
    if (anyErr.lastError) {
      const nested = collectErrorText(anyErr.lastError, depth + 1)
      msgs.push(nested.blob)
      codes.push(...nested.codes)
    }
    if (Array.isArray(anyErr.errors)) {
      for (const e of anyErr.errors) {
        const nested = collectErrorText(e, depth + 1)
        msgs.push(nested.blob)
        codes.push(...nested.codes)
      }
    }
    if (anyErr.cause) {
      const nested = collectErrorText(anyErr.cause, depth + 1)
      msgs.push(nested.blob)
      codes.push(...nested.codes)
    }
  } else if (typeof err === 'object') {
    try {
      msgs.push(JSON.stringify(err))
    } catch {
      msgs.push(String(err))
    }
  }

  return {blob: msgs.join(' '), codes}
}

/** Gemini free-tier 429 / RESOURCE_EXHAUSTED / high-demand 503 and AI SDK RetryError wrapping those. */
export function isLlmCapacityError(err: unknown): boolean {
  const {blob, codes} = collectErrorText(err)
  if (codes.some((c) => c === 429 || c === 503)) return true
  const lower = blob.toLowerCase()
  return (
    /resource[_\s-]?exhausted/.test(lower) ||
    /quota[_\s-]?(exceeded|error)/.test(lower) ||
    /free[_\s-]?tier/.test(lower) ||
    /rate[_\s-]?limit/.test(lower) ||
    /too many requests/.test(lower) ||
    /high demand/.test(lower) ||
    (/\b503\b/.test(lower) && /unavailable/.test(lower)) ||
    /\b429\b/.test(lower)
  )
}

export function deterministicFitReply(userText: string): string {
  const query = (userText || '').trim()
  if (!query) {
    return [
      'The LLM hit a capacity limit (rate limit / high demand) and I could not read a module+case from your message.',
      'Use **Demo (seed data)** or name a known pair like FH-2 vs Make Noise skiff.',
    ].join(' ')
  }

  try {
    const result = runLocalFit({query})
    const v = result.verdict
    const lines: string[] = [
      v.summary,
      '',
      '```fit-verdict',
      JSON.stringify(v, null, 2),
      '```',
      '',
      '_(Local-seed fallback after the LLM hit capacity limits — same numbers as Demo / POST /api/fit.)_',
    ]
    if (result.contradictionNotes?.length) {
      lines.push('', 'KB contradiction notes:')
      for (const n of result.contradictionNotes) {
        lines.push(`- **${n.label}** (\`${n.ref}\`): ${n.excerpt}`)
      }
    }
    return lines.join('\n')
  } catch (err) {
    if (err instanceof FitLookupError) {
      return [
        'The LLM hit a capacity limit, and I could not match both a module and a case in the local seed from your message.',
        err.message,
        'Try naming something like **FH-2** / Expert Sleepers and **Make Noise skiff**, or use the **Demo (seed data)** button.',
      ].join(' ')
    }
    return [
      'The LLM hit a capacity limit and the local-seed fallback could not complete.',
      'Use **Demo (seed data)** or POST /api/fit for a deterministic FH-2 vs skiff check.',
    ].join(' ')
  }
}

/** Write a plain assistant text turn into an existing UI message stream (no LLM). */
export function writeAssistantText(
  writer: UIMessageStreamWriter,
  text: string,
  opts: {includeStart: boolean},
): void {
  if (opts.includeStart) {
    writer.write({type: 'start'})
  }
  writer.write({type: 'start-step'})
  const id = `fallback-${Date.now()}`
  writer.write({type: 'text-start', id})
  // Chunk moderately so the client still paints progressively
  const chunkSize = 240
  for (let i = 0; i < text.length; i += chunkSize) {
    writer.write({type: 'text-delta', id, delta: text.slice(i, i + chunkSize)})
  }
  writer.write({type: 'text-end', id})
  writer.write({type: 'finish-step'})
  writer.write({type: 'finish', finishReason: 'stop'})
}
