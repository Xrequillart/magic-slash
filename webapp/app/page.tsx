import Link from 'next/link'

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center px-6 text-center">
      <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-bg-secondary px-3 py-1 text-xs text-text-secondary">
        <span className="h-2 w-2 rounded-full bg-accent" />
        app.magic-slash.io
      </div>
      <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
        Magic&nbsp;Slash
      </h1>
      <p className="mt-4 max-w-xl text-text-secondary">
        The desktop agent that automates your Jira + GitHub development cycle. Download the app to
        get started, or open an invitation link to join your team.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/download"
          className="rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
        >
          Download for macOS
        </Link>
        <a
          href="https://magic-slash.io"
          className="rounded-lg border border-border px-5 py-2.5 text-sm font-medium text-text-secondary transition-colors hover:text-white"
        >
          Learn more
        </a>
      </div>
    </main>
  )
}
