'use client'

import type { CSSProperties, ReactNode } from 'react'
import type { DesktopTheme } from '@/lib/desktopTheme'

/**
 * The furniture of a component's entry: the heading, the ground its previews sit
 * on, and the two tables under them.
 *
 * These are the WORKBENCH's own chrome and they wear this site's tokens — `ink`,
 * `canvas`, `hairline`. Only what goes INSIDE a `<Stage>` is the desktop app, and
 * the boundary is worth keeping sharp: a workbench painted in the palette it is
 * inspecting cannot show you a mistake in that palette.
 */

/**
 * The two halves of "built on", which travel together or not at all.
 *
 * A UNION and not two optional props, because the two were optional for one commit and
 * `ButtonIcon` shipped a list of chips that could not be clicked: it declared `uses`
 * and forgot to forward `onOpen`, and nothing said so — the header quietly fell back to
 * rendering plain text. Spelled this way, `uses` without `onOpen` is a `tsc` error at
 * the call site.
 */
type UsesProps =
  | { uses?: undefined; onOpen?: undefined }
  | {
      /**
       * The other design-system components this one renders.
       *
       * Worth stating on the page because it is the thing a component's own preview
       * cannot show: a `Banner` and a hand-built strip look identical until you know
       * that one of them gets its mark sized by `Icon` and the other guessed. It is
       * also the first place a reader looks to answer "if I change `Icon`, what moves?"
       *
       * Declared by hand rather than derived from the imports. An import list would
       * include types, constants and everything the file touches; this is the shorter,
       * more useful claim — what it DRAWS.
       */
      uses: { id: string; label: string }[]
      /** Opens one of them. Required alongside `uses`: a chip that goes nowhere is a bug. */
      onOpen: ((id: string) => void) | undefined
    }

export function EntryHeader({
  title,
  uses,
  onOpen,
  children,
}: UsesProps & {
  title: string
  children: ReactNode
}) {
  return (
    <header className="flex flex-col gap-3 pb-8">
      <h1 className="text-3xl font-semibold text-ink">{title}</h1>
      <p className="max-w-2xl text-[15px] leading-relaxed text-muted">{children}</p>
      {uses && uses.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-muted">
          <span>Built on</span>
          {uses.map(({ id, label }) =>
            onOpen ? (
              // A real button, because it goes somewhere. The chips were flat text for
              // one iteration and every reader tried to click them anyway — which is
              // the answer to whether they should be clickable.
              <button
                key={id}
                onClick={() => onOpen(id)}
                className="rounded-full border border-hairline px-2.5 py-1 font-mono text-[11px] text-ink transition-colors hover:border-ink/20 hover:bg-canvas"
              >
                {label}
              </button>
            ) : (
              <span
                key={id}
                className="rounded-full border border-hairline px-2.5 py-1 font-mono text-[11px] text-ink"
              >
                {label}
              </span>
            ),
          )}
        </div>
      )}
    </header>
  )
}

export function EntrySection({
  title,
  note,
  children,
}: {
  title: string
  note?: ReactNode
  children: ReactNode
}) {
  return (
    <section className="flex flex-col gap-4 pt-10">
      <div className="flex flex-col gap-1.5">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">{title}</h2>
        {note && <p className="max-w-2xl text-sm leading-relaxed text-muted">{note}</p>}
      </div>
      {children}
    </section>
  )
}

/**
 * The desktop app, on this page.
 *
 * It writes the chosen theme's `--c-*` variables onto one element and paints the
 * app's own window colour under them, so everything nested inside resolves its
 * colours exactly as it would in Electron — `text-ink` included, which is why the
 * site's `ink` token is a variable with a fallback rather than a flat black (see
 * `tailwind.config.ts`).
 *
 * A `<div>` and not an `<iframe>`: the shared components are compiled into THIS
 * bundle, and an iframe would mean a second document, a second stylesheet and a
 * height to measure, in exchange for an isolation that the CSS-variable scope
 * already provides.
 */
export function Stage({
  theme,
  children,
  className = '',
}: {
  theme: DesktopTheme
  children: ReactNode
  className?: string
}) {
  return (
    <div
      style={
        {
          ...theme.vars,
          // The window, not a surface. Every desktop component expects to sit on
          // it, and several of them are translucent — a white ground would show
          // straight through the tints.
          backgroundColor: 'rgb(var(--c-bg))',
          colorScheme: theme.appearance,
        } as CSSProperties
      }
      // `text-ink` ON THE GROUND, so everything inside inherits the theme's ink the way
      // it would inside any surface of the real app. Without it, anything drawn in
      // `currentColor` — `Avatar`'s bare glyph is the one that caught this — climbs past
      // the ground to the workbench's own `text-ink` and comes out near-black on a dark
      // theme. The app never does that: every surface it draws on has a colour.
      className={`rounded-2xl border border-hairline p-6 text-ink ${className}`}
    >
      {children}
    </div>
  )
}

/** One preview, with the line of prose that says what it is showing. */
export function Specimen({ label, children }: { label: ReactNode; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-medium text-muted">{label}</span>
      {children}
    </div>
  )
}

export interface PropRow {
  name: string
  type: string
  required?: boolean
  /** The default, as it is written in the signature. Omitted when there is none. */
  fallback?: string
  description: ReactNode
}

/**
 * The props table. Typed rather than parsed out of the source: a generated table
 * can say `layout?: BannerLayout` but not why the type scale travels with the
 * layout, and the second is the only part worth a table.
 */
export function PropsTable({ rows }: { rows: PropRow[] }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-hairline">
      <table className="w-full min-w-[640px] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-hairline bg-canvas/60">
            <th className="px-4 py-3 font-semibold text-ink">Prop</th>
            <th className="px-4 py-3 font-semibold text-ink">Type</th>
            <th className="px-4 py-3 font-semibold text-ink">Default</th>
            <th className="px-4 py-3 font-semibold text-ink">Notes</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.name} className="border-b border-hairline last:border-b-0 align-top">
              <td className="whitespace-nowrap px-4 py-3 font-mono text-[13px] text-ink">
                {row.name}
                {!row.required && <span className="text-muted">?</span>}
              </td>
              <td className="px-4 py-3 font-mono text-[13px] text-muted">{row.type}</td>
              <td className="whitespace-nowrap px-4 py-3 font-mono text-[13px] text-muted">
                {row.fallback ?? '—'}
              </td>
              <td className="px-4 py-3 leading-relaxed text-muted">{row.description}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** A snippet. Not runnable, not copied from the file — the shortest true call. */
export function Snippet({ children }: { children: string }) {
  return (
    <pre className="overflow-x-auto rounded-2xl border border-hairline bg-canvas/60 p-4 font-mono text-[13px] leading-relaxed text-ink">
      {children}
    </pre>
  )
}
