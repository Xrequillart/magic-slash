'use client'

import type { ReactNode } from 'react'
import { OutputSample, RepoPageHeader, SettingsCard, SkillIntro, TabStrip } from '@ds/desktop'
import {
  Activity,
  ClipboardList,
  FileText,
  GitBranch,
  GitCommitHorizontal,
  GitPullRequest,
  KeyRound,
  Languages,
  Link2,
  Lock,
  MessageSquare,
  Settings2,
  Ticket,
} from '@ds/desktop/icons'
import { PROJECT_COLORS } from '@ds/desktop/palette'
import type { IconComponent } from '@ds/desktop/types'
import type { MessageKey } from '@/lib/i18n'
import { useT } from '@/lib/i18n/useLanguage'
import { FeatureLegend, LegendTile } from './FeatureLegend'
import { SettingsWindow } from './ReposSettingsMockup'

/**
 * The two visuals of the configuration family that draw a REPOSITORY'S SETTINGS PAGE:
 * `CommitConfigMockup` under the commit row, open on the Commit tab, and `PRConfigMockup`
 * under the pull request row, open on the Pull Request tab.
 *
 * DRAWN WITH THE APP'S OWN COMPONENTS, where it was a tracing class for class — and the
 * tracing had fallen behind: uppercase group titles over bordered fieldsets, a hand-drawn
 * switch, a template "found" badge the page no longer shows. `pages/Config/RepoPage.tsx`
 * is built from `RepoPageHeader`, `TabStrip`, `SkillIntro`, `SettingsCard` and
 * `OutputSample`, and so is this: the same files, given one invented repository's values.
 *
 * INSIDE THE REAL WINDOW: `SettingsWindow` is the page overlay on its Repositories tab,
 * the same frame the Repositories drawing above stands in, because this page is one level
 * down from that list.
 *
 * WHAT IS DRAWN IN EACH is a set of values the app offers, with the intro narrating those
 * exact choices, the way `utils/skillSummary` composes it. Commit: Conventional, single
 * line, co-author on, ticket id on, main branches blocked. Pull request: concise body,
 * tickets auto-linked, test accounts by reference with a source file, template boxes left
 * to the reviewer, a template found in the repository, and the two rows that run once the
 * PR is open.
 *
 * THE WORDS ARE THE APP'S, key for key. What French borrows whole — "Repository",
 * "Tickets", "Commit", "Pull Request", "Resolve", "Message", "Branches", "Description" —
 * is a literal, as `LITERAL_TITLES` in `lib/features.ts` does for the same reason.
 */

/** `SELECT_WIDTH` in `desktop/src/renderer/theme/controls.ts`: every enum on the page. */
const SELECT_WIDTH = 208

const noop = () => undefined

/**
 * `REPO_TABS`, in the app's order, each with the glyph the app gives it. A label is a
 * catalogue key where the two languages differ and a literal where they do not.
 */
const TABS: readonly { id: string; label: MessageKey | { literal: string }; icon: IconComponent }[] = [
  { id: 'general', label: 'site.repoPage.tabGeneral', icon: Settings2 },
  { id: 'repository', label: { literal: 'Repository' }, icon: GitBranch },
  { id: 'tickets', label: { literal: 'Tickets' }, icon: Ticket },
  { id: 'languages', label: 'site.repoPage.tabLanguages', icon: Languages },
  { id: 'plan', label: 'site.repoPage.tabPlan', icon: ClipboardList },
  { id: 'commit', label: { literal: 'Commit' }, icon: GitCommitHorizontal },
  { id: 'pr', label: { literal: 'Pull Request' }, icon: GitPullRequest },
  { id: 'resolve', label: { literal: 'Resolve' }, icon: MessageSquare },
]

/** The repository both drawings are of — the one the Tasks drawing and the list show. */
const REPO = { name: 'checkout-api', color: PROJECT_COLORS[0] }

/**
 * The page above a tab's panel: the header, then the strip — `mb-6` under it, as in
 * `RepoPage`. The panel is the caller's, in the `flex flex-col gap-6` every tab uses.
 */
function RepoPage({ active, tone, children }: { active: string; tone: 'bg-tone-mist' | 'bg-tone-sky'; children: ReactNode }) {
  const { t } = useT()
  const label = (value: MessageKey | { literal: string }) => (typeof value === 'string' ? t(value) : value.literal)

  return (
    <SettingsWindow tone={tone}>
      <div>
        <RepoPageHeader
          name={REPO.name}
          color={REPO.color}
          subtitle={t('site.repoPage.subtitle')}
          backLabel=""
          onBack={noop}
        />
        <div className="mb-6">
          <TabStrip
            ariaLabel={REPO.name}
            items={TABS.map((tab) => ({ key: tab.id, label: label(tab.label), icon: tab.icon }))}
            activeKey={active}
            onSelect={noop}
          />
        </div>
        <div className="flex flex-col gap-6">{children}</div>
      </div>
    </SettingsWindow>
  )
}

