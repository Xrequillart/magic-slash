import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Magic Slash',
  description: 'Magic Slash — the desktop agent for your Jira + GitHub development cycle.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-bg text-white antialiased">{children}</body>
    </html>
  )
}
