import {
  streamText,
  convertToModelMessages,
  stepCountIs,
  createUIMessageStream,
  createUIMessageStreamResponse,
  type UIMessage,
  type UIMessageStreamWriter,
} from 'ai'
import {getModel} from '@/lib/models'
import {connectSanityContextMcps} from '@/lib/mcp'
import {buildSystemPrompt} from '@/lib/system-prompt'
import {
  buildLocalSeedTools,
  hasLlmKey,
  LOCAL_SEED_SYSTEM_ADDENDUM,
  shouldUseLocalSeedTools,
} from '@/lib/local-tools'
import {
  MessageGuardError,
  deterministicFitReply,
  extractLastUserText,
  isLlmCapacityError,
  normalizeUiMessages,
  writeAssistantText,
} from '@/lib/chat-fallback'

export const runtime = 'nodejs'
export const maxDuration = 60

type StreamAttemptResult = {
  status: 'ok' | 'capacity' | 'error'
  started: boolean
  error?: unknown
}

async function streamModelAttempt(
  writer: UIMessageStreamWriter,
  opts: {
    system: string
    tools: Parameters<typeof streamText>[0]['tools']
    messages: Awaited<ReturnType<typeof convertToModelMessages>>
    sendStart: boolean
    maxRetries?: number
  },
): Promise<StreamAttemptResult> {
  let capacityHit = false
  let capturedError: unknown
  let started = false

  try {
    const result = streamText({
      model: getModel(),
      system: opts.system,
      messages: opts.messages,
      tools: opts.tools,
      stopWhen: stepCountIs(12),
      maxRetries: opts.maxRetries ?? 2,
    })

    const uiStream = result.toUIMessageStream({
      sendStart: opts.sendStart,
      sendFinish: true,
      onError: (error) => {
        capturedError = error
        if (isLlmCapacityError(error)) {
          capacityHit = true
          return '__CAPACITY__'
        }
        return error instanceof Error ? error.message : 'An error occurred.'
      },
    })

    for await (const chunk of uiStream) {
      if (chunk.type === 'error') {
        if (capacityHit || chunk.errorText === '__CAPACITY__') {
          capacityHit = true
          continue
        }
        writer.write(chunk)
        return {status: 'error', started, error: capturedError}
      }
      if (chunk.type === 'start') started = true
      writer.write(chunk)
    }

    if (capacityHit) return {status: 'capacity', started, error: capturedError}
    return {status: 'ok', started}
  } catch (err) {
    if (isLlmCapacityError(err)) {
      return {status: 'capacity', started, error: err}
    }
    return {status: 'error', started, error: err}
  }
}

export async function POST(req: Request) {
  let mcpClose: (() => Promise<void>) | undefined

  try {
    let body: unknown
    try {
      body = await req.json()
    } catch {
      return Response.json({error: 'Invalid JSON body'}, {status: 400})
    }

    const rawMessages = (body as {messages?: unknown})?.messages
    let messages: UIMessage[]
    try {
      messages = normalizeUiMessages(rawMessages)
    } catch (err) {
      if (err instanceof MessageGuardError) {
        return Response.json({error: err.message}, {status: 400})
      }
      throw err
    }

    const userText = extractLastUserText(messages)
    const useLocal = shouldUseLocalSeedTools()

    if (useLocal && !hasLlmKey()) {
      return Response.json(
        {
          error:
            'Local seed mode is active (DEMO_LOCAL=1 or Sanity MCP env missing) but no LLM API key is set.',
          hint:
            'Use POST /api/fit with { "moduleSlug": "expert-sleepers-fh-2", "caseSlug": "make-noise-104hp-skiff" } for a deterministic fit-verdict without an LLM. Or set OPENAI_API_KEY / ANTHROPIC_API_KEY / GEMINI_API_KEY for chat. See HANDOFF.md.',
          demo: {
            method: 'POST',
            path: '/api/fit',
            body: {
              moduleSlug: 'expert-sleepers-fh-2',
              caseSlug: 'make-noise-104hp-skiff',
            },
          },
        },
        {status: 503},
      )
    }

    const modelMessages = await convertToModelMessages(messages)

    const stream = createUIMessageStream({
      originalMessages: messages,
      execute: async ({writer}) => {
        let started = false

        const finishWithDeterministic = () => {
          writeAssistantText(writer, deterministicFitReply(userText), {
            includeStart: !started,
          })
          writer.setOutcome({status: 'completed'})
        }

        try {
          if (useLocal) {
            const attempt = await streamModelAttempt(writer, {
              system: `${buildSystemPrompt([LOCAL_SEED_SYSTEM_ADDENDUM])}`,
              tools: buildLocalSeedTools(),
              messages: modelMessages,
              sendStart: true,
            })
            started = started || attempt.started
            if (attempt.status === 'ok') {
              writer.setOutcome({status: 'completed'})
              return
            }
            if (attempt.status === 'capacity') {
              finishWithDeterministic()
              return
            }
            // Non-capacity error after stream may already have written an error chunk
            if (!attempt.started && attempt.error) {
              throw attempt.error
            }
            writer.setOutcome({status: 'failed', error: attempt.error})
            return
          }

          // Primary: Sanity MCP + Gemini
          const {tools, initialContexts, close} = await connectSanityContextMcps()
          mcpClose = close

          const primary = await streamModelAttempt(writer, {
            system: buildSystemPrompt(initialContexts),
            tools: tools as Parameters<typeof streamText>[0]['tools'],
            messages: modelMessages,
            sendStart: true,
          })
          started = started || primary.started

          if (primary.status === 'ok') {
            writer.setOutcome({status: 'completed'})
            return
          }

          if (primary.status !== 'capacity') {
            if (!primary.started && primary.error) throw primary.error
            writer.setOutcome({status: 'failed', error: primary.error})
            return
          }

          // Capacity: retry once with local-seed tools (same model), fewer retries
          const retry = await streamModelAttempt(writer, {
            system: buildSystemPrompt([LOCAL_SEED_SYSTEM_ADDENDUM]),
            tools: buildLocalSeedTools(),
            messages: modelMessages,
            sendStart: !started,
            maxRetries: 0,
          })
          started = started || retry.started

          if (retry.status === 'ok') {
            writer.setOutcome({status: 'completed'})
            return
          }

          // Still capacity (or retry failed): deterministic no-LLM answer
          finishWithDeterministic()
        } finally {
          if (mcpClose) {
            try {
              await mcpClose()
            } catch {
              // ignore
            }
            mcpClose = undefined
          }
        }
      },
      onError: (error) => {
        if (isLlmCapacityError(error)) {
          // Should be rare — execute handles capacity without throwing
          return 'LLM capacity limit; fallback should have answered.'
        }
        return error instanceof Error ? error.message : 'An error occurred.'
      },
    })

    return createUIMessageStreamResponse({stream})
  } catch (err) {
    if (mcpClose) {
      try {
        await mcpClose()
      } catch {
        // ignore
      }
    }
    if (err instanceof MessageGuardError) {
      return Response.json({error: err.message}, {status: 400})
    }
    const message = err instanceof Error ? err.message : 'Unknown error'
    return Response.json(
      {
        error: message,
        hint:
          'Check SANITY_CONTEXT_MCP_URL / SANITY_CONTEXT_KB_MCP_URL, SANITY_ORGANIZATION_TOKEN, and an LLM API key - or use DEMO_LOCAL=1 with POST /api/fit. See HANDOFF.md.',
      },
      {status: 500},
    )
  }
}
