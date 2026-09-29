import {streamText, convertToModelMessages, stepCountIs, type UIMessage} from 'ai'
import {getModel} from '@/lib/models'
import {connectSanityContextMcps} from '@/lib/mcp'
import {buildSystemPrompt} from '@/lib/system-prompt'
import {
  buildLocalSeedTools,
  hasLlmKey,
  LOCAL_SEED_SYSTEM_ADDENDUM,
  shouldUseLocalSeedTools,
} from '@/lib/local-tools'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(req: Request) {
  let mcpClose: (() => Promise<void>) | undefined
  try {
    const body = await req.json()
    const messages = body.messages as UIMessage[]
    const useLocal = shouldUseLocalSeedTools()

    if (useLocal) {
      if (!hasLlmKey()) {
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

      const tools = buildLocalSeedTools()
      const result = streamText({
        model: getModel(),
        system: `${buildSystemPrompt([LOCAL_SEED_SYSTEM_ADDENDUM])}`,
        messages: await convertToModelMessages(messages),
        tools,
        stopWhen: stepCountIs(12),
      })
      return result.toUIMessageStreamResponse()
    }

    const {tools, initialContexts, close} = await connectSanityContextMcps()
    mcpClose = close

    const result = streamText({
      model: getModel(),
      system: buildSystemPrompt(initialContexts),
      messages: await convertToModelMessages(messages),
      tools: tools as Parameters<typeof streamText>[0]['tools'],
      stopWhen: stepCountIs(12),
      onFinish: async () => {
        await close()
      },
    })

    return result.toUIMessageStreamResponse()
  } catch (err) {
    if (mcpClose) {
      try {
        await mcpClose()
      } catch {
        // ignore
      }
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
