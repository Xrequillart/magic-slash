'use client'

import { useState } from 'react'
import { WhatsNewDialog, type WhatsNewCategory } from '@ds/desktop'
import type { DesktopTheme } from '@/lib/desktopTheme'
import { EntryHeader, EntrySection, PropsTable, Snippet, Stage, type PropRow } from '../parts'
import { usesOf } from './ids'

/** A real release, read out of `CHANGELOG.md` — the shape the app's parser hands over. */
const CATEGORIES: WhatsNewCategory[] = [
  {
    id: 'Added',
    label: 'Added',
    hue: 'green',
    entries: [
      {
        scope: 'Desktop',
        text: 'The repositories list is redrawn — no border, the name and its GitHub status as labels, the path underneath, and the remote and agent count gathered at the right edge',
      },
      {
        scope: 'Desktop',
        text: 'A Button component in the design system, seven sizes and nine tones, replacing the seven hand-kept button constants the app had grown',
      },
    ],
  },
  {
    id: 'Changed',
    label: 'Changed',
    hue: 'accent',
    entries: [
      {
        scope: 'Desktop',
        text: 'The repositories page drops its heading and keeps its one action, now a design-system button',
      },
      { scope: 'Desktop', text: 'The script card’s stop control is that same button' },
    ],
  },
  {
    id: 'Fixed',
    label: 'Fixed',
    hue: 'yellow',
    entries: [
      {
        scope: 'Desktop',
        text: 'Leaving a repository’s settings sweeps back the way it arrived instead of repeating the arrival',
      },
    ],
  },
]

const PROPS: PropRow[] = [
  {
    name: 'title',
    type: 'string',
    required: true,
    description:
      'The cover’s one word — “What’s New”. Translated, and it is the dialog’s heading in the ordinary sense and in the accessible one: aria-labelledby points at it. The same every time, which is why it belongs on the cover — what changes is underneath.',
  },
  {
    name: 'version',
    type: 'string',
    required: true,
    description:
      'Spelled by the caller — “v0.96.2”. Drawn verbatim, for the reason Sidebar’s version line and UpdateDialog both give: which prefix a version wears is not this dialog’s question.',
  },
  {
    name: 'date',
    type: 'string',
    description:
      'The day it shipped, already formatted — “16 September 2026”. Optional, because a release the app learned about from a source with no date is real, and a line reading “Invalid Date” under the version is worse than no line.',
  },
  {
    name: 'categories',
    type: '{ id, label, hue, entries: { scope?, text }[] }[]',
    required: true,
    description:
      'The release, parsed. The same shape CHANGELOG.md has and the webapp’s own changelog reads — turning GitHub’s release HTML into it is the app’s job, not this component’s. The scope is split out of the sentence because the source splits it: every entry opens **Desktop**: …, and a column of bold scopes is what makes a release of twenty lines scannable.',
  },
  {
    name: 'confirmLabel',
    type: 'string',
    required: true,
    description:
      'The word on the one button. Translated: this folder has no dictionary.',
  },
  {
    name: 'onClose',
    type: '() => void',
    required: true,
    description:
      'What the button, Escape and a click on the ground all call. There is no close button in the band: nothing here has to be decided, so a cross on a dialog whose only action is “Got it” was a second answer to a question with one.',
  },
  {
    name: 'backdropClassName · className · onAnimationEnd',
    type: 'string · string · (e) => void',
    description: 'The caller’s enter and exit animation — see Modal, which owns neither.',
  },
  {
    name: 'portalTo',
    type: 'HTMLElement | null',
    description: 'Passed straight to Modal — see its note on why a drawing of the app needs it.',
  },
]

