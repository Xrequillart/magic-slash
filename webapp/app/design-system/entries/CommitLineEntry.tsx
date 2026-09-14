'use client'

import { useState } from 'react'
import { CommitLine } from '@ds/desktop'
import { Github } from '@ds/desktop/icons'
import type { DesktopTheme } from '@/lib/desktopTheme'
import { EntryHeader, EntrySection, PropsTable, Snippet, Stage, type PropRow } from '../parts'

const PROPS: PropRow[] = [
  {
    name: 'subject',
    type: 'string',
    required: true,
    description:
      'The commit’s first line. Truncates, with the whole of it on the title — half a subject still says which commit it is.',
  },
  {
    name: 'shortHash',
    type: 'string',
    required: true,
    description:
      'The abbreviated hash, as git prints it. What the chip shows, while the copy handler deals in the full one: a component that derived one from the other would be guessing at an abbreviation length that is a repository setting.',
  },
  {
    name: 'relativeDate',
    type: 'string',
    required: true,
    description:
      'The age, already formatted and already translated. The app turns git’s “2 hours ago” into “2h” through formatRelativeDate, which needs the renderer’s t — handing this the raw string and a translator would drag the i18n runtime into the design system for one line of text.',
  },
  {
    name: 'first / last',
    type: 'boolean',
    fallback: 'false',
    description:
      'Where the row sits in the rail. The first has no segment above its tick, the last none below. Set last to false when a “+N more” line continues the trail.',
  },
  {
    name: 'copy',
    type: '{ label: string; copied?: boolean; onCopy: () => void }',
    required: true,
    description:
      'The hash control. Required, unlike BranchCard’s: a branch chip without a copy button is still a branch chip, but a hash nobody can take is eight characters of noise — the short one exists to be pasted somewhere that wants the long one.',
  },
  {
    name: 'open',
    type: '{ label: string; icon: IconComponent; onOpen: () => void }',
    description:
      'Opening the commit somewhere else, or nothing. A callback and not a URL: the app opens it with window.electronAPI.shell, which this folder must never name. The caller owns the condition too — the app shows it only for a pushed commit in a repo with a known address.',
  },
  {
    name: 'className',
    type: 'string',
    fallback: "''",
    description: 'Margins and placement. Not the rail, the chip or the grounds.',
  },
]

const COMMITS = [
  { subject: 'feat(desktop): add a liquid glass variant to the switch', hash: 'd84c475a', date: '2h' },
  { subject: 'refactor(landing): draw the switch with the real component', hash: '74ce5625', date: '5h' },
  { subject: 'fix(landing): escape the apostrophe that broke the vercel build', hash: '9c3c3e82', date: '1d' },
]

/** The real thing, clipboard and all — the tick is what the app shows for two seconds. */
function Live({ theme }: { theme: DesktopTheme }) {
  const [copied, setCopied] = useState<string | null>(null)
  return (
    <Stage theme={theme}>
      <div className="max-w-md">
        {COMMITS.map((commit, i) => (
          <CommitLine
            key={commit.hash}
            subject={commit.subject}
            shortHash={commit.hash}
            relativeDate={commit.date}
            first={i === 0}
            last={i === COMMITS.length - 1}
            copy={{
              label: `Copy full hash: ${commit.hash}`,
              copied: copied === commit.hash,
              onCopy: () => {
                setCopied(commit.hash)
                setTimeout(() => setCopied(null), 2000)
              },
            }}
            open={i < 2 ? { label: 'View on GitHub', icon: Github, onOpen: () => {} } : undefined}
          />
        ))}
      </div>
    </Stage>
  )
}

