'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Building2,
  GitBranch,
  GitCommitHorizontal,
  GitPullRequest,
  Lock,
  MessageSquare,
  Settings2,
  Ticket,
  Trash2,
  Users,
} from 'lucide-react'
import { Dropdown, type DropdownOption } from '@/components/Dropdown'
import { ChipList, ExamplePanel, SettingRow, SettingsCard, Toggle } from '@/components/SettingRow'
import { Button, Input } from '@/components/ui'
import type { Org } from '@/lib/orgs'
import {
  commitExample,
  DEFAULTS,
  REPO_COLORS,
  type Repository,
  type RepositoryPatch,
} from '@/lib/repositories'
import type { Translate } from '@/lib/i18n'
import { useT } from '@/lib/i18n/useLanguage'

/**
 * Every repository setting the desktop app exposes, minus the ones that need a
 * filesystem: the local path (with its folder picker and git validation), the
 * remote-branch list that path feeds, and the PR template — which is a file in
 * the repo, not a config value. The development branch is a free-text field here
 * for that reason: the webapp cannot enumerate a repo's branches.
 *
 * Changes save immediately, one setting at a time, the way the desktop does.
 */

/**
 * Autonyms, untranslated: these pick the language CLAUDE writes a commit or a PR in,
 * so the choice has to read the same whatever language the form is in.
 */
const LANGUAGE_OPTIONS: DropdownOption<string>[] = [
  { value: 'en', label: 'English' },
  { value: 'fr', label: 'Français' },
]

/**
 * The option lists, built once per language. The format descriptions are message-free
 * shapes (`type(scope): description`) and stay as they are — they illustrate the
 * syntax rather than describe it.
 */
function buildOptions(t: Translate) {
  const style: DropdownOption<string>[] = [
    { value: 'single-line', label: t('repo.commit.styleSingle') },
    { value: 'multi-line', label: t('repo.commit.styleMulti') },
  ]

  const format: DropdownOption<string>[] = [
    { value: 'conventional', label: t('repo.commit.formatConventional'), description: 'type: description' },
    { value: 'angular', label: t('repo.commit.formatAngular'), description: 'type(scope): description' },
    { value: 'gitmoji', label: t('repo.commit.formatGitmoji'), description: 'emoji + description' },
    { value: 'none', label: t('repo.commit.formatNone'), description: t('repo.commit.formatNoneHelp') },
  ]

  const commitMode: DropdownOption<string>[] = [
    { value: 'new', label: t('repo.resolve.modeNew'), description: t('repo.resolve.modeNewHelp') },
    { value: 'amend', label: t('repo.resolve.modeAmend'), description: t('repo.resolve.modeAmendHelp') },
    { value: 'ask', label: t('repo.resolve.modeAsk'), description: t('repo.resolve.modeAskHelp') },
  ]

  const formatSource: DropdownOption<string>[] = [
    { value: 'commit', label: t('repo.resolve.useCommitConfig') },
    { value: 'custom', label: t('repo.resolve.customConfig') },
  ]

  return { style, format, commitMode, formatSource }
}

/**
 * Text setting that holds a draft until you save it, with Enter as a shortcut.
 * Text fields cannot write on every keystroke the way a toggle or a dropdown
 * does: each character would be its own database write.
 *
 * The draft follows `persisted` whenever *that* changes — after a failed save the
 * page re-reads the row, and the field has to drop the rejected text instead of
 * presenting it as current. Keying the effect on the persisted value rather than
 * on the repo object is what keeps typing safe: typing doesn't change it, so the
 * effect never fires mid-edit.
 */
function DraftField({
  persisted,
  onSave,
  placeholder,
  className = 'w-64',
  required = false,
}: {
  persisted: string
  onSave: (value: string) => void
  placeholder?: string
  className?: string
  /** Refuses to save an empty value — for settings that must have one. */
  required?: boolean
}) {
  const { t } = useT()
  const [draft, setDraft] = useState(persisted)
  useEffect(() => setDraft(persisted), [persisted])

  const savable = draft !== persisted && (!required || draft.trim().length > 0)

  return (
    <div className="flex items-center gap-2">
      <Input
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && savable) {
            e.preventDefault()
            onSave(draft)
          }
        }}
        placeholder={placeholder}
        className={className}
      />
      {savable && (
        <Button onClick={() => onSave(draft)} className="shrink-0">
          {t('common.save')}
        </Button>
      )}
    </div>
  )
}

