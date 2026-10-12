'use client'

import { SkillIntro } from '@ds/desktop'
import { ClipboardList, GitPullRequest } from '@ds/desktop/icons'
import type { DesktopTheme } from '@/lib/desktopTheme'
import { EntryHeader, EntrySection, PropsTable, Snippet, Specimen, Stage, type PropRow } from '../parts'
import { usesOf } from './ids'

const PROPS: PropRow[] = [
  { name: 'command', type: 'string', required: true, description: 'The command, verbatim — /magic:plan. Drawn as a CommandChip, because that is what it is: a thing the reader types.' },
  { name: 'children', type: 'string', required: true, description: 'The skill’s job in one clause. The one static line, already translated.' },
  { name: 'icon', type: 'IconComponent', description: 'The mark, usually the tab’s own — so the block reads as belonging to the tab you just picked. It rides ON the command chip: a mark in a gutter indents every line of the block behind it, and this one stood next to the very chip it describes.' },
  { name: 'steps', type: 'string[]', description: 'The run, in order, already translated and already composed against this repository’s own settings. Numbered, because each step gates the next. Empty draws no list.' },
  { name: 'flags', type: 'string[]', description: 'What the run ADDS rather than what it does — a co-author line, a ticket id, default labels. Joined with a separator under a leading +, which is what says they are not steps.' },
]

export function SkillIntroEntry({ theme, onOpen }: { theme: DesktopTheme; onOpen?: (id: string) => void }) {
  return (
    <article className="flex flex-col divide-y divide-hairline">
      <EntryHeader title="SkillIntro" uses={usesOf('skillintro')} onOpen={onOpen}>
        What a command actually does, above the settings that tune it.
      </EntryHeader>

      <EntrySection
        title="The knobs alone never say it"
        note="“How much to split” and “Acceptance criteria” are adjustments to a run whose shape you had to already know — that the command brainstorms first, writes a spec, and creates nothing until you approve it. A tab of settings with no such block is a form you can fill in correctly without ever learning what it configures."
      >
        <Stage theme={theme}>
          <Specimen label="the same skill, on a Jira repository and on a GitHub one">
            <div className="flex w-full flex-col gap-4">
              <SkillIntro
                command="/magic:plan"
                icon={ClipboardList}
                steps={[
                  'Searches the project for a ticket that already covers it',
                  'Brainstorms with you, then writes a spec you approve',
                  'Creates the epic (Epic) and its stories (Story) in project PROJ',
                ]}
                flags={['balanced splitting', 'acceptance criteria as a checklist', 'labels: enhancement']}
              >
                Turns an idea into a reviewable spec, then into the tickets behind it.
              </SkillIntro>
              <SkillIntro
                command="/magic:pr"
                icon={GitPullRequest}
                steps={[
                  'Pushes the branch to acme/api',
                  'Opens a pull request from the repository’s own template',
                  'Moves the linked ticket to In review and comments on it',
                ]}
                flags={['watches CI', 'links tickets automatically']}
              >
                Pushes the work, opens the pull request and updates the ticket behind it.
              </SkillIntro>
            </div>
          </Specimen>
        </Stage>
      </EntrySection>

      <EntrySection
        title="The steps are the caller’s, and they describe ONE repository"
        note="That is the whole reason this takes them as strings rather than holding any of its own."
      >
        <p className="max-w-2xl text-xs leading-relaxed text-muted">
          A repository filing GitHub issues reads “one issue per story on owner/repo” where
          a Jira one reads “the epic and its stories in project PROJ”. A generic summary is
          wrong for whichever half of the fleet is configured the other way, and there is no
          lead sentence long enough to cover both without saying nothing. So the composition
          is the app’s; what is here is the shape.
        </p>
        <p className="max-w-2xl text-xs leading-relaxed text-muted">
          Numbered, and the flags are not. The run reads top to bottom and each step gates
          the next — the ticket creation at the end is what the spec approval above it holds
          back. A flag only <em>adds</em> something to the output, and it happens wherever it
          happens; the leading <code>+</code> says so without a second heading.
        </p>
      </EntrySection>

      <EntrySection title="Props">
        <PropsTable rows={PROPS} />
        <Snippet>{`import { SkillIntro } from '@ds/desktop'

<SkillIntro
  command="/magic:plan"
  icon={ClipboardList}
  steps={summary.steps.map((step) => t(step.key, step.vars))}
  flags={summary.tail.map((flag) => t(flag.key, flag.vars))}
>
  {t('repo.plan.intro')}
</SkillIntro>`}</Snippet>
      </EntrySection>
    </article>
  )
}
