'use client'

import { HealthCard, type HealthState } from '@ds/desktop'
import { Download } from '@ds/desktop/icons'
import type { DesktopTheme } from '@/lib/desktopTheme'
import { EntryHeader, EntrySection, PropsTable, Snippet, Specimen, Stage, type PropRow } from '../parts'
import { usesOf } from './ids'

const STATES: { state: HealthState; label: string; message: string }[] = [
  { state: 'healthy', label: 'healthy', message: 'Recording, and the last batch arrived 3 minutes ago.' },
  { state: 'degraded', label: 'degraded', message: 'Recording, but some of it is not getting through.' },
  { state: 'off', label: 'off — the user’s own choice', message: 'Recording is off, so nothing is being sent.' },
  { state: 'checking', label: 'checking', message: 'Checking the machine…' },
  { state: 'failed', label: 'failed — the check itself', message: 'The check did not come back.' },
]

const PROPS: PropRow[] = [
  {
    name: 'state',
    type: "'healthy' | 'degraded' | 'off' | 'checking' | 'failed'",
    required: true,
    description:
      'off is the user’s own choice and is drawn neutrally — a grey minus, never an amber mark. checking is the spinner, for the moment the words on screen are known to be stale. failed is the check itself not coming back, which is a different thing from something being broken and wears the same red because both need the same click.',
  },
  {
    name: 'title · message',
    type: 'string · string',
    description:
      'What is being reported on, and the verdict in one sentence. The title is optional: a card already under a heading that says so would be saying it twice, which is the setup card’s case. Both translated — every string here is the caller’s.',
  },
  {
    name: 'details',
    type: 'string[]',
    description:
      'What is actually wrong, one short line each, bulleted in the state’s own colour. Not gated on the state: which issues are worth naming is the caller’s judgement, and a component that silently dropped them would be the harder bug to find.',
  },
  {
    name: 'fixes',
    type: 'RepairRow[]',
    description:
      'What to do about each fault — see RepairList. The same faults details would list, with an answer attached: a card uses one or the other, details when there is nothing to press and fixes when there is. A verdict you cannot act on is a worry rather than a status.',
  },
  {
    name: 'log',
    type: 'string',
    description:
      'The running output of a repair, while one is running. An install can be silent for a minute, and a button that has been saying “Installing” for that long is indistinguishable from one that has hung. The caller clears it when the repair ends — a pane that outlived its install would be the stalest thing on the card.',
  },
  {
    name: 'setting',
    type: 'SettingRowProps',
    description:
      'The one choice that changes what is being checked, under a rule at the foot of the card. It is in here rather than in a card of its own because it is the reason half these checks run at all: the machine setup card carries which integrations you use, and the checks above it are about the servers those integrations need.',
  },
  {
    name: 'alert',
    type: 'CardAlert',
    description:
      'A choice that wants confirming before it is applied, or a strip about the card. The setup card’s is the one that matters: turning an integration off revokes access in the middle of somebody’s ticket, where everything else on that card only ever adds something — so the picker moves and nothing happens until this is answered.',
  },
  {
    name: 'note',
    type: 'string',
    description:
      'The last line, quieter: what is pending rather than broken. Runs queued behind an offline stretch retry by themselves, and listing them among the faults would make a working pipeline look broken.',
  },
]

export function HealthCardEntry({ theme, onOpen }: { theme: DesktopTheme; onOpen?: (id: string) => void }) {
  return (
    <article className="flex flex-col divide-y divide-hairline">
      <EntryHeader title="HealthCard" uses={usesOf('healthcard')} onOpen={onOpen}>
        Is this working? A mark, a verdict in one sentence, and what is wrong underneath.
      </EntryHeader>

      <EntrySection
        title="Not a banner, and the difference is permanence"
        note="A Banner interrupts: it appears because something just happened and it carries the button that deals with it. This is the opposite — it is always there, it is usually green, and its whole job is that the day it is not, the change is legible. The two were drawn with the same classes in the app and they are not the same thing: a card that can only ever say “fine” is an ornament, and a strip that is permanent stops being read."
      >
        <Stage theme={theme}>
          {STATES.map(({ state, label, message }) => (
            <Specimen key={state} label={label}>
              <HealthCard state={state} title="Usage recording" message={message} />
            </Specimen>
          ))}
        </Stage>
      </EntrySection>

      <EntrySection
        title="What is wrong, and what is merely pending"
        note="Issues are bulleted in the state’s own colour — the parts of the verdict above, not four more verdicts, which is why they wear a bullet and not a row of marks. Queued work is not an issue and sits under them in the quiet line: it retries by itself, and filing it with the faults would make a working pipeline look broken."
      >
        <Stage theme={theme}>
          <Specimen label="degraded, with its reasons and its backlog">
            <HealthCard
              state="degraded"
              title="Usage recording"
              message="Recording, but some of it is not getting through."
              details={[
                'The shell hook is not installed in ~/.claude/settings.json',
                'The last three batches were refused by the server',
              ]}
              note="12 runs are queued and will be sent on the next successful batch."
            />
          </Specimen>
          <Specimen label="no title — under a heading that already says it">
            <HealthCard state="checking" message="Checking the machine…" />
          </Specimen>
        </Stage>
      </EntrySection>

      <EntrySection
        title="A verdict you cannot act on is a worry"
        note="Which is why the card carries the repairs too, and everything else that belongs to one verdict. Every part is optional and most cards use none — the telemetry card is a mark and a sentence. The machine setup card is all five, and it was 190 lines of hand-drawn rows, three spellings of a repair button and a plate respelled from scratch. The order is the reading: what is wrong, what is being done about it right now, what you may change, and last the thing that wants confirming."
      >
        <Stage theme={theme}>
          <Specimen label="the setup card, whole">
            <HealthCard
              state="degraded"
              message="Some of what the skills need is missing."
              fixes={[
                {
                  id: 'claude',
                  message: 'claude is not installed, and the skills cannot run without it',
                  action: { kind: 'fix', label: 'Installing', icon: Download, busy: true, onClick: () => undefined },
                },
                {
                  id: 'mcp',
                  message: 'The GitHub MCP server is not registered with Claude Code',
                  action: { kind: 'fix', label: 'Configure', onClick: () => undefined },
                },
              ]}
              log={'==> Downloading claude-code-2.4.1.tar.gz\n==> Verifying checksum\n==> Linking /usr/local/bin/claude'}
              setting={{
                label: 'Integrations',
                control: {
                  kind: 'select',
                  value: 'github',
                  options: [
                    { value: 'both', label: 'Jira and GitHub' },
                    { value: 'github', label: 'GitHub only' },
                  ],
                  onChange: () => undefined,
                  ariaLabel: 'Integrations',
                  width: 208,
                },
              }}
              alert={{
                message: 'Turning Jira off unregisters its MCP server and withdraws its permissions.',
                actions: [{ label: 'Turn Jira off', onClick: () => undefined }],
              }}
            />
          </Specimen>
        </Stage>
      </EntrySection>

      <EntrySection title="Props">
        <PropsTable rows={PROPS} />
        <Snippet>{`import { HealthCard } from '@ds/desktop'

<HealthCard
  state={disabled ? 'off' : degraded ? 'degraded' : 'healthy'}
  title={t('settings.about.telemetry.title')}
  message={t('settings.about.telemetry.healthy')}
  details={health.issues.map((issue) => t(\`settings.about.telemetry.issue.\${issue}\`))}
  note={pending > 0 ? t('settings.about.telemetry.pending', { count: String(pending) }) : undefined}
/>`}</Snippet>
      </EntrySection>
    </article>
  )
}