export function RepositoryForm({
  repo,
  orgs,
  onPatch,
  onDelete,
  saveError,
  readOnly = false,
}: {
  repo: Repository
  /** Orgs the current user belongs to — the share targets. */
  orgs: Org[]
  onPatch: (patch: RepositoryPatch) => void
  onDelete: () => void
  saveError: string | null
  /**
   * Show the settings without letting them change: a team repo belongs to its
   * org's admins (and its creator). Every control lives inside one disabled
   * fieldset, so nothing here can fire — matching the RLS that would refuse the
   * write anyway. The desktop app keeps one exception this page cannot offer:
   * the local folder, which has no equivalent in the browser.
   */
  readOnly?: boolean
}) {
  const { t } = useT()
  const options = useMemo(() => buildOptions(t), [t])

  // Resolved values: absent means "use the default", same as the desktop.
  const lang = (key: keyof Repository['languages']) => repo.languages[key] ?? DEFAULTS.language
  const commitStyle = repo.commit.style ?? DEFAULTS.commitStyle
  const commitFormat = repo.commit.format ?? DEFAULTS.commitFormat
  const coAuthor = repo.commit.coAuthor ?? DEFAULTS.coAuthor
  const includeTicketId = repo.commit.includeTicketId ?? DEFAULTS.includeTicketId

  const commitMode = repo.resolve.commitMode ?? DEFAULTS.resolveCommitMode
  const useCommitConfig = repo.resolve.useCommitConfig ?? DEFAULTS.resolveUseCommitConfig
  const resolveStyle = repo.resolve.style ?? DEFAULTS.resolveStyle
  const resolveFormat = repo.resolve.format ?? DEFAULTS.resolveFormat
  const replyToComments = repo.resolve.replyToComments ?? DEFAULTS.replyToComments
  const replyLanguage = repo.resolve.replyLanguage ?? repo.languages.discussion ?? DEFAULTS.language

  const autoLinkTickets = repo.pullRequest.autoLinkTickets ?? DEFAULTS.autoLinkTickets
  const watchCI = repo.pullRequest.watchCI ?? DEFAULTS.watchCI
  const commentOnPR = repo.issues.commentOnPR ?? DEFAULTS.commentOnPR

  // Patch helpers send only the key that changed. The page merges it into the
  // full jsonb block against the freshest row it holds — merging here instead
  // would bake in this render's `repo`, and two settings changed back to back
  // would both write from the same snapshot, the second dropping the first.
  const setLanguage = (key: keyof Repository['languages'], value: string) =>
    onPatch({ languages: { [key]: value } })
  const setCommit = (patch: Repository['commit']) => onPatch({ commit: patch })
  const setResolve = (patch: Repository['resolve']) => onPatch({ resolve: patch })
  const setIssues = (patch: Repository['issues']) => onPatch({ issues: patch })

  const resolvePreview = useCommitConfig
    ? commitExample(commitFormat, commitStyle, includeTicketId)
    : commitExample(resolveFormat, resolveStyle, false)

  const shareOptions: DropdownOption<string>[] = orgs.map((o) => ({ value: o.id, label: o.name }))
  const scopeOrg = repo.orgId ? orgs.find((o) => o.id === repo.orgId) : null

  return (
    <fieldset disabled={readOnly} className="w-full min-w-0 space-y-8">
      {saveError && (
        <p className="rounded-xl border border-red/20 bg-red/[0.04] px-3.5 py-2.5 text-xs text-red">
          {saveError}
        </p>
      )}

      {/* ── Scope ─────────────────────────────────────────────────────────── */}
      <SettingsCard icon={Users} title={t('repo.scope.section')}>
        <SettingRow
          label={
            repo.orgId
              ? scopeOrg
                ? t('repo.scope.teamNamed', { name: scopeOrg.name })
                : t('repo.scope.team')
              : t('repo.scope.personal')
          }
          description={
            repo.orgId ? t('repo.scope.teamHelp') : t('repo.scope.personalHelp')
          }
        >
          {repo.orgId ? (
            <Button variant="ghost" onClick={() => onPatch({ orgId: null })} className="border border-black/10">
              <Lock className="h-4 w-4" />
              {t('repo.scope.makePersonal')}
            </Button>
          ) : orgs.length > 0 ? (
            <Dropdown
              value=""
              options={shareOptions}
              onChange={(orgId) => onPatch({ orgId })}
              placeholder={t('repo.scope.sharePlaceholder')}
              className="w-64"
            />
          ) : (
            <p className="text-xs text-muted">{t('repo.scope.joinOrg')}</p>
          )}
        </SettingRow>
      </SettingsCard>

      {/* ── General ───────────────────────────────────────────────────────── */}
      <SettingsCard icon={Settings2} title={t('repo.general.section')}>
        <SettingRow label={t('repo.general.name')} description={t('repo.general.nameHelp')}>
          <DraftField
            persisted={repo.name}
            onSave={(name) => onPatch({ name })}
            required
          />
        </SettingRow>

        <SettingRow
          label={t('repo.general.keywords')}
          description={t('repo.general.keywordsHelp')}
        >
          <DraftField
            persisted={repo.keywords.join(', ')}
            onSave={(value) =>
              onPatch({
                keywords: value
                  .split(',')
                  .map((k) => k.trim())
                  .filter(Boolean),
              })
            }
          />
        </SettingRow>

        <SettingRow
          label={t('repo.general.discussionLang')}
          description={t('repo.general.discussionLangHelp')}
        >
          <Dropdown
            value={lang('discussion')}
            options={LANGUAGE_OPTIONS}
            onChange={(v) => setLanguage('discussion', v)}
            width={200}
            className="w-52"
          />
        </SettingRow>

        <SettingRow label={t('repo.general.color')} description={t('repo.general.colorHelp')}>
          <div className="flex flex-wrap gap-2">
            {REPO_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => onPatch({ color })}
                title={color}
                aria-label={t('repo.general.setColor', { color })}
                className={`h-6 w-6 rounded-full transition-transform ${
                  repo.color === color
                    ? 'ring-2 ring-ink ring-offset-2'
                    : 'hover:scale-110'
                }`}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </SettingRow>
      </SettingsCard>

      {/* ── Branches ──────────────────────────────────────────────────────── */}
      <SettingsCard icon={GitBranch} title={t('repo.branches.section')}>
        <SettingRow
          label={t('repo.branches.development')}
          description={t('repo.branches.developmentHelp')}
        >
          <DraftField
            persisted={repo.branches.development ?? ''}
            onSave={(development) => onPatch({ branches: { development } })}
            placeholder="develop"
            className="w-52"
          />
        </SettingRow>
      </SettingsCard>

      {/* ── Worktree ──────────────────────────────────────────────────────── */}
      <SettingsCard icon={GitBranch} title={t('repo.worktree.section')}>
        <SettingRow
          label={t('repo.worktree.files')}
          description={t('repo.worktree.filesHelp')}
          stacked
        >
          <ChipList
            items={repo.worktreeFiles}
            onChange={(worktreeFiles) => onPatch({ worktreeFiles })}
            placeholder=".env"
            inputId="worktree-file-input"
          />
        </SettingRow>
      </SettingsCard>

      {/* ── Commit ────────────────────────────────────────────────────────── */}
      <SettingsCard icon={GitCommitHorizontal} title={t('repo.commit.section')}>
        <SettingRow label={t('repo.commit.language')} description={t('repo.commit.languageHelp')}>
          <Dropdown
            value={lang('commit')}
            options={LANGUAGE_OPTIONS}
            onChange={(v) => setLanguage('commit', v)}
            width={200}
            className="w-52"
          />
        </SettingRow>

        <SettingRow label={t('repo.commit.style')} description={t('repo.commit.styleHelp')}>
          <Dropdown
            value={commitStyle}
            options={options.style}
            onChange={(style) => setCommit({ style })}
            width={240}
            className="w-52"
          />
        </SettingRow>

        <SettingRow label={t('repo.commit.format')} description={t('repo.commit.formatHelp')}>
          <Dropdown
            value={commitFormat}
            options={options.format}
            onChange={(format) => setCommit({ format })}
            className="w-52"
          />
        </SettingRow>

        <SettingRow label={t('repo.commit.coAuthor')} description={t('repo.commit.coAuthorHelp')}>
          <Toggle
            label={t('repo.commit.coAuthor')}
            checked={coAuthor}
            onChange={(coAuthor) => setCommit({ coAuthor })}
          />
        </SettingRow>

        <SettingRow label={t('repo.commit.ticketId')} description={t('repo.commit.ticketIdHelp')}>
          <Toggle
            label={t('repo.commit.ticketId')}
            checked={includeTicketId}
            onChange={(includeTicketId) => setCommit({ includeTicketId })}
          />
        </SettingRow>

        <ExamplePanel title={t('repo.example')}>
          <pre className="whitespace-pre-wrap font-mono text-xs text-ink">
            {commitExample(commitFormat, commitStyle, includeTicketId)}
          </pre>
        </ExamplePanel>
      </SettingsCard>

      {/* ── Resolve ───────────────────────────────────────────────────────── */}
      <SettingsCard icon={MessageSquare} title={t('repo.resolve.section')}>
        <SettingRow
          label={t('repo.resolve.commitMode')}
          description={t('repo.resolve.commitModeHelp')}
        >
          <Dropdown
            value={commitMode}
            options={options.commitMode}
            onChange={(commitMode) => setResolve({ commitMode })}
            className="w-52"
          />
        </SettingRow>

        {/* Only meaningful when a new commit can happen (new or ask). */}
        {commitMode !== 'amend' && (
          <SettingRow
            label={t('repo.resolve.commitFormat')}
            description={t('repo.resolve.commitFormatHelp')}
          >
            <Dropdown
              value={useCommitConfig ? 'commit' : 'custom'}
              options={options.formatSource}
              onChange={(v) => setResolve({ useCommitConfig: v === 'commit' })}
              width={240}
              className="w-52"
            />
          </SettingRow>
        )}

        {commitMode !== 'amend' && !useCommitConfig && (
          <>
            <SettingRow label={t('repo.commit.style')} description={t('repo.commit.styleHelp')}>
              <Dropdown
                value={resolveStyle}
                options={options.style}
                onChange={(style) => setResolve({ style })}
                width={240}
                className="w-52"
              />
            </SettingRow>
            <SettingRow label={t('repo.commit.format')} description={t('repo.commit.formatHelp')}>
              <Dropdown
                value={resolveFormat}
                options={options.format}
                onChange={(format) => setResolve({ format })}
                className="w-52"
              />
            </SettingRow>
          </>
        )}

        <SettingRow label={t('repo.resolve.reply')} description={t('repo.resolve.replyHelp')}>
          <Toggle
            label={t('repo.resolve.reply')}
            checked={replyToComments}
            onChange={(replyToComments) => setResolve({ replyToComments })}
          />
        </SettingRow>

        {replyToComments && (
          <SettingRow
            label={t('repo.resolve.replyLang')}
            description={t('repo.resolve.replyLangHelp')}
          >
            <Dropdown
              value={replyLanguage}
              options={LANGUAGE_OPTIONS}
              onChange={(replyLanguage) => setResolve({ replyLanguage })}
              width={200}
              className="w-52"
            />
          </SettingRow>
        )}

        {commitMode === 'new' && (
          <ExamplePanel title={t('repo.example')}>
            <pre className="whitespace-pre-wrap font-mono text-xs text-ink">{resolvePreview}</pre>
          </ExamplePanel>
        )}
        {commitMode === 'amend' && (
          <ExamplePanel tone="warning">
            <p className="text-xs text-ink">
              {t('repo.resolve.amendNotice')}{' '}
              <code className="rounded bg-black/[0.06] px-1.5 py-0.5 font-mono">--force-with-lease</code>.
            </p>
          </ExamplePanel>
        )}
        {commitMode === 'ask' && (
          <ExamplePanel tone="warning">
            <p className="text-xs text-ink">
              {t('repo.resolve.askNoticeBefore')} <strong>{t('repo.resolve.askNoticeNew')}</strong>{' '}
              {t('repo.resolve.askNoticeOr')} <strong>{t('repo.resolve.askNoticeAmend')}</strong>{' '}
              {t('repo.resolve.askNoticeAfter')}{' '}
              <code className="rounded bg-black/[0.06] px-1.5 py-0.5 font-mono">--force-with-lease</code>.
            </p>
          </ExamplePanel>
        )}
      </SettingsCard>

      {/* ── Pull request ──────────────────────────────────────────────────── */}
      <SettingsCard icon={GitPullRequest} title={t('repo.pr.section')}>
        <SettingRow label={t('repo.pr.language')} description={t('repo.pr.languageHelp')}>
          <Dropdown
            value={lang('pullRequest')}
            options={LANGUAGE_OPTIONS}
            onChange={(v) => setLanguage('pullRequest', v)}
            width={200}
            className="w-52"
          />
        </SettingRow>

        <SettingRow label={t('repo.pr.autoLink')} description={t('repo.pr.autoLinkHelp')}>
          <Toggle
            label={t('repo.pr.autoLink')}
            checked={autoLinkTickets}
            onChange={(autoLinkTickets) => onPatch({ pullRequest: { autoLinkTickets } })}
          />
        </SettingRow>

        <SettingRow label={t('repo.pr.watchCI')} description={t('repo.pr.watchCIHelp')}>
          <Toggle
            label={t('repo.pr.watchCI')}
            checked={watchCI}
            onChange={(watchCI) => onPatch({ pullRequest: { watchCI } })}
          />
        </SettingRow>

        <SettingRow label={t('repo.pr.template')} description={t('repo.pr.templateHelp')} />
      </SettingsCard>

      {/* ── Jira / GitHub issues ──────────────────────────────────────────── */}
      <SettingsCard icon={Ticket} title={t('repo.issues.section')}>
        <SettingRow
          label={t('repo.issues.commentLang')}
          description={t('repo.issues.commentLangHelp')}
        >
          <Dropdown
            value={lang('jiraComment')}
            options={LANGUAGE_OPTIONS}
            onChange={(v) => setLanguage('jiraComment', v)}
            width={200}
            className="w-52"
          />
        </SettingRow>

        <SettingRow
          label={t('repo.issues.commentOnPR')}
          description={t('repo.issues.commentOnPRHelp')}
        >
          <Toggle
            label={t('repo.issues.commentOnPR')}
            checked={commentOnPR}
            onChange={(commentOnPR) => setIssues({ commentOnPR })}
          />
        </SettingRow>

        <SettingRow label={t('repo.issues.jiraUrl')} description={t('repo.issues.jiraUrlHelp')}>
          <DraftField
            persisted={repo.issues.jiraUrl ?? ''}
            onSave={(jiraUrl) => setIssues({ jiraUrl })}
            placeholder="https://company.atlassian.net/browse/"
            className="w-72"
          />
        </SettingRow>

        <SettingRow
          label={t('repo.issues.githubUrl')}
          description={t('repo.issues.githubUrlHelp')}
        >
          <DraftField
            persisted={repo.issues.githubIssuesUrl ?? ''}
            onSave={(githubIssuesUrl) => setIssues({ githubIssuesUrl })}
            placeholder="https://github.com/org/repo/issues/"
            className="w-72"
          />
        </SettingRow>
      </SettingsCard>

      {/* ── Danger zone ───────────────────────────────────────────────────── */}
      <SettingsCard icon={Trash2} title={t('repo.danger.section')} tone="danger">
        <SettingRow
          label={t('repo.danger.delete')}
          description={
            repo.orgId ? t('repo.danger.deleteTeamHelp') : t('repo.danger.deletePersonalHelp')
          }
        >
          <button
            onClick={onDelete}
            className="flex items-center gap-2 rounded-full border border-red/25 px-4 py-2 font-display text-xs font-medium text-red transition-colors hover:bg-red/[0.06]"
          >
            <Trash2 className="h-3.5 w-3.5" />
            {t('repo.danger.deleteAction')}
          </button>
        </SettingRow>
      </SettingsCard>

      {/* Scope note, so "Team" above is not the only hint about who sees this. */}
      {repo.orgId && !readOnly && (
        <p className="flex items-center gap-2 text-xs text-muted">
          <Building2 className="h-3.5 w-3.5 shrink-0" />
          {t('repo.teamNote', { org: scopeOrg?.name ?? t('repo.readOnly.theOrganization') })}
        </p>
      )}
    </fieldset>
  )
}
