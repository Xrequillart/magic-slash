'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  Building2,
  ClipboardList,
  FolderGit,
  GitBranch,
  Languages,
  GitCommitHorizontal,
  GitPullRequest,
  Lock,
  MessageSquare,
  Settings2,
  Sparkles,
  Ticket,
  Trash2,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { Dropdown, type DropdownOption } from '@/components/Dropdown'
import { TabStrip } from '@/components/TabStrip'
import { ChipList, ExamplePanel, SettingRow, SettingsCard, Toggle } from '@/components/SettingRow'
import { Button, Input } from '@/components/ui'
import type { Org } from '@/lib/orgs'
import {
  commitExample,
  DEFAULTS,
  GITHUB_REMOTE_URL_PATTERN,
  REPO_COLORS,
  resolveGitHubIssuesUrl,
  resolveJiraProject,
  resolveJiraSite,
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

  const testAccounts: DropdownOption<string>[] = [
    { value: 'off', label: t('repo.pr.testAccountsOff'), description: t('repo.pr.testAccountsOffHelp') },
    { value: 'reference', label: t('repo.pr.testAccountsReference'), description: t('repo.pr.testAccountsReferenceHelp') },
    { value: 'inline', label: t('repo.pr.testAccountsInline'), description: t('repo.pr.testAccountsInlineHelp') },
  ]

  const tracker: DropdownOption<string>[] = [
    { value: 'jira', label: t('repo.plan.trackerJira'), description: t('repo.plan.trackerJiraHelp') },
    { value: 'github', label: t('repo.plan.trackerGithub'), description: t('repo.plan.trackerGithubHelp') },
    { value: 'ask', label: t('repo.plan.trackerAsk'), description: t('repo.plan.trackerAskHelp') },
  ]

  const splitting: DropdownOption<string>[] = [
    {
      value: 'conservative',
      label: t('repo.plan.splittingConservative'),
      description: t('repo.plan.splittingConservativeHelp'),
    },
    {
      value: 'balanced',
      label: t('repo.plan.splittingBalanced'),
      description: t('repo.plan.splittingBalancedHelp'),
    },
    { value: 'eager', label: t('repo.plan.splittingEager'), description: t('repo.plan.splittingEagerHelp') },
  ]

  const acceptance: DropdownOption<string>[] = [
    {
      value: 'checklist',
      label: t('repo.plan.acceptanceCriteriaChecklist'),
      description: t('repo.plan.acceptanceCriteriaChecklistHelp'),
    },
    {
      value: 'gherkin',
      label: t('repo.plan.acceptanceCriteriaGherkin'),
      description: t('repo.plan.acceptanceCriteriaGherkinHelp'),
    },
    { value: 'none', label: t('repo.plan.acceptanceCriteriaNone'), description: t('repo.plan.acceptanceCriteriaNoneHelp') },
  ]

  return { style, format, commitMode, formatSource, testAccounts, tracker, splitting, acceptance }
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
/**
 * The four tabs the form is cut into, grouped by SUBJECT rather than by skill —
 * the same four, in the same order, with the same icons, as the desktop's RepoPage.
 * Two surfaces writing the same config that disagree about where a setting lives is
 * worse than either layout on its own.
 *
 * Rendered by the shared `TabStrip`, which the dashboard and the Application page
 * already use here. Each tab carries an icon because the strip styles every pill
 * alike: Danger gets no red of its own, and the bin is what keeps it from reading as
 * a fourth ordinary tab.
 *
 * Message KEYS, not labels: module scope is evaluated once at import, so a `t()`
 * here would pin the strip to the language the page first rendered in.
 */
type RepoTab = 'repository' | 'tracker' | 'skills' | 'danger'

const REPO_TABS: { id: RepoTab; labelKey: Parameters<Translate>[0]; icon: LucideIcon }[] = [
  { id: 'repository', labelKey: 'repo.tab.repository', icon: FolderGit },
  { id: 'tracker', labelKey: 'repo.tab.tracker', icon: Ticket },
  { id: 'skills', labelKey: 'repo.tab.skills', icon: Sparkles },
  { id: 'danger', labelKey: 'repo.tab.danger', icon: Trash2 },
]

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
  onSaveRemoteUrl,
  onDelete,
  saveError,
  readOnly = false,
}: {
  repo: Repository
  /** Orgs the current user belongs to — the share targets. */
  orgs: Org[]
  onPatch: (patch: RepositoryPatch) => void
  /**
   * Saves the repository remote, answering false when the backend refused it on
   * permissions. Separate from `onPatch` because the column has a single writer and
   * its own rule about who may CHANGE an address already set — see
   * setRepositoryRemoteUrl in lib/repositories.ts.
   */
  onSaveRemoteUrl: (url: string) => Promise<boolean>
  onDelete: () => void
  saveError: string | null
  /**
   * Show the settings without letting them change: a team repo belongs to its
   * org's admins (and its creator). Every SETTING lives inside one disabled
   * fieldset, so nothing here can fire — matching the RLS that would refuse the
   * write anyway. The tab bar is the one control outside it, because `disabled`
   * cascades and a viewer who cannot change tab cannot read the other three. The
   * desktop app keeps one exception this page cannot offer: the local folder,
   * which has no equivalent in the browser.
   */
  readOnly?: boolean
}) {
  const { t } = useT()
  const options = useMemo(() => buildOptions(t), [t])
  const [tab, setTab] = useState<RepoTab>('repository')
  // Draft state for the remote, held here rather than in a DraftField: the row is
  // rendered on two tabs and both must show the same draft and the same error.
  const [remoteUrl, setRemoteUrl] = useState(repo.remoteUrl ?? '')
  const [remoteUrlError, setRemoteUrlError] = useState<string | null>(null)

  // Resolved values: absent means "use the default", same as the desktop.
  const lang = (key: keyof Repository['languages']) => repo.languages[key] ?? DEFAULTS.language
  const commitStyle = repo.commit.style ?? DEFAULTS.commitStyle
  const commitFormat = repo.commit.format ?? DEFAULTS.commitFormat
  const coAuthor = repo.commit.coAuthor ?? DEFAULTS.coAuthor
  const includeTicketId = repo.commit.includeTicketId ?? DEFAULTS.includeTicketId
  const allowOnProtectedBranch = repo.commit.allowOnProtectedBranch ?? DEFAULTS.allowOnProtectedBranch

  const commitMode = repo.resolve.commitMode ?? DEFAULTS.resolveCommitMode
  const useCommitConfig = repo.resolve.useCommitConfig ?? DEFAULTS.resolveUseCommitConfig
  const resolveStyle = repo.resolve.style ?? DEFAULTS.resolveStyle
  const resolveFormat = repo.resolve.format ?? DEFAULTS.resolveFormat
  const replyToComments = repo.resolve.replyToComments ?? DEFAULTS.replyToComments
  const replyLanguage = repo.resolve.replyLanguage ?? repo.languages.discussion ?? DEFAULTS.language

  const autoLinkTickets = repo.pullRequest.autoLinkTickets ?? DEFAULTS.autoLinkTickets
  const watchCI = repo.pullRequest.watchCI ?? DEFAULTS.watchCI
  const testAccounts = repo.pullRequest.testAccounts ?? DEFAULTS.testAccounts
  const commentOnPR = repo.issues.commentOnPR ?? DEFAULTS.commentOnPR
  // The language tickets are WRITTEN IN falls back to the comment language before
  // English: with only `?? DEFAULTS.language` this row would claim English while
  // tickets were in fact being written in the comment language.
  //
  // `||`, not `??`, and it must stay that way: this block is jsonb written
  // wholesale with no per-key validation, so '' does reach here, and `??` would
  // let it win the chain and display a ticket language of nothing at all. The
  // desktop resolves the same chain the same way — resolveTicketLanguage in
  // desktop/src/languages.ts, which has a test for exactly this — and the two
  // surfaces must not disagree about what an empty string means.
  const ticketLanguage = repo.languages.ticket || repo.languages.jiraComment || DEFAULTS.language

  const tracker = repo.plan.tracker ?? DEFAULTS.tracker
  // Resolved, not read: both keys chain onto the legacy `issues.jiraUrl` /
  // `plan.jiraProject` they replaced. See resolveJiraSite in lib/repositories.ts.
  const jiraSiteUrl = resolveJiraSite(repo)
  const jiraProjectKey = resolveJiraProject(repo)
  // Derived from the remote, or from an `issues.githubIssuesUrl` override when the
  // issues live in another repository. Displayed, never edited — see the Tracker card.
  const githubIssuesTarget = resolveGitHubIssuesUrl(repo)

  // Follows the stored value whenever THAT changes — after a refusal the page re-reads
  // the row, and the field has to drop the rejected text rather than present it as
  // current. Keyed on the value, not on `repo`, so typing never trips it.
  useEffect(() => {
    setRemoteUrl(repo.remoteUrl ?? '')
    setRemoteUrlError(null)
  }, [repo.remoteUrl])

  const remoteUrlChanged = remoteUrl.trim() !== (repo.remoteUrl ?? '')

  const saveRemoteUrl = async () => {
    const value = remoteUrl.trim()
    // Checked here so the answer is immediate, and again by the RPC and by the
    // column's CHECK. This one is a courtesy, not the guarantee.
    if (!GITHUB_REMOTE_URL_PATTERN.test(value)) {
      setRemoteUrlError(t('repo.general.remoteUrlInvalid'))
      return
    }
    try {
      const accepted = await onSaveRemoteUrl(value)
      setRemoteUrlError(accepted ? null : t('repo.general.remoteUrlRefused'))
    } catch (err) {
      setRemoteUrlError(err instanceof Error ? err.message : t('common.saveFailed'))
    }
  }

  /**
   * The remote row, rendered on BOTH the Repository and the Tracker tab.
   *
   * One row, one draft, one error: the two tabs never render together, so sharing them
   * is what makes it impossible for the field to hold two different answers depending
   * on where it was opened. Only the label and the help line differ — on Repository it
   * is the address the team clones from, on Tracker it is the repository the issues are
   * filed in.
   *
   * A function returning JSX rather than a component, like the desktop's remoteUrlRow:
   * a component declared in here is a new type on every render, so React would remount
   * it and the input would lose focus on every keystroke.
   */
  const remoteUrlRow = (label: string, description: string) => (
    <SettingRow label={label} description={description}>
      <div className="flex flex-col items-end gap-2">
        <div className="flex items-center gap-2">
          <Input
            type="text"
            value={remoteUrl}
            onChange={(e) => {
              setRemoteUrl(e.target.value)
              setRemoteUrlError(null)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && remoteUrlChanged) {
                e.preventDefault()
                void saveRemoteUrl()
              }
            }}
            placeholder="https://github.com/owner/repo"
            className="w-72"
          />
          {remoteUrlChanged && (
            <Button onClick={saveRemoteUrl} className="shrink-0">
              {t('common.save')}
            </Button>
          )}
        </div>
        {remoteUrlError && (
          <p className="flex items-center gap-1.5 text-xs text-red">
            <AlertTriangle className="h-3 w-3 shrink-0" /> {remoteUrlError}
          </p>
        )}
      </div>
    </SettingRow>
  )
  const epicType = repo.plan.issueTypes?.epic ?? DEFAULTS.issueTypeEpic
  const storyType = repo.plan.issueTypes?.story ?? DEFAULTS.issueTypeStory
  const useRepoTemplates = repo.plan.useRepoTemplates ?? DEFAULTS.useRepoTemplates
  const splitting = repo.plan.splitting ?? DEFAULTS.splitting
  const acceptanceCriteria = repo.plan.acceptanceCriteria ?? DEFAULTS.acceptanceCriteria
  const defaultLabels = repo.plan.defaultLabels ?? DEFAULTS.defaultLabels
  const assignToMe = repo.plan.assignToMe ?? DEFAULTS.assignToMe
  const duplicateCheck = repo.plan.duplicateCheck ?? DEFAULTS.duplicateCheck

  // Patch helpers send only the key that changed. The page merges it into the
  // full jsonb block against the freshest row it holds — merging here instead
  // would bake in this render's `repo`, and two settings changed back to back
  // would both write from the same snapshot, the second dropping the first.
  const setLanguage = (key: keyof Repository['languages'], value: string) =>
    onPatch({ languages: { [key]: value } })
  const setCommit = (patch: Repository['commit']) => onPatch({ commit: patch })
  const setResolve = (patch: Repository['resolve']) => onPatch({ resolve: patch })
  const setIssues = (patch: Repository['issues']) => onPatch({ issues: patch })
  // The Jira site and project key are one address, so they share a block and a
  // setter — they used to sit in `issues` and `plan`, two sections apart, which is
  // how a repo ended up with one half filled in.
  const setJira = (patch: Repository['jira']) => onPatch({ jira: patch })
  // `issueTypes` is sent as its own nested object — `setPlan({ issueTypes: { epic } })`
  // — and expandPatch merges that second level, so writing one type keeps the other.
  const setPlan = (patch: Repository['plan']) => onPatch({ plan: patch })

  const resolvePreview = useCommitConfig
    ? commitExample(commitFormat, commitStyle, includeTicketId)
    : commitExample(resolveFormat, resolveStyle, false)

  const shareOptions: DropdownOption<string>[] = orgs.map((o) => ({ value: o.id, label: o.name }))
  const scopeOrg = repo.orgId ? orgs.find((o) => o.id === repo.orgId) : null

  return (
    <div className="w-full min-w-0 space-y-6">
      {saveError && (
        <p className="rounded-xl border border-red/20 bg-red/[0.04] px-3.5 py-2.5 text-xs text-red">
          {saveError}
        </p>
      )}

      {/* Outside the fieldset below, deliberately: `disabled` on a fieldset disables
          every control it contains, so a strip inside it would leave a read-only
          viewer stuck on whichever tab happened to be open. */}
      <TabStrip
        ariaLabel={t('repo.tabs.aria')}
        items={REPO_TABS.map(({ id, labelKey, icon }) => ({ key: id, label: t(labelKey), icon }))}
        activeKey={tab}
        // The cast holds because TabStrip only ever reports back a key it was
        // handed, and every key here comes from REPO_TABS.
        onSelect={(key) => setTab(key as RepoTab)}
      />

      <fieldset disabled={readOnly} className="w-full min-w-0 space-y-8">

      {tab === 'repository' && (
        <>
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

          {/* Clone address — shared, unlike anything else here. Any member may
              CONTRIBUTE it by binding a local folder in the app; only the owner or an
              org admin may correct one already set. */}
          {remoteUrlRow(
            t('repo.general.remoteUrl'),
            readOnly ? t('repo.general.remoteUrlHelpReadOnly') : t('repo.general.remoteUrlHelp'),
          )}

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

        {/* ── Languages ─────────────────────────────────────────────────────────
            One card for every language this repo works in. They used to be one row per
            skill card — discussion under General, commits under Commit, titles under
            Pull request, two more under Issues, review replies under Resolve. Each sat
            next to what it affected, which sounds right and meant that answering "what
            language does this repo work in?" took five cards and five memories. */}
        <SettingsCard icon={Languages} title={t('repo.langs.section')}>
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

          <SettingRow label={t('repo.langs.commit')} description={t('repo.commit.languageHelp')}>
            <Dropdown
              value={lang('commit')}
              options={LANGUAGE_OPTIONS}
              onChange={(v) => setLanguage('commit', v)}
              width={200}
              className="w-52"
            />
          </SettingRow>

          <SettingRow label={t('repo.langs.pullRequest')} description={t('repo.pr.languageHelp')}>
            <Dropdown
              value={lang('pullRequest')}
              options={LANGUAGE_OPTIONS}
              onChange={(v) => setLanguage('pullRequest', v)}
              width={200}
              className="w-52"
            />
          </SettingRow>

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
            label={t('repo.issues.ticketLang')}
            description={t('repo.issues.ticketLangHelp')}
          >
            <Dropdown
              value={ticketLanguage}
              options={LANGUAGE_OPTIONS}
              onChange={(v) => setLanguage('ticket', v)}
              width={200}
              className="w-52"
            />
          </SettingRow>

          {/* Review replies live in `resolve.replyLanguage`, not in the `languages`
              block, and they inherit the discussion language rather than English. Shown
              only when replies are on: a language for something switched off is a
              setting with no effect. */}
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
        </SettingsCard>

        {/* ── Git ───────────────────────────────────────────────────────────────
            The development branch and the worktree files were a card each, one row
            apiece. Both answer the same question — how this repo's git is laid out —
            and neither earned a heading of its own. */}
        <SettingsCard icon={GitBranch} title={t('repo.git.section')}>
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
        </>
      )}

      {tab === 'tracker' && (
        <>
        {/* ── Tracker ───────────────────────────────────────────────────────────
            Everything about WHERE this repo's tickets live, and nothing else. It was
            three cards: the remote under General, the Jira URL under Issues, the
            project key and issue types under Plan. */}
        <SettingsCard icon={Ticket} title={t('repo.tracker.section')}>
          <SettingRow label={t('repo.plan.tracker')} description={t('repo.plan.trackerHelp')}>
            <Dropdown
              value={tracker}
              options={options.tracker}
              onChange={(tracker) => setPlan({ tracker })}
              width={240}
              className="w-52"
            />
          </SettingRow>

          {/* The same remote row as the Repository tab — same draft, same save button.
              It was read-only here at first, on the grounds that the address is
              "derived". True of the issues URL, and no answer at all to someone
              standing on the card that exists to say where tickets go and finding the
              one address on it uneditable.

              The help line names the RESOLVED target rather than repeating the field,
              because the two differ exactly when it matters: an `issues.githubIssuesUrl`
              override points the issues at another repository while the remote still
              points at the code. */}
          {remoteUrlRow(
            t('repo.tracker.githubRepo'),
            githubIssuesTarget
              ? t('repo.tracker.issuesGoTo', { target: githubIssuesTarget })
              : t('repo.tracker.githubTargetNone'),
          )}

          {/* The Jira site is NOT hidden when the tracker is GitHub, unlike the three
              rows below. It is the base of every ticket link /magic:start, :pr and :done
              display, so a repo that plans on GitHub and tracks work in Jira still needs
              it — whereas a project key and Jira issue-type names mean nothing outside
              Jira. */}
          <SettingRow label={t('repo.issues.jiraUrl')} description={t('repo.issues.jiraUrlHelp')}>
            <DraftField
              persisted={jiraSiteUrl}
              onSave={(siteUrl) => setJira({ siteUrl })}
              placeholder="https://company.atlassian.net/browse/"
              className="w-72"
            />
          </SettingRow>

          {/* Jira-only rows: 'ask' can still land in Jira, so they stay visible there. */}
          {tracker !== 'github' && (
            <>
              <SettingRow
                label={t('repo.plan.jiraProject')}
                description={t('repo.plan.jiraProjectHelp')}
              >
                <DraftField
                  persisted={jiraProjectKey}
                  onSave={(projectKey) => setJira({ projectKey })}
                  placeholder="PROJ"
                  className="w-52"
                />
              </SettingRow>

              <SettingRow label={t('repo.plan.epicType')} description={t('repo.plan.epicTypeHelp')}>
                <DraftField
                  persisted={epicType}
                  onSave={(epic) => setPlan({ issueTypes: { epic } })}
                  placeholder={DEFAULTS.issueTypeEpic}
                  className="w-52"
                  required
                />
              </SettingRow>

              <SettingRow label={t('repo.plan.storyType')} description={t('repo.plan.storyTypeHelp')}>
                <DraftField
                  persisted={storyType}
                  onSave={(story) => setPlan({ issueTypes: { story } })}
                  placeholder={DEFAULTS.issueTypeStory}
                  className="w-52"
                  required
                />
              </SettingRow>
            </>
          )}

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
        </SettingsCard>
        </>
      )}

      {tab === 'skills' && (
        <>
        {/* ── Commit ────────────────────────────────────────────────────────── */}
        <SettingsCard icon={GitCommitHorizontal} title={t('repo.commit.section')}>
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

          {/* Both positions of this switch do something, so the description says which
              one you are looking at rather than describing the setting in the abstract. */}
          <SettingRow
            label={t('repo.commit.protectedBranch')}
            description={
              allowOnProtectedBranch
                ? t('repo.commit.protectedBranchHelpOn')
                : t('repo.commit.protectedBranchHelpOff')
            }
          >
            <Toggle
              label={t('repo.commit.protectedBranch')}
              checked={allowOnProtectedBranch}
              onChange={(allowOnProtectedBranch) => setCommit({ allowOnProtectedBranch })}
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

          <SettingRow label={t('repo.pr.testAccounts')} description={t('repo.pr.testAccountsHelp')}>
            <Dropdown
              value={testAccounts}
              options={options.testAccounts}
              onChange={(testAccounts) => onPatch({ pullRequest: { testAccounts } })}
              width={200}
              className="w-52"
            />
          </SettingRow>

          {testAccounts !== 'off' && (
            <SettingRow
              label={t('repo.pr.testAccountsSource')}
              description={t('repo.pr.testAccountsSourceHelp')}
            >
              <DraftField
                persisted={repo.pullRequest.testAccountsSource ?? ''}
                onSave={(testAccountsSource) => onPatch({ pullRequest: { testAccountsSource } })}
                placeholder="docs/test-accounts.md"
                className="w-72"
              />
            </SettingRow>
          )}

          {testAccounts === 'inline' && (
            <ExamplePanel tone="warning">
              <p className="text-xs text-ink">{t('repo.pr.testAccountsPublicWarn')}</p>
            </ExamplePanel>
          )}

          <SettingRow label={t('repo.pr.template')} description={t('repo.pr.templateHelp')} />
        </SettingsCard>

        {/* ── Plan ──────────────────────────────────────────────────────────── */}
        <SettingsCard icon={ClipboardList} title={t('repo.plan.section')}>
          <SettingRow label={t('repo.plan.splitting')} description={t('repo.plan.splittingHelp')}>
            <Dropdown
              value={splitting}
              options={options.splitting}
              onChange={(splitting) => setPlan({ splitting })}
              width={280}
              className="w-52"
            />
          </SettingRow>

          <SettingRow
            label={t('repo.plan.acceptanceCriteria')}
            description={t('repo.plan.acceptanceCriteriaHelp')}
          >
            <Dropdown
              value={acceptanceCriteria}
              options={options.acceptance}
              onChange={(acceptanceCriteria) => setPlan({ acceptanceCriteria })}
              width={300}
              className="w-52"
            />
          </SettingRow>

          <SettingRow
            label={t('repo.plan.useRepoTemplates')}
            description={t('repo.plan.useRepoTemplatesHelp')}
          >
            <Toggle
              label={t('repo.plan.useRepoTemplates')}
              checked={useRepoTemplates}
              onChange={(useRepoTemplates) => setPlan({ useRepoTemplates })}
            />
          </SettingRow>

          <SettingRow
            label={t('repo.plan.duplicateCheck')}
            description={t('repo.plan.duplicateCheckHelp')}
          >
            <Toggle
              label={t('repo.plan.duplicateCheck')}
              checked={duplicateCheck}
              onChange={(duplicateCheck) => setPlan({ duplicateCheck })}
            />
          </SettingRow>

          <SettingRow label={t('repo.plan.assignToMe')} description={t('repo.plan.assignToMeHelp')}>
            <Toggle
              label={t('repo.plan.assignToMe')}
              checked={assignToMe}
              onChange={(assignToMe) => setPlan({ assignToMe })}
            />
          </SettingRow>

          <SettingRow
            label={t('repo.plan.defaultLabels')}
            description={t('repo.plan.defaultLabelsHelp')}
            stacked
          >
            <ChipList
              items={defaultLabels}
              onChange={(defaultLabels) => setPlan({ defaultLabels })}
              placeholder="enhancement"
              inputId="plan-label-input"
            />
          </SettingRow>
        </SettingsCard>
        </>
      )}

      {tab === 'danger' && (
        <>
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
        </>
      )}

      </fieldset>

      {/* Scope note, so "Team" above is not the only hint about who sees this. */}
      {repo.orgId && !readOnly && (
        <p className="flex items-center gap-2 text-xs text-muted">
          <Building2 className="h-3.5 w-3.5 shrink-0" />
          {t('repo.teamNote', { org: scopeOrg?.name ?? t('repo.readOnly.theOrganization') })}
        </p>
      )}
    </div>
  )
}
