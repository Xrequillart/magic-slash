import { describe, it, expect } from 'vitest'
import { createServerUrlScanner, findServerUrls, serverUrlLabel, serverUrlOrigin, serverUrlPort } from './server-url'

// Real banners, escape codes included, because that is what a PTY hands over: the
// colour around a Vite URL is the reason a naive regex on the raw chunk misses it.
const VITE = '\x1b[32m  ➜  \x1b[1mLocal\x1b[22m:   \x1b[36mhttp://localhost:\x1b[1m5173\x1b[22m/\x1b[39m\r\n'

describe('findServerUrls', () => {
  it('finds the URL a dev server prints, colours and all', () => {
    expect(findServerUrls(VITE)).toEqual(['http://localhost:5173/'])
    expect(findServerUrls('  - Local:        http://localhost:3000\r\n')).toEqual(['http://localhost:3000'])
    expect(findServerUrls('Storybook started on => http://localhost:6006/')).toEqual(['http://localhost:6006/'])
  })

  it('finds every server a single script starts', () => {
    // `pnpm dev:local` under concurrently: the API boots first, and latching onto the
    // first URL is exactly what left the front end unreachable from the card.
    const output = [
      '[api] Server listening on http://localhost:4000',
      '[web]   ➜  Local:   http://localhost:5173/',
    ].join('\r\n')

    expect(findServerUrls(output)).toEqual(['http://localhost:4000', 'http://localhost:5173/'])
  })

  it('counts one server once, whatever path it prints', () => {
    // An access log is not a list of new servers.
    const output = 'ready at http://localhost:3000\r\nGET http://localhost:3000/api/users 200\r\n'
    expect(findServerUrls(output)).toEqual(['http://localhost:3000'])
  })

  it('keeps the path a server serves under', () => {
    expect(findServerUrls('open http://localhost:8080/admin/login')).toEqual(['http://localhost:8080/admin/login'])
  })

  it('rewrites a bind-to-everything host into one a browser can open', () => {
    // `0.0.0.0` is every interface, not an address — Chrome cannot open it.
    expect(findServerUrls('Listening on http://0.0.0.0:8000')).toEqual(['http://localhost:8000'])
    expect(findServerUrls('Listening on http://[::]:8000')).toEqual(['http://localhost:8000'])
    expect(findServerUrls('Listening on http://127.0.0.1:4000/')).toEqual(['http://localhost:4000/'])
  })

  it('says nothing for the scripts that serve nothing', () => {
    expect(findServerUrls('✓ 42 tests passed\r\n')).toEqual([])
    expect(findServerUrls('eslint . --max-warnings 0\r\n')).toEqual([])
    // A remote URL in a log line is not a local server.
    expect(findServerUrls('see https://vitejs.dev/guide/ for help')).toEqual([])
    // No port: prose about localhost, not an offer to open it.
    expect(findServerUrls('point your browser at http://localhost')).toEqual([])
  })

  it('drops the punctuation that ends the sentence, not the URL', () => {
    expect(findServerUrls('running at http://localhost:3000.')).toEqual(['http://localhost:3000'])
    expect(findServerUrls('(http://localhost:3000/)')).toEqual(['http://localhost:3000/'])
  })

  it('stops at the border a framed banner draws after the URL', () => {
    // Vite boxes its banner; without the guard the box edge lands inside the href.
    expect(findServerUrls('│  http://localhost:5173/  │')).toEqual(['http://localhost:5173/'])
  })
})

describe('serverUrlOrigin', () => {
  it('reduces a URL to the server behind it', () => {
    expect(serverUrlOrigin('http://localhost:3000/api/users')).toBe('localhost:3000')
    expect(serverUrlOrigin('http://LOCALHOST:3000/')).toBe('localhost:3000')
  })
})

describe('serverUrlPort', () => {
  it('gives the probe the number it has to ask about', () => {
    expect(serverUrlPort('http://localhost:3000/dev')).toBe(3000)
    expect(serverUrlPort('http://localhost:9200')).toBe(9200)
  })
})

describe('createServerUrlScanner', () => {
  it('finds a URL split across two chunks', () => {
    // The ordinary case, not an edge one: a PTY flushes when it flushes.
    const scan = createServerUrlScanner()
    expect(scan('  ➜  Local:   http://local')).toEqual([])
    expect(scan('host:5173/\r\n')).toEqual(['http://localhost:5173/'])
  })

  it('keeps listening after the first server, for the second one', () => {
    // The bug this fixes: `dev:local` announced its API, the card took that and stopped
    // looking, and the front end — the one you actually want to open — never appeared.
    const scan = createServerUrlScanner()
    expect(scan('[api] listening on http://localhost:4000\r\n')).toEqual(['http://localhost:4000'])
    expect(scan('[api] connected to the database\r\n')).toEqual([])
    expect(scan(VITE)).toEqual(['http://localhost:5173/'])
  })

  it('reports a server once, through the restarts and the request log that follow', () => {
    // A dev server reprints its banner on every restart; the card must not grow a row.
    const scan = createServerUrlScanner()
    expect(scan(VITE)).toEqual(['http://localhost:5173/'])
    expect(scan(VITE)).toEqual([])
    expect(scan('GET http://localhost:5173/src/main.tsx 200\r\n')).toEqual([])
  })

  it('reports the addresses a script only talks about too, and leaves the sorting to the probe', () => {
    // A `dev:local` prints its own config next to its banner. Deciding from the words
    // around a URL which is a server and which is a proxy target is a keyword list that
    // is always missing the next tool — `main/port-probe.ts` asks the port instead.
    const scan = createServerUrlScanner()
    const output = [
      '  ➜  Local:   http://localhost:3000/dev',
      'API_URL=http://localhost:3002',
      'proxying /search → http://localhost:9200',
    ].join('\r\n')

    expect(scan(output)).toEqual([
      'http://localhost:3000/dev',
      'http://localhost:3002',
      'http://localhost:9200',
    ])
  })

  it('retires once it has examined all the candidates it will', () => {
    // A bound on work, not a filter: a log full of URLs must not keep it scanning.
    const scan = createServerUrlScanner()
    const ports = Array.from({ length: 20 }, (_, i) => 3000 + i)
    const found = ports.flatMap(port => scan(`listening on http://localhost:${port}\r\n`))
    expect(found).toHaveLength(12)
    expect(found[0]).toBe('http://localhost:3000')
    expect(found[11]).toBe('http://localhost:3011')
  })

  it('keeps its memory bounded while a script logs for hours', () => {
    const scan = createServerUrlScanner()
    for (let i = 0; i < 500; i++) expect(scan(`GET /assets/chunk-${i}.js 200\r\n`)).toEqual([])
    // The tail is still short enough that the split-URL case works after all that.
    expect(scan('ready at http://local')).toEqual([])
    expect(scan('host:4321/')).toEqual(['http://localhost:4321/'])
  })
})

describe('serverUrlLabel', () => {
  it('keeps what a person recognises and drops the rest', () => {
    expect(serverUrlLabel('http://localhost:5173/')).toBe('localhost:5173')
    expect(serverUrlLabel('http://localhost:3000')).toBe('localhost:3000')
    expect(serverUrlLabel('http://localhost:8080/admin')).toBe('localhost:8080/admin')
  })
})