export function CommitLineEntry({
  theme,
  onOpen,
}: {
  theme: DesktopTheme
  onOpen?: (id: string) => void
}) {
  return (
    <article className="flex flex-col divide-y divide-hairline">
      <EntryHeader
        title="CommitLine"
        uses={[
          { id: 'buttonicon', label: 'ButtonIcon' },
          { id: 'icon', label: 'Icon' },
          { id: 'text', label: 'Text' },
        ]}
        onOpen={onOpen}
      >
        One commit, on the rail that says it belongs to a branch. It is the <em>row</em>;{' '}
        <code>CommitCard</code> is the panel that stacks these and says how many there are —
        the same split as <code>BranchCard</code> and the chips inside it.
      </EntryHeader>

      <EntrySection
        title="The rail is the component"
        note="A list of commits is a sequence, and nothing in the row said so — five subjects stacked in a box read as five unrelated lines, when what they are is one branch in order. The rail says it in the gutter, at no cost to the width the subjects have. Press a hash: it is live, and the tick is what the app shows for two seconds."
      >
        <Live theme={theme} />
        <p className="max-w-2xl text-xs leading-relaxed text-muted">
          Yellow because this is the branch’s own work, unpushed or unmerged: the card it sits
          in already spends green on the current branch and red on deletions, so the third
          colour has to be one neither of those claims. The tick is hollow — a window-coloured
          centre in a yellow ring — so it reads as a marker <em>on</em> the line rather than a
          blob interrupting it.
        </p>
      </EntrySection>

      <EntrySection
        title="Where the rail starts and stops"
        note="It is drawn per row, in two halves that meet at the tick, so a row knows only whether it is the first or the last. That is also why nothing in here uses space-y: a gap between rows would show as a broken trail, so each row carries its own py-1 and consecutive segments touch."
      >
        <Stage theme={theme} className="flex flex-col gap-6">
          <div className="max-w-md">
            <span className="mb-1 block font-mono text-[10px] text-text-secondary">
              first and last on one row — a branch with a single commit
            </span>
            <CommitLine
              subject="chore(release): bump version to 0.94.6"
              shortHash="0990423c"
              relativeDate="3d"
              first
              last
              copy={{ label: 'Copy full hash', onCopy: () => {} }}
            />
          </div>
          <div className="max-w-md">
            <span className="mb-1 block font-mono text-[10px] text-text-secondary">
              neither — a row in the middle, rail running through
            </span>
            <CommitLine
              subject="feat(desktop): move the switch to the design system"
              shortHash="94b91fcc"
              relativeDate="6h"
              copy={{ label: 'Copy full hash', onCopy: () => {} }}
            />
          </div>
        </Stage>
      </EntrySection>

      <EntrySection
        title="The hash is not a Text"
        note="It is the one control in the pair that is not a ButtonIcon, because it carries a word — eight characters of hexadecimal — and ButtonIcon is icon-only by construction. So it is its own component inside this one, wearing ACTION_CHIP’s shape spelled out: the app keeps that string in renderer/components/actionChip.ts, and this folder cannot import from the app."
      >
        <p className="max-w-2xl text-xs leading-relaxed text-muted">
          The hash itself is a plain <code>span</code> and not a <code>Text</code>, on purpose:{' '}
          <code>Text</code> pins Cera Pro as its face, so a <code>font-mono</code> in its{' '}
          <code>className</code> would be a second font-family class settled by the order
          Tailwind emitted the two in — the same trap its own notes warn about for colour. A
          hash has to be monospaced to be checkable against a terminal.
        </p>
      </EntrySection>

      <EntrySection title="Props">
        <PropsTable rows={PROPS} />
        <Snippet>{`import { CommitLine } from '@ds/desktop'
import { Github } from '@ds/desktop/icons'

<CommitLine
  subject={commit.subject}
  shortHash={commit.shortHash}
  relativeDate={formatRelativeDate(commit.relativeDate, t)}
  first={index === 0}
  last={index === shown.length - 1}
  copy={{
    label: \`Copy full hash: \${commit.hash}\`,
    copied: copiedCommitHash === commit.hash,
    onCopy: () => onCopyCommitHash(commit.hash),
  }}
  open={{
    label: t('agentInfo.viewOnGitHub'),
    icon: Github,
    onOpen: () => shell.openExternal(url),
  }}
/>`}</Snippet>
      </EntrySection>
    </article>
  )
}
