/**
 * Spotting the URL a dev server announces on its own stdout.
 *
 * A script launched from the scripts dropdown is a PTY and nothing else: the app knows
 * its name and its exit code, never what it started. So the only honest way to tell
 * "this one serves a page" from "this one lints" is to read what it printed — every dev
 * server worth opening says so itself:
 *
 *   ➜  Local:   http://localhost:5173/          (Vite)
 *   - Local:        http://localhost:3000       (Next)
 *   Storybook started on => http://localhost:6006/
 *
 * A script often starts SEVERAL of them — `dev:local` running the API and the front end
 * side by side under `concurrently` is the ordinary case, not an exotic one — so this
 * collects every distinct origin it sees rather than latching onto the first, which in
 * that setup is whichever of the two happened to boot first.
 *
 * That is also why detection is NOT a list of script names. `dev`, `start`, `serve`,
 * `web`, `storybook`, `docs:dev` — the list is endless and always missing the one this
 * repo uses, whereas the URL is printed by the tool itself.
 *
 * Lives at the src root with the other pure cross-process helpers (strip-ansi, urls,
 * repoMatch): the main process scans the PTY chunks, the renderer formats the result
 * for the card.
 */
import { stripAnsi } from './strip-ansi'

/**
 * A local HTTP URL, with the port REQUIRED.
 *
 * The port is what separates a server's announcement from prose: a tool telling you to
 * "open http://localhost" is not offering a link, while `http://localhost:5173/` is one.
 * Hosts are the four spellings a server binds to — `0.0.0.0` and `[::]` mean "every
 * interface", which is not something a browser can open, hence NORMALISED_HOSTS below.
 *
 * The path stops at whitespace, quotes and the box-drawing characters a framed banner
 * puts right after the URL (Vite draws one).
 */
const LOCAL_URL = /https?:\/\/(?:localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1?\]|\[::\])(?::\d{2,5})(?:\/[^\s'"`<>│|)\]]*)?/i

/** What a bind-to-everything host has to become before a browser is handed it. */
const NORMALISED_HOSTS: Record<string, string> = {
  '0.0.0.0': 'localhost',
  '[::]': 'localhost',
  '[::1]': 'localhost',
  '127.0.0.1': 'localhost',
}

/**
 * How much of the previous chunk is replayed in front of the next one.
 *
 * A PTY hands over whatever it has when it has it, so `http://local` and `host:5173/`
 * routinely arrive as two chunks. 200 characters is far more than the longest URL a dev
 * server prints, and small enough to keep in memory per running script.
 */
const OVERLAP = 200

/**
 * How many distinct origins one script's output may put forward.
 *
 * A bound on work and memory, NOT a filter: everything this reports is a candidate that
 * `main/port-probe.ts` still has to confirm, because a script prints the addresses it
 * merely talks to — a proxy target, an allowed origin, a health check — alongside the
 * ones it serves. Twelve is far past what any `dev:*` orchestrates, and the scanner
 * retires once it is reached so a log full of URLs cannot keep it working forever.
 */
const MAX_CANDIDATES = 12

/** Trailing punctuation belongs to the sentence, not to the URL. */
function trimTrailingPunctuation(url: string): string {
  return url.replace(/[.,;:!?)\]}'"]+$/, '')
}

/** One URL, cleaned of its sentence and pointed at a host a browser can resolve. */
function normalise(raw: string): string {
  const url = trimTrailingPunctuation(raw)
  const host = url.match(/^https?:\/\/(\[[^\]]*\]|[^:/]+)/i)?.[1]
  const replacement = host && NORMALISED_HOSTS[host.toLowerCase()]
  return replacement ? url.replace(host, replacement) : url
}

/**
 * The port a URL points at, or null if it somehow carries none.
 *
 * What `main/port-probe.ts` asks about — the one part of a candidate URL that can be
 * checked against reality.
 */
export function serverUrlPort(url: string): number | null {
  const port = Number(serverUrlOrigin(url).split(':').pop())
  return Number.isInteger(port) && port > 0 ? port : null
}

/**
 * `host:port` — what makes two URLs the same server.
 *
 * Deduplicating on the ORIGIN and not on the whole URL is what keeps a proxy or an
 * access log from turning every path it prints into another address: `…:3000/api/users`
 * is the server already on the card, not a second one.
 */
export function serverUrlOrigin(url: string): string {
  return url.replace(/^https?:\/\//i, '').replace(/\/.*$/, '').toLowerCase()
}

/**
 * Every distinct local server announced in `text`, in the order they were printed.
 *
 * Callers scanning a live stream want `createServerUrlScanner` instead, which handles
 * chunk boundaries and remembers what it has already reported.
 */
export function findServerUrls(text: string): string[] {
  const matches = stripAnsi(text).match(new RegExp(LOCAL_URL.source, 'gi')) ?? []
  const byOrigin = new Map<string, string>()

  for (const match of matches) {
    const url = normalise(match)
    const origin = serverUrlOrigin(url)
    if (!byOrigin.has(origin)) byOrigin.set(origin, url)
  }

  return [...byOrigin.values()]
}

/**
 * A scanner over one script's output stream.
 *
 * Returns the candidate addresses it has not reported yet, and an empty array for
 * everything else — which is nearly every chunk. A server reprinting its banner on
 * restart reports nothing the second time, so a card never hops between an old and a new
 * port for the same origin, and the scanner retires at MAX_CANDIDATES.
 *
 * Candidates, not servers: whether anything actually listens there is settled by
 * `main/port-probe.ts`, not by the words around the URL.
 */
export function createServerUrlScanner(): (chunk: string) => string[] {
  const seen = new Set<string>()
  let tail = ''

  return (chunk: string): string[] => {
    if (seen.size >= MAX_CANDIDATES) return []

    const clean = stripAnsi(chunk)
    const fresh: string[] = []

    for (const url of findServerUrls(tail + clean)) {
      const origin = serverUrlOrigin(url)
      if (seen.has(origin)) continue
      seen.add(origin)
      fresh.push(url)
      if (seen.size >= MAX_CANDIDATES) break
    }

    // Kept even after a hit: the SECOND server of a `dev:local` may still be printing
    // its own line across this boundary.
    tail = (tail + clean).slice(-OVERLAP)
    return fresh
  }
}

/**
 * The short form for the card: `localhost:5173`, `localhost:3000/admin`.
 *
 * The scheme is noise — every one of these is http on a local port — and the trailing
 * slash a server adds is noise too. What is left is the part a person recognises.
 */
export function serverUrlLabel(url: string): string {
  return url.replace(/^https?:\/\//i, '').replace(/\/$/, '')
}