export function WhatsNewDialogEntry({
  theme,
  onOpen,
}: {
  theme: DesktopTheme
  onOpen?: (id: string) => void
}) {
  return (
    <article className="flex flex-col divide-y divide-hairline">
      <EntryHeader title="WhatsNewDialog" uses={usesOf('whatsnewdialog')} onOpen={onOpen}>
        What the version you just installed brought — the dialog the app opens once, on the
        first launch after an update. A changelog page the size of a dialog.
      </EntryHeader>

      <EntrySection
        title="It is typeset like the public changelog"
        note="The version and the day it shipped at the top, then the release’s categories, each a coloured dot and an uppercase label over a list of entries with a hanging indent and a bold scope in front of them. Every one of those is /changelog’s decision, and it is worth naming why rather than inventing a second look: the two are the same document, read by the same person at two different moments."
      >
        <Stage theme={theme}>
          <Playback />
        </Stage>
      </EntrySection>

      <EntrySection
        title="A dot carries the colour, the label carries the reading"
        note="The public changelog’s own call, and this repeats it: a hue on a 10% wash of itself is about 2:1 against the ground at 11px, and on this list the label is the only thing naming the group — no mark beside it, no heading above it. So the dot is the colour, the label is ink, and a 6px dot is not text and is not held to a text contrast ratio. Added is green, Changed is the accent, Fixed is yellow; a heading this build does not recognise still renders, under its own raw word and a neutral mark."
      >
        <p className="max-w-2xl text-xs leading-relaxed text-muted">
          The bullet in front of each entry is <em>drawn</em> rather than{' '}
          <code>list-disc</code>: a browser’s own marker sits on the first line’s baseline
          and is styled with the text, so a wrapped entry hangs under its bullet instead of
          beside it. A flex row with a dot of its own gives the whole entry one hanging
          indent, which is what a list of sentences this long needs.
        </p>
      </EntrySection>

      <EntrySection
        title="What it replaced"
        note="A 2.4MB illustration filling the top of the panel, a hand-rolled close button on a bg-black/30 square in its corner, a raw BTN_PRIMARY string at the bottom, and the release notes injected with dangerouslySetInnerHTML and dressed by nine .whats-new-content rules in the app’s stylesheet — a stylesheet reaching into markup nobody in this repo wrote."
      >
        <p className="max-w-2xl text-xs leading-relaxed text-muted">
          The band is the site’s <code>tone-sky</code>, the ground <code>/features</code>{' '}
          sets the context card on, declared as <code>bg-release-mesh</code> in the
          desktop’s own Tailwind config — the two halves of this folder share nothing, so it
          is pasted rather than imported.
        </p>
      </EntrySection>

      <EntrySection
        title="It ignores the theme"
        note="The single surface in the app that does. The band is fixed and the panel under it is release-paper with release-ink — a white page with near-black type, which is what /changelog is. A release read on midnight and the same release read on light are the same document, so they are printed the same way. Switch the theme above: everything moves except this."
      >
        <p className="max-w-2xl text-xs leading-relaxed text-muted">
          Two things inside it still follow the theme, deliberately: the category dots and
          the one button. Those are where colour carries <em>meaning</em> rather than
          surface — the app’s own green, accent and yellow — and all of them are saturated
          enough to read on white under every theme. The button keeps its shadow because
          the shadow is the <code>accent</code> tone’s and not this dialog’s: see{' '}
          <code>Button</code>, whose header is explicit that it is what makes a filled
          button read as an object on the page rather than a rectangle painted on it.
        </p>
      </EntrySection>

      <EntrySection title="Props">
        <PropsTable rows={PROPS} />
        <Snippet>{`import { WhatsNewDialog } from '@ds/desktop'

<WhatsNewDialog
  title={t('whatsNew.title')}
  version={\`v\${release.version}\`}
  date={formatReleaseDate(release.releaseDate, locale)}
  categories={parseRelease(release.releaseNotes, t)}
  confirmLabel={t('whatsNew.gotIt')}
  onClose={dismiss}
/>`}</Snippet>
        <p className="max-w-2xl text-xs leading-relaxed text-muted">
          The app’s <code>WhatsNewModal</code> is what does the wiring: the IPC, the Escape
          key, the exit animation, the reader’s locale, and the DOM parser that reads
          GitHub’s release HTML into those categories.
        </p>
      </EntrySection>
    </article>
  )
}

/**
 * The dialog, opened into the section rather than over the page.
 *
 * `portalTo` on a div inside the `Stage` is `UpdateDialogEntry`'s arrangement and it is
 * here for the same two reasons: the theme's `--c-*` variables are on the stage rather
 * than on `:root`, so a panel portalled to the body would resolve none of them — and a
 * gallery that took over the whole window to show one component would be a worse
 * gallery than one you can scroll past.
 */
function Playback() {
  const [portal, setPortal] = useState<HTMLDivElement | null>(null)
  const [open, setOpen] = useState(false)

  return (
    <div className="flex flex-col items-start gap-3">
      <div ref={setPortal} />
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg bg-surface px-3 py-2 text-xs font-medium text-ink transition-colors hover:bg-surface-strong"
      >
        Open the dialog
      </button>
      {open && (
        <WhatsNewDialog
          title="What’s New"
          version="v0.96.2"
          date="16 September 2026"
          categories={CATEGORIES}
          confirmLabel="Got it"
          onClose={() => setOpen(false)}
          portalTo={portal}
        />
      )}
    </div>
  )
}
