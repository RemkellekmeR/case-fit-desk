# Architecture

```
Browser (Chat UI)
    │  POST /api/chat
    ▼
Next.js route (server only)
    ├─ LLM (OpenAI / Anthropic / Gemini)
    ├─ Sanity Context MCP #1  GROQ/dataset  → hp, depth, power
    └─ Sanity Context MCP #2  Knowledge Base → manuals / store prose
```

Tokens and MCP URLs never ship to the client.

Fit verdicts are emitted as ` ```fit-verdict ` JSON fences; the UI parses them into cards while still showing the prose reply.
