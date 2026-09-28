import type {Metadata} from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Case Fit Desk',
  description: 'Eurorack / modular case fit checker powered by Sanity Context MCP',
}

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
