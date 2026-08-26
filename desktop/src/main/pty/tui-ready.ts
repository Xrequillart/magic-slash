/**
 * Watching a PTY's output for the moment Claude Code's input box is ready to be
 * typed into.
 *
 * Its own module, importing nothing, so it has a sibling test: the alternative
 * lives inside `terminal-manager`, which pulls `node-pty` and cannot be imported
 * by the suite at all (see the note at the top of initial-metadata.test.ts).
 *
 * The signal is `CSI ? 2004 h` — bracketed paste on — which Claude Code emits when
 * its TUI takes stdin over, measured at ~770ms after spawn on v2.1.x and right
 * before the first caret is drawn. Text written before it is echoed by the line
 * discipline and left sitting above the banner instead of landing in the box, and
 * the delay is the machine's rather than ours, so this waits for the announcement
 * rather than guessing at a duration. Being a terminal mode-set rather than a
 * Claude Code invention, it also survives its releases.
 */

/** Bracketed paste on: the input box has stdin. */
export const TUI_READY_MARKER = '\x1b[?2004h'

export interface TuiReadyScanner {
  /**
   * Feed one chunk of PTY output. Returns true the FIRST time the marker has been
   * seen, and false forever after — so the caller can act on the moment without
   * tracking whether it has already acted.
   */
  seen(chunk: string): boolean
}

/**
 * A scanner for that marker across a stream arriving in arbitrary chunks.
 *
 * The tail of each chunk is carried into the next, because an 8-byte needle can
 * straddle two reads and `data.includes()` alone would miss it — a miss that costs
 * the whole feature and would show up only on the machine unlucky enough to split
 * there. One marker's length of memory is all that takes: this is a needle search,
 * not a buffer.
 *
 * Latches on the first hit. Claude Code re-enables bracketed paste on its own
 * account (after a shell-out, after a resize), and the caller's question is "is the
 * box up yet", asked once.
 */
export function createTuiReadyScanner(marker: string = TUI_READY_MARKER): TuiReadyScanner {
  let tail = ''
  let latched = false

  return {
    seen(chunk: string): boolean {
      if (latched) return false
      const haystack = tail + chunk
      if (haystack.includes(marker)) {
        latched = true
        tail = ''
        return true
      }
      // Keep only what could still be the head of a straddling marker. A full
      // marker's length rather than one less: the slice is a suffix, so an exact
      // match inside it would already have been caught above.
      tail = haystack.slice(-marker.length)
      return false
    },
  }
}
