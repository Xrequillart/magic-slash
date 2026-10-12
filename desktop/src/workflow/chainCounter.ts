/**
 * How many steps have chained in a row, per working directory, for the limit of Settings →
 * Workflow (`ChainPolicy.chained`).
 *
 * "In a row" means with no prompt typed in between: every chain `/workflow/next` hands out
 * counts one, and the UserPromptSubmit hook resets the directory it fires in. Keyed by
 * directory because that is all both sides know: `/workflow/next` gets the skill's `$PWD`,
 * the hook the session's `cwd`. A skill may run in a folder below the session's, or the
 * session below the repository the skill names, so a reset clears either way.
 *
 * A count also lapses after `ttlMs` with no chain, so a directory whose prompts never
 * reached this counter (a session started elsewhere) is not held back forever.
 *
 * Pure: no node or electron import, the clock injected.
 */
export class ChainCounter {
  private readonly runs = new Map<string, { count: number; at: number }>()

  constructor(private readonly ttlMs = 30 * 60_000, private readonly now: () => number = () => Date.now()) {}

  /** The steps chained in a row from `path`, so far. */
  count(path: string): number {
    const run = this.runs.get(path)
    if (!run) return 0
    if (this.now() - run.at > this.ttlMs) {
      this.runs.delete(path)
      return 0
    }
    return run.count
  }

  /** One more step chained from `path`. */
  chained(path: string): void {
    this.runs.set(path, { count: this.count(path) + 1, at: this.now() })
  }

  /** A prompt typed in `cwd`: every count at, below or above it starts again. */
  reset(cwd: string): void {
    for (const path of [...this.runs.keys()]) {
      if (path === cwd || isBelow(path, cwd) || isBelow(cwd, path)) this.runs.delete(path)
    }
  }
}

function isBelow(child: string, parent: string): boolean {
  return child.startsWith(parent.endsWith('/') ? parent : `${parent}/`)
}