/** A closed picker: the one value it is set to, which is all a closed select shows. */
function select(value: string) {
  return { kind: 'select' as const, value: 'v', options: [{ value: 'v', label: value }], onChange: noop, width: SELECT_WIDTH, ariaLabel: value }
}

function switchOf(checked: boolean, label: string) {
  return { kind: 'switch' as const, checked, onChange: noop, label }
}

// ─── Commit ──────────────────────────────────────────────────────────────────────────

/**
 * The four formats, as the table under the drawing lists them. The shapes and examples
 * are `generateCommitExample`'s, with its `add user authentication` subject, so the table
 * and the example in the drawing agree.
 */
const FORMATS: readonly {
  name: MessageKey | { literal: string }
  shape: MessageKey | { literal: string }
  example: string
}[] = [
  { name: { literal: 'Conventional' }, shape: { literal: 'type: description' }, example: 'feat: add user authentication' },
  { name: { literal: 'Angular' }, shape: { literal: 'type(scope): description' }, example: 'feat(auth): add user authentication' },
  { name: { literal: 'Gitmoji' }, shape: { literal: 'emoji description' }, example: '✨ add user authentication' },
  { name: 'site.commitCfg.formatNoneName', shape: 'site.commitCfg.formatNoneShape', example: 'Add user authentication' },
]

