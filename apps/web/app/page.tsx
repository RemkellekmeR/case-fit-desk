import {Chat} from '@/components/chat'

export default function HomePage() {
  return (
    <main className="app-shell">
      <header className="hero">
        <div className="badge-row">
          <span className="badge">Sanity Challenge · Path One</span>
          <span className="badge">Context MCP · GROQ + KB</span>
          <span className="badge">Eurorack fit agent</span>
        </div>
        <h1>Case Fit Desk</h1>
        <p>
          Before you buy another module, ask whether it fits <em>your</em> case — HP remaining,
          depth after the rails, power milliamps, and known incompatible neighbors. Numbers come
          from Sanity structured content; the agent refuses to invent specs.
        </p>
      </header>
      <Chat />
      <p className="footer-note">
        Server-side Sanity Context MCP only. See README / HANDOFF.md for Studio deploy, seed import,
        dual MCP endpoints, and Vercel env vars.
      </p>
    </main>
  )
}
