import { Text } from './Text'

/**
 * WHAT THE SETTINGS ABOVE WILL ACTUALLY PRODUCE — a commit message in the format just
 * picked, spelled out.
 *
 * The thing a form of dropdowns cannot say on its own. "Angular" and "single-line" are
 * the names of shapes, and a reader who has not met them learns nothing from picking one;
 * `feat(auth): add user authentication` is the same answer in a form anybody can check
 * against what they wanted.
 *
 * ── IT IS NOT A `CommandChip` ─────────────────────────────────────────────────────
 *
 * Same sunken plate, same monospace, and the opposite meaning. A chip holds something the
 * reader is meant to TYPE; this holds something the app will WRITE. That is why this one
 * has a label and no copy button: copying a sample would put a made-up commit message on
 * the clipboard, and the label is what stops the block reading as a value that is already
 * in force somewhere.
 *
 * ── THE SAMPLE IS NEVER TRANSLATED, AND THAT IS THE CALLER'S PROBLEM ─────────────
 *
 * Worth stating here because it looks like a bug every time somebody meets it: what goes
 * in is an illustration of what a SKILL will write, and a skill writes in the repository's
 * own configured language rather than in the interface's. A French sample over a
 * repository that commits in English would be the form contradicting itself. The `label`
 * IS translated — it is the app talking, not the sample.
 */

export interface OutputSampleProps {
  /** What this is a sample OF — "Example". Already translated. */
  label: string
  /**
   * The sample, verbatim, with its line breaks preserved: a multi-line commit message is
   * a subject, a blank line and a body, and collapsing that is collapsing the one thing
   * the `multi-line` style means.
   */
  children: string
  /** Margins and width. Not the plate, the padding or the type. */
  className?: string
}

export function OutputSample({ label, children, className = '' }: OutputSampleProps) {
  return (
    <div className={`rounded-lg bg-surface-sunken px-3 py-2.5 ${className}`.trim()}>
      {/* `2xs` uppercase at 50%, the same quiet a `SettingsCard` title wears: this names
          the block on the way past and is not read twice. */}
      <Text size="2xs" tone="secondary" className="block uppercase tracking-wider opacity-50">
        {label}
      </Text>
      <pre className="mt-2 whitespace-pre-wrap break-words font-mono text-xs leading-5 text-text-secondary">
        {children}
      </pre>
    </div>
  )
}