export function CommitConfigMockup() {
  const { t } = useT()
  const cell = (value: MessageKey | { literal: string }) => (typeof value === 'string' ? t(value) : value.literal)

  return (
    <div className="flex flex-col">
      <RepoPage active="commit" tone="bg-tone-mist">
        <SkillIntro
          command="/magic:commit"
          icon={GitCommitHorizontal}
          steps={[
            t('site.commitCfg.stepAtomic'),
            t('site.commitCfg.stepFormat'),
            t('site.commitCfg.stepStyle'),
            t('site.commitCfg.stepProtected'),
          ]}
          flags={[t('site.commitCfg.tailCoAuthor'), t('site.commitCfg.tailTicketId')]}
        >
          {t('site.commitCfg.intro')}
        </SkillIntro>

        <div className="flex flex-col gap-3">
          <SettingsCard
            title="Message"
            rows={[
              { id: 'style', label: 'Style', hint: t('site.commitCfg.styleHelp'), control: select(t('site.commitCfg.styleSingle')) },
              { id: 'format', label: 'Format', hint: t('site.commitCfg.formatHelp'), control: select(t('site.commitCfg.formatConventional')) },
              { id: 'coAuthor', label: t('site.commitCfg.coAuthor'), hint: t('site.commitCfg.coAuthorHelp'), control: switchOf(true, t('site.commitCfg.coAuthor')) },
              { id: 'ticketId', label: t('site.commitCfg.ticketId'), hint: t('site.commitCfg.ticketIdHelp'), control: switchOf(true, t('site.commitCfg.ticketId')) },
            ]}
          />
          {/* `generateCommitExample` for conventional + single line + ticket id. */}
          <OutputSample label={t('site.commitCfg.example')}>feat: add user authentication [PROJ-123]</OutputSample>
        </div>

        <SettingsCard
          title="Branches"
          rows={[{
            id: 'protectedBranch',
            icon: Lock,
            label: t('site.commitCfg.protectedBranch'),
            hint: t('site.commitCfg.protectedBranchHelp'),
            control: switchOf(false, t('site.commitCfg.protectedBranch')),
          }]}
        />
      </RepoPage>

      {/* THE FORMATS, UNDER THE DRAWING. The select above is closed on one value; this is
          what the other three look like. Same hairline box as `FeatureLegend`. */}
      <div className="mt-8 overflow-x-auto rounded-2xl border border-hairline">
        <table className="w-full min-w-[32rem] text-left text-sm">
          <thead>
            <tr className="border-b border-hairline text-xs uppercase tracking-wider text-ink/60">
              <th className="px-6 py-4 font-medium">{t('site.commitCfg.tableFormat')}</th>
              <th className="px-6 py-4 font-medium">{t('site.commitCfg.tableShape')}</th>
              <th className="px-6 py-4 font-medium">{t('site.commitCfg.tableExample')}</th>
            </tr>
          </thead>
          <tbody>
            {FORMATS.map((format, index) => (
              <tr key={format.example} className={index > 0 ? 'border-t border-hairline' : ''}>
                <td className="px-6 py-4 font-display font-bold text-ink">{cell(format.name)}</td>
                <td className="px-6 py-4 font-mono text-xs text-ink/60">{cell(format.shape)}</td>
                <td className="px-6 py-4 font-mono text-xs text-ink">{format.example}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Pull request ────────────────────────────────────────────────────────────────────

/**
 * What the PR tab configures, as the legend under the drawing names it: five rows of the
 * tab, checked against `RepoPage.tsx`'s `pr` tab and `skills/magic-pr/SKILL.md`.
 */
const PR_FEATURES: readonly { id: string; icon: IconComponent; name: MessageKey; description: MessageKey }[] = [
  { id: 'autoLink', icon: Link2, name: 'site.prCfg.legendAutoLinkTitle', description: 'site.prCfg.legendAutoLinkDesc' },
  { id: 'testAccounts', icon: KeyRound, name: 'site.prCfg.legendTestAccountsTitle', description: 'site.prCfg.legendTestAccountsDesc' },
  { id: 'template', icon: FileText, name: 'site.prCfg.legendTemplateTitle', description: 'site.prCfg.legendTemplateDesc' },
  { id: 'watch', icon: Activity, name: 'site.prCfg.legendWatchTitle', description: 'site.prCfg.legendWatchDesc' },
  { id: 'comment', icon: MessageSquare, name: 'site.prCfg.legendCommentTitle', description: 'site.prCfg.legendCommentDesc' },
]

/** The repository's own template, a few lines of it. */
const TEMPLATE = ['## Summary', '', '## How to test', '- [ ] ', '', '## Type of change', '- [ ] Bug fix', '- [ ] New feature'].join('\n')

export function PRConfigMockup() {
  const { t } = useT()

  return (
    <div className="flex flex-col">
      <RepoPage active="pr" tone="bg-tone-sky">
        <SkillIntro
          command="/magic:pr"
          icon={GitPullRequest}
          steps={[
            t('site.prCfg.stepOpen'),
            t('site.prCfg.stepAutoLink'),
            t('site.prCfg.stepAccounts'),
            t('site.prCfg.stepTicketComment'),
            t('site.prCfg.stepWatch'),
          ]}
          flags={[t('site.prCfg.tailAccountsSource')]}
        >
          {t('site.prCfg.intro')}
        </SkillIntro>

        <SettingsCard
          title="Description"
          rows={[
            { id: 'bodyVerbosity', label: t('site.prCfg.bodyVerbosity'), hint: t('site.prCfg.bodyVerbosityHelp'), control: select(t('site.prCfg.bodyVerbosityConcise')) },
            { id: 'autoLink', label: t('site.prCfg.autoLink'), hint: t('site.prCfg.autoLinkHelp'), control: switchOf(true, t('site.prCfg.autoLink')) },
            { id: 'testAccounts', label: t('site.prCfg.testAccounts'), hint: t('site.prCfg.testAccountsHelp'), control: select(t('site.prCfg.testAccountsReference')) },
            {
              id: 'testAccountsSource',
              label: t('site.prCfg.testAccountsSource'),
              hint: t('site.prCfg.testAccountsSourceHelp'),
              control: { kind: 'input' as const, value: 'docs/test-accounts.md', onChange: noop, className: 'w-64' },
            },
            { id: 'templateCheckboxes', label: t('site.prCfg.templateCheckboxes'), hint: t('site.prCfg.templateCheckboxesHelp'), control: select(t('site.prCfg.templateCheckboxesNever')) },
            {
              // Found in the repository: its path as the note, the file in a stacked editor.
              id: 'template',
              label: t('site.prCfg.template'),
              hint: t('site.prCfg.templateHelp'),
              note: '.github/pull_request_template.md',
              layout: 'stacked' as const,
              control: [{
                kind: 'input' as const,
                multiline: true as const,
                rows: 8,
                value: TEMPLATE,
                onChange: noop,
                className: 'flex-1 min-w-0',
              }],
            },
          ]}
        />

        <SettingsCard
          title={t('site.prCfg.groupAfter')}
          rows={[
            { id: 'commentOnPR', label: t('site.prCfg.commentOnPR'), hint: t('site.prCfg.commentOnPRHelp'), control: switchOf(true, t('site.prCfg.commentOnPR')) },
            { id: 'watchCI', label: t('site.prCfg.watchCI'), hint: t('site.prCfg.watchCIHelp'), control: switchOf(true, t('site.prCfg.watchCI')) },
          ]}
        />
      </RepoPage>

      <FeatureLegend
        items={PR_FEATURES.map((entry) => ({
          id: entry.id,
          mark: (
            <LegendTile tone="bg-accent/10 text-accent">
              <entry.icon className="h-4 w-4" />
            </LegendTile>
          ),
          name: entry.name,
          description: entry.description,
        }))}
      />
    </div>
  )
}
