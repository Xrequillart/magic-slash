'use client'

import { Label, LABEL_TONES, type LabelTone } from '@ds/desktop'
import { Clock, DollarSign, FolderGit2, Ticket } from '@ds/desktop/icons'
import type { DesktopTheme } from '@/lib/desktopTheme'
import { EntryHeader, EntrySection, PropsTable, Snippet, Specimen, Stage, type PropRow } from '../parts'

/**
 * The Label entry.
 *
 * The page it replaced eight of: every badge in the app drew this shape by hand, and
 * each had its own idea of which mark colour went with which ground.
 */

const TONE_NOTES: Record<LabelTone, { text: string; note: string }> = {
  neutral: { text: '3 tickets', note: 'bg-ink/5 — ours, and the mark stays muted' },
  github: { text: '#234', note: 'the same grey; GitHub’s mark takes the ink' },
  jira: { text: 'PER-1234', note: 'Atlassian’s blue at 14%' },
  'claude-code': { text: 'Claude Code', note: 'the coral at 14%, mark included' },
  'magic-slash': { text: '#7', note: 'grey on purpose — see the note below' },
}

/** The sixteen the app assigns to repositories; two are enough to show the idea. */
const REPO_COLORS = ['#BE123C', '#10B981']

const PROPS: PropRow[] = [
  {
    name: 'children',
    type: 'string',
    required: true,
    description:
      'The word. A ticket id, a repository, a product name. A string for Text’s reason: a node inside it is structure, and structure turns a badge into a card.',
  },
  {
    name: 'tone',
    type: "'neutral' | 'github' | 'jira' | 'claude-code' | 'magic-slash'",
    fallback: "'neutral'",
    description:
      'The ground, and the mark that comes with it. Four of the five are somebody else’s colour, which is the whole reason the prop exists: a brand hex may never become a token in this palette, and the tone is where it is allowed to live.',
  },
  {
    name: 'icon',
    type: 'IconComponent',
    fallback: 'the tone’s own',
    description:
      'Replaces the tone’s mark, and the only way to give a neutral label one. Any Lucide glyph or brand mark, from @ds/desktop/icons.',
  },
  {
    name: 'avatar',
    type: '{ src: string | null; alt: string }',
    description:
      'A person in front of the word instead of a glyph. Data and not a node — a ReactNode slot is how a badge becomes a card. With no photo it draws the bare glyph in the label’s mark colour, never the badge pill.',
  },
  {
    name: 'color',
    type: 'string',
    description:
      'A hue the design system does not own — a repository’s, picked from the sixteen the app assigns at runtime. The plate takes it at 12% and the mark at full strength. A hex rather than a class, because Tailwind cannot emit a class it never saw in the source.',
  },
  {
    name: 'size',
    type: "'sm' | 'md'",
    fallback: "'sm'",
    description:
      'sm is a list row and a pinned bar. md stands beside a text-2xl page heading, where the small one read as a caption adrift from a title twice its size.',
  },
  {
    name: 'onClick',
    type: '() => void',
    description:
      'Makes it a button. Absent, it renders a span with no hover, no pointer and nothing in the tab order — which is the point of the prop: a badge that lit up under a cursor that could do nothing was the thing most of these chips got wrong.',
  },
  {
    name: 'truncate',
    type: 'boolean',
    fallback: 'false',
    description:
      'Lets the word ellipsise instead of holding the label’s full width. Off by default: a ticket id truncated to PER-12… is not an id. On for the things that are names.',
  },
  { name: 'title', type: 'string', description: 'The tooltip. A truncated label needs one.' },
  {
    name: 'className',
    type: 'string',
    fallback: "''",
    description: 'Margins and layout. Not the ground, the height or the radius.',
  },
]

