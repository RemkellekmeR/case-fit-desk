import {streamText, convertToModelMessages, stepCountIs, type UIMessage} from 'ai'
import {getModel} from '@/lib/models'
import {connectSanityContextMcps} from '@/lib/mcp'
import {buildSystemPrompt} from '@/lib/system-prompt'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(req: Request) {
  let mcpClose: (() => Promise<void>) | undefined
  try {
    const body = await req.json()
    const messages = body.messages as UIMessage[]

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
          'Check SANITY_CONTEXT_MCP_URL / SANITY_CONTEXT_KB_MCP_URL, SANITY_ORGANIZATION_TOKEN, and an LLM API key. See HANDOFF.md.',
      },
      {status: 500},
    )
  }
}
