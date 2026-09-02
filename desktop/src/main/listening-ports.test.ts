import { describe, it, expect } from 'vitest'
import { parseListeningPorts, parseProcessTree } from './listening-ports'

// Verbatim `lsof -nP -iTCP -sTCP:LISTEN -F pn` output: one field per line, tagged by
// its first character. The `f` lines are the reason this is a parser and not a regex —
// every socket contributes one, and a naive scan reads their numbers as ports.
const LSOF = [
  'p900',
  'f11',
  'n*:3002',
  'p1000',
  'f10',
  'n127.0.0.1:3000',
  'f12',
  'n[::1]:3000',
  'p1010',
  'f7',
  'n*:5173',
].join('\n')

describe('parseListeningPorts', () => {
  it('reads a port once per address it is bound to, whoever owns it', () => {
    expect(parseListeningPorts(LSOF)).toEqual(new Set([3002, 3000, 5173]))
  })

  it('keeps only the ports held by the pids it was given', () => {
    // The whole filter: :3002 belongs to something else on this machine, and a card
    // for it opens on someone else's server.
    expect(parseListeningPorts(LSOF, new Set([1000, 1010]))).toEqual(new Set([3000, 5173]))
  })

  it('ignores an established connection', () => {
    // `-sTCP:LISTEN` already excludes these; a mistaken call must not report the
    // outbound port of a socket either.
    expect(parseListeningPorts('p1000\nn127.0.0.1:52341->140.82.121.5:443\n')).toEqual(new Set())
  })

  it('answers nothing rather than throwing on output it does not recognise', () => {
    expect(parseListeningPorts('')).toEqual(new Set())
    expect(parseListeningPorts('lsof: WARNING: can\'t stat() nfs file system\n')).toEqual(new Set())
  })
})

describe('parseProcessTree', () => {
  // `pnpm dev:local` in a PTY: the shell, the package manager under it, and the two
  // servers `concurrently` starts under that. The port is opened three levels down.
  const PS = [
    '    1     0',
    '  500     1',
    ' 1000   500', // the PTY shell
    ' 1001  1000', // pnpm
    ' 1002  1001', // the API
    ' 1003  1001', // the front end
    ' 2000     1', // an unrelated process
    ' 2001  2000',
  ].join('\n')

  it('collects the whole subtree, not just the direct children', () => {
    expect(parseProcessTree(PS, 1000)).toEqual(new Set([1000, 1001, 1002, 1003]))
  })

  it('leaves out everything hanging off another root', () => {
    expect(parseProcessTree(PS, 2000)).toEqual(new Set([2000, 2001]))
  })

  it('answers with the root alone when it has no children', () => {
    expect(parseProcessTree(PS, 1002)).toEqual(new Set([1002]))
    expect(parseProcessTree(PS, 9999)).toEqual(new Set([9999]))
  })

  it('terminates on a cycle it should never be given', () => {
    // A parse artefact, not a real process table — but a `while` over an unbounded
    // queue in the main process is not the place to find that out.
    expect(parseProcessTree('10 11\n11 10\n', 10)).toEqual(new Set([10, 11]))
  })
})