export function LabelEntry({
  theme,
  onOpen,
}: {
  theme: DesktopTheme
  onOpen?: (id: string) => void
}) {
  return (
    <article className="flex flex-col divide-y divide-hairline">
      <EntryHeader
        title="Label"
        uses={[
          { id: 'icon', label: 'Icon' },
          { id: 'text', label: 'Text' },
          { id: 'avatar', label: 'Avatar' },
        ]}
        onOpen={onOpen}
      >
        A mark and a word on a tinted plate — the app’s one badge, and what eight
        hand-built chips used to be. It names a thing: a ticket, a repository, a product. A
        banner addresses the reader and a status pill reports something that changes on its own;
        what a label names does not move while you look at it.
      </EntryHeader>

      <EntrySection
        title="Tones"
        note="The ground and the mark travel together. Four of the five carry a colour this app does not own — which is why they are a closed list rather than a free prop."
      >
        <Stage theme={theme} className="flex flex-col gap-3">
          {LABEL_TONES.map((tone) => (
            <span key={tone} className="flex items-center gap-4">
              <span className="w-24 flex-shrink-0 font-mono text-[10px] text-text-secondary">
                {tone}
              </span>
              <Label tone={tone}>{TONE_NOTES[tone].text}</Label>
              <span className="ml-auto min-w-0 truncate pl-4 font-mono text-[10px] text-text-secondary">
                {TONE_NOTES[tone].note}
              </span>
            </span>
          ))}
        </Stage>
        <p className="max-w-2xl text-xs leading-relaxed text-muted">
          <strong className="font-semibold text-ink">GitHub and Magic Slash are grey</strong> even
          though both own a colour. Grey is <em>ours</em>, and a list mixing plan numbers, GitHub
          issues and Jira tickets can afford exactly one loud row — spending Magic Slash’s brand
          here would make our own plans the loudest thing in it.
        </p>
      </EntrySection>

      <EntrySection
        title="Any glyph"
        note="A neutral label has no mark of its own; icon gives it one. It also overrides a tone’s, for a label that names a thing the brand mark would not identify."
      >
        <Stage theme={theme} className="flex flex-wrap gap-3">
          <Label icon={Ticket}>3 tickets</Label>
          <Label icon={DollarSign} className="tabular-nums">
            $1.42
          </Label>
          <Label icon={Clock} className="tabular-nums">
            12 min
          </Label>
          <Label>No mark at all</Label>
        </Stage>
      </EntrySection>

      <EntrySection
        title="A person instead of a glyph"
        note="avatar is data — { src, alt } — and not a node, which is the only reason it can exist here: a ReactNode slot is how a badge becomes a card. With no photo it falls back to the bare glyph in the label's own mark colour, never the badge pill: a plate inside a plate."
      >
        <Stage theme={theme} className="flex flex-wrap gap-3">
          <Label avatar={{ src: null, alt: '' }} truncate>
            a.developer@example.com
          </Label>
          <Label avatar={{ src: null, alt: '' }} size="md">
            A larger row
          </Label>
        </Stage>
        <p className="max-w-2xl text-xs leading-relaxed text-muted">
          Both show the fallback, because a page of stock faces documents nothing but the stock.
          At <code>sm</code> the face and a glyph agree at 14px; at <code>md</code> the face is a
          rung louder — 20px against the icon’s 16 — because a line drawing reads at any size and a
          photograph has to be big enough to be a face.
        </p>
      </EntrySection>

      <EntrySection
        title="A colour of its own"
        note="A repository has no brand mark to be recognised by, so its colour does that job: the plate at 12% and the mark at full strength. This is the one place a label paints its mark in the ground’s own colour."
      >
        <Stage theme={theme} className="flex flex-wrap gap-3">
          {REPO_COLORS.map((color) => (
            <Label key={color} icon={FolderGit2} color={color}>
              magic-slash
            </Label>
          ))}
          <Label icon={FolderGit2}>an uncoloured repository</Label>
        </Stage>
      </EntrySection>

      <EntrySection
        title="Clickable, or not"
        note="onClick is what makes it a button — and what makes the hover exist. Without it there is no pointer, no opacity shift and nothing in the tab order, so a label that can do nothing never pretends otherwise. Put a cursor on the two below."
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Specimen label="a span — names a thing">
            <Stage theme={theme}>
              <Label tone="jira">PER-1234</Label>
            </Stage>
          </Specimen>
          <Specimen label="a button — opens the repository">
            <Stage theme={theme}>
              <Label icon={FolderGit2} color="#BE123C" onClick={() => undefined}>
                magic-slash
              </Label>
            </Stage>
          </Specimen>
        </div>
      </EntrySection>

      <EntrySection
        title="Sizes"
        note="Two, and they are the ticket badge’s own. A fixed height rather than padding alone: the label sets the height of the row it sits in, so it is pinned instead of following whatever line-height the theme resolves."
      >
        <Stage theme={theme} className="flex flex-wrap items-center gap-4">
          <Label tone="jira" size="sm">
            PER-1234
          </Label>
          <Label tone="jira" size="md">
            PER-1234
          </Label>
        </Stage>
      </EntrySection>

      <EntrySection title="Props">
        <PropsTable rows={PROPS} />
        <Snippet>{`import { Label } from '@ds/desktop'
import { FolderGit2 } from '@ds/desktop/icons'

<Label tone="jira">{issueKey}</Label>
<Label icon={FolderGit2} color={repoColor} onClick={openSettings} truncate>
  {repoName}
</Label>`}</Snippet>
      </EntrySection>
    </article>
  )
}
