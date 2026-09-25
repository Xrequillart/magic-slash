'use client'

import { useState } from 'react'
import { Card, RepairList, type RepairRow } from '@ds/desktop'
import { Download } from '@ds/desktop/icons'
import type { DesktopTheme } from '@/lib/desktopTheme'
import { EntryHeader, EntrySection, PropsTable, Snippet, Specimen, Stage, type PropRow } from '../parts'
import { usesOf } from './ids'

const PROPS: PropRow[] = [
  {
    name: 'rows',
    type: 'RepairRow[]',
    required: true,
    description:
      'One fault each: a stable id, the line saying what is wrong, and the one thing to do about it. An action is optional — a fault with no answer is something to fix that we have no way to fix, and saying so is better than a button that does nothing.',
  },
  {
    name: 'rows[].action',
    type: "{ kind: 'fix' } | { kind: 'copy' } | { kind: 'open' }",
    description:
      'Three kinds because there are three answers: we can fix it ourselves (a button, with busy while it runs), we know the command but cannot run it (it is copied, and the command itself is the label in monospace), or we can only point at a page. A tagged union for SettingRow.control’s reason — no call site gets to decide how loud a repair button is.',
  },
]

export function RepairListEntry({ theme, onOpen }: { theme: DesktopTheme; onOpen?: (id: string) => void }) {
  const [copied, setCopied] = useState<string | null>(null)
  const [installing, setInstalling] = useState(false)

  const rows: RepairRow[] = [
    {
      id: 'claude',
      message: 'claude is not installed, and the skills cannot run without it',
      action: {
        kind: 'fix',
        label: installing ? 'Installing' : 'Install',
        icon: Download,
        busy: installing,
        onClick: () => {
          setInstalling(true)
          setTimeout(() => setInstalling(false), 2000)
        },
      },
    },
    {
      id: 'jq',
      message: 'jq is not installed',
      action: {
        kind: 'copy',
        command: 'brew install jq',
        copiedLabel: 'Copied',
        copied: copied === 'brew install jq',
        onCopy: (command) => {
          setCopied(command)
          setTimeout(() => setCopied(null), 1500)
        },
      },
    },
    {
      id: 'node',
      message: 'node is 18.4.0, and 20 or newer is required',
      action: { kind: 'open', label: 'Get it', onOpen: () => undefined },
    },
    { id: 'skills', message: 'magic-plan and magic-done are missing from ~/.claude/skills' },
  ]

  return (
    <article className="flex flex-col divide-y divide-hairline">
      <EntryHeader title="RepairList" uses={usesOf('repairlist')} onOpen={onOpen}>
        What is broken, and the shortest path to it not being — one line each, the fault
        on the left and the one thing to do about it on the right.
      </EntryHeader>

      <EntrySection
        title="A fault without a fix is a worry, not a status"
        note="The machine setup card lists missing tools, unregistered MCP servers and absent skills, and each had grown its own button spelled out by hand — px-2 py-1 text-[11px] font-medium text-accent bg-accent/10 border border-accent/20 rounded-md — four times, in three shapes, one of them an anchor that looked like a button and one a button wearing a monospace font."
      >
        <Stage theme={theme}>
          <Specimen label="the three kinds, and a fault with no answer at all">
            <Card>
              <RepairList rows={rows} />
            </Card>
          </Specimen>
        </Stage>
        <p className="max-w-2xl text-xs leading-relaxed text-muted">
          Every fault wears the same bullet. It did not: the missing tools were bulleted
          and the missing servers were not, which made one list read as a list and the
          other as two loose sentences that happened to have buttons beside them. They
          are the same kind of thing, so the count of red bullets is the count of things
          to fix.
        </p>
      </EntrySection>

      <EntrySection title="Props">
        <PropsTable rows={PROPS} />
        <Snippet>{`import { RepairList } from '@ds/desktop'

<RepairList
  rows={missing.map((tool) => ({
    id: \`tool:\${tool.id}\`,
    message: t('setup.prerequisite.missing', { name: tool.id }),
    action: tool.installable
      ? { kind: 'fix', label: t('setup.install'), icon: Download, busy: installing === tool.id, onClick: () => install(tool.id) }
      : { kind: 'copy', command: tool.installCommand, copiedLabel: t('common.copied'), copied: copied === tool.installCommand, onCopy: copy },
  }))}
/>`}</Snippet>
      </EntrySection>
    </article>
  )
}
