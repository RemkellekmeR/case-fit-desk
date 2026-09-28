import {createMCPClient, type MCPClient} from '@ai-sdk/mcp'

export type ConnectedMcp = {
  client: MCPClient
  label: string
  initialContext: string
  tools: Awaited<ReturnType<MCPClient['tools']>>
}

async function fetchInitialContext(mcpUrl: string, token: string): Promise<string> {
  const initialContextUrl = new URL(mcpUrl)
  initialContextUrl.pathname = `${initialContextUrl.pathname.replace(/\/$/, '')}/initial-context`
  try {
    const res = await fetch(initialContextUrl, {
      headers: {Authorization: `Bearer ${token}`},
    })
    if (!res.ok) {
      return `(initial-context HTTP ${res.status} for ${mcpUrl})`
    }
    return await res.text()
  } catch (err) {
    return `(initial-context fetch failed: ${err instanceof Error ? err.message : String(err)})`
  }
}

async function connectOne(url: string, token: string, label: string): Promise<ConnectedMcp> {
  const client = await createMCPClient({
    transport: {
      type: 'http',
      url,
      headers: {Authorization: `Bearer ${token}`},
    },
  })
  const initialContext = await fetchInitialContext(url, token)
  const rawTools = await client.tools()
  const {initial_context: _ignored, ...rest} = rawTools as Record<string, unknown> & {
    initial_context?: unknown
  }
  const tools: Record<string, unknown> = {}
  for (const [name, tool] of Object.entries(rest)) {
    const prefixed = label === 'groq' ? name : `${label}_${name}`
    const t = tool as {description?: string}
    tools[prefixed] = {
      ...t,
      description:
        label === 'groq'
          ? `${t.description ?? name} [Sanity GROQ / dataset — authoritative HP/depth/power]`
          : `${t.description ?? name} [Sanity Knowledge Base — manuals/store prose; may contradict listings]`,
    }
  }
  return {
    client,
    label,
    initialContext,
    tools: tools as Awaited<ReturnType<MCPClient['tools']>>,
  }
}

export async function connectSanityContextMcps(): Promise<{
  connections: ConnectedMcp[]
  tools: Record<string, unknown>
  initialContexts: string[]
  close: () => Promise<void>
}> {
  const token = process.env.SANITY_ORGANIZATION_TOKEN
  const groqUrl = process.env.SANITY_CONTEXT_MCP_URL
  const kbUrl = process.env.SANITY_CONTEXT_KB_MCP_URL

  if (!token) {
    throw new Error('SANITY_ORGANIZATION_TOKEN is required (org-level Context Viewer token).')
  }
  if (!groqUrl && !kbUrl) {
    throw new Error(
      'Set SANITY_CONTEXT_MCP_URL (GROQ/dataset) and/or SANITY_CONTEXT_KB_MCP_URL (Knowledge Base-only endpoint).',
    )
  }

  const connections: ConnectedMcp[] = []
  if (groqUrl) connections.push(await connectOne(groqUrl, token, 'groq'))
  if (kbUrl) connections.push(await connectOne(kbUrl, token, 'kb'))

  const tools: Record<string, unknown> = {}
  const initialContexts: string[] = []
  for (const c of connections) {
    Object.assign(tools, c.tools)
    initialContexts.push(`### ${c.label}\n${c.initialContext}`)
  }

  return {
    connections,
    tools,
    initialContexts,
    close: async () => {
      await Promise.all(
        connections.map(async (c) => {
          try {
            await c.client.close?.()
          } catch {
            // ignore close errors
          }
        }),
      )
    },
  }
}
