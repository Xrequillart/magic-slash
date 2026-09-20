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
      'The heading — “What’s New”. Translated, and it is the dialog’s heading in the ordinary sense and in the accessible one: aria-labelledby points at it. It sat on the band while the band was a coloured plate with nothing in it; the band is a drawing now, so it opens the page instead, over the version and the date it names.',
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
    name: 'closeLabel',
    type: 'string',
    required: true,
    description:
      'The name of the cross — the accessible name of the only control in the dialog, which ButtonIcon will not take a mark without. Translated: this folder has no dictionary.',
  },
  {
    name: 'onClose',
    type: '() => void',
    required: true,
    description:
      'What the cross, Escape and a click on the ground all call. The cross is the only control here, and that is the point: nothing in this dialog has to be decided, so an accent button at the foot reading “Got it” was an action where there is no action. It said “confirm” about a page you had merely finished reading.',
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
        note="A 2.4MB raster filling the top of the panel, a hand-rolled close button on a bg-black/30 square in its corner, a raw BTN_PRIMARY string at the bottom, and the release notes injected with dangerouslySetInnerHTML and dressed by nine .whats-new-content rules in the app’s stylesheet — a stylesheet reaching into markup nobody in this repo wrote."
      >
        <p className="max-w-2xl text-xs leading-relaxed text-muted">
          The band is <code>WhatsNewArt</code>, and it is two-tone line work: every one of
          its 749 paths was <code>fill=&quot;black&quot;</code> over a white plate, the
          plate is gone and the black is <code>currentColor</code>. So the drawing takes
          the colour the band sets and the shapes it knocks out — the collar, the shirt
          buttons, the paper — are the <em>ground</em> showing through. It is spelled out
          as a component rather than imported as a file for <code>brand.tsx</code>’s
          reason: a <code>.svg</code> needs a loader, a loader is per app, and the two
          halves of this folder do not share a build.
        </p>
      </EntrySection>

      <EntrySection
        title="The page follows the theme and the cover does not"
        note="None of it used to. A raster baked against a pale ground can only be shown on a pale ground, so the panel under the old band had to be a fixed white page with fixed near-black ink — eight themes or not. Line work on currentColor unpicks that, and the choice it opens up is split: below the band is a document, and a document is read in the app’s own colours; the band is a picture, and a picture that restated whichever of the eight grounds the app happens to be wearing would be saying nothing. Switch the theme above — the page turns over underneath a cover that stays where it is."
      >
        <p className="max-w-2xl text-xs leading-relaxed text-muted">
          So the band keeps <code>release-paper</code> and <code>release-ink</code>, the
          fixed pair the desktop’s sign-in card is mixed from, and the cross on it takes{' '}
          <code>ButtonIcon</code>’s <code>paper</code> tone for the same reason: the
          theme’s own <code>text-icon</code> is mixed against the theme’s ground, so on{' '}
          <code>midnight</code> a neutral cross here would be a pale mark on white — the
          one control in the dialog, invisible. Everything below moves: the ink, the
          secondary text, the bullets. The category dots keep the app’s green, accent and
          yellow, which are where colour carries <em>meaning</em> rather than surface.
        </p>
      </EntrySection>

      <EntrySection
        title="Nothing pins, and nothing scrolls inside it"
        note="The dialog is the height of its content, which is what the missing footer makes possible. There was a Got it button holding the bottom, a capped panel, and a scroller between them — and a page that scrolls behind its own chrome stops reading like a page. The overflow moved out to the dimmed ground instead: Modal’s scrollableGround, so a release long enough to pass the window scrolls whole, behind the dim."
      >
        <p className="max-w-2xl text-xs leading-relaxed text-muted">
          That ground centres the panel with <code>m-auto</code> rather than{' '}
          <code>items-center</code>, which is the one piece of it that is not obvious: a
          flex child centred by <code>align-items</code> and overflowing its scroll
          container has its overflow clipped at the <em>start</em> edge in Chromium, so
          the top of a tall panel becomes unreachable — precisely the failure the change
          is meant to prevent. Auto margins absorb the free space when there is some and
          collapse to nothing when there is not.
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
  closeLabel={t('common.close')}
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
          closeLabel="Close"
          onClose={() => setOpen(false)}
          portalTo={portal}
        />
      )}
    </div>
  )
}
