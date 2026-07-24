import Link from 'next/link'

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-softblue px-6 text-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/img/mascot.png" alt="" className="mb-8 w-40 drop-shadow-xl" />
      <h1 className="font-display text-5xl font-black tracking-tight text-ink">Magic&nbsp;Slash</h1>
      <p className="mt-4 max-w-xl text-muted">
        The desktop agent that automates your Jira + GitHub development cycle. Download the app to
        get started, or open an invitation link to join your team.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/download"
          className="rounded-full bg-ink px-6 py-3 font-display text-sm font-medium text-white transition-colors hover:bg-black/80"
        >
          Download for macOS
        </Link>
        <a
          href="https://magic-slash.io"
          className="rounded-full border border-black/15 px-6 py-3 font-display text-sm font-medium text-ink transition-colors hover:bg-black/[0.04]"
        >
          Learn more
        </a>
      </div>
    </main>
  )
}
