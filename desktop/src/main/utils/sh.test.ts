import { describe, it, expect } from 'vitest'
import { execFileSync } from 'child_process'
import { shQuote } from './sh'

/**
 * The quoting itself, and then the shell's own opinion of it.
 *
 * The second half is the point. A hand-written expectation only proves the function
 * matches what the author believed about `sh`, and this function exists because that
 * belief was wrong once already — `JSON.stringify` looks like quoting and is not. So
 * every hostile payload here is also RUN through a real shell, and the assertion is
 * that the shell hands back the original bytes and nothing happened on the way.
 */
describe('shQuote', () => {
  it('wraps a plain value in single quotes', () => {
    expect(shQuote('hello')).toBe("'hello'")
  })

  it('quotes the empty string as a real empty argument', () => {
    // `''` and not `` — an unquoted nothing is no argument at all, which would shift
    // every argument after it one place to the left.
    expect(shQuote('')).toBe("''")
  })

  it("closes, escapes and reopens around a single quote", () => {
    expect(shQuote("it's")).toBe("'it'\\''s'")
  })

  it('leaves shell metacharacters inert rather than escaping them', () => {
    // Nothing about `$` or a backtick needs escaping INSIDE single quotes, and
    // escaping them would be wrong: the backslash would survive into the value.
    expect(shQuote('$(id)')).toBe("'$(id)'")
    expect(shQuote('`id`')).toBe("'`id`'")
  })

  /**
   * Every shape that got past the old `JSON.stringify`, plus the one that gets past
   * naive single-quoting. If a future rewrite breaks any of these, it breaks here.
   */
  const payloads = [
    '$(id)',
    '`id`',
    '${HOME}',
    '$HOME',
    'a"b',
    "a'b",
    "'; id; echo '",
    "'\\''",
    'a\\b',
    'a\nb',
    'a; rm -rf /tmp/nothing',
    'a && echo pwned',
    'a | echo pwned',
    '*',
    '~',
    '!!',
    '/magic:continue AB-1$(id)',
    '/magic:continue AB-1`id`',
    '',
    'é — ✅',
  ]

  it.each(payloads)('survives a real shell unchanged: %j', (payload) => {
    // printf %s, not echo: echo mangles backslashes and leading dashes on some shells,
    // which would make this test about echo rather than about the quoting.
    const out = execFileSync('/bin/sh', ['-c', `printf %s ${shQuote(payload)}`], {
      encoding: 'utf-8',
    })
    expect(out).toBe(payload)
  })

  it('keeps a payload one argument, however many spaces and operators it holds', () => {
    // INTERPOLATED into the command string, which is the situation the function is for
    // — passing it as an argv element would prove nothing, since argv never splits.
    // `set --` then makes the shell's own word count observable: `$#` is 4 for an
    // unquoted `a b; id && echo x`, and 1 for anything this function returns.
    const out = execFileSync(
      '/bin/sh',
      ['-c', `set -- ${shQuote('a b; id && echo x')}; printf %s "$#"`],
      { encoding: 'utf-8' },
    )
    expect(out).toBe('1')
  })

  it('is idempotent under composition, so a doubly quoted value is still literal', () => {
    const once = shQuote('$(id)')
    const out = execFileSync('/bin/sh', ['-c', `printf %s ${shQuote(once)}`], { encoding: 'utf-8' })
    expect(out).toBe(once)
  })
})
