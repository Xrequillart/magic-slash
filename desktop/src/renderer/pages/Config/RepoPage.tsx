import { useState, useEffect, useRef, type ReactNode } from 'react'
import {
  Trash2, Check, AlertTriangle, Plus, Loader2, ChevronDown, ArrowLeft, Building2, Lock, FolderOpen,
  Ticket, Settings2, Languages, GitBranch, GitCommitHorizontal, MessageSquare, GitPullRequest,
  ClipboardList, type LucideIcon
} from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useConfig } from '../../hooks/useConfig'
import { useOrg } from '../../hooks/useOrg'
import { Modal } from '../../components/Modal'
import { showToast } from '../../components/Toast'
import { PROJECT_COLORS } from '../../utils/projectColors'
import { useT, type MessageKey } from '../../i18n'
import { Switch } from '../../components/Switch'
import { TabStrip } from '../../components/TabStrip'
import { BTN, INPUT, SELECT } from '../../theme/controls'
import {
  PLAN_SPLITTING_MODES,
  PLAN_ACCEPTANCE_CRITERIA_FORMATS,
  type PlanSettingsInput,
} from '../../../types'
import { resolveTicketLanguage } from '../../../languages'
import { resolveGitHubIssuesUrl, resolveJiraProject, resolveJiraSite } from '../../../tracker'

interface RepoPageProps {
  repoName: string
}

/**
 * The four tabs the page is cut into, grouped by SUBJECT rather than by skill.
 *
 * That regrouping is the point. The tracker used to be spread over three sections
 * — the remote under General, the Jira URL under Issues, the project key and the
 * issue types under Plan — and the languages over five, so a single question
 * ("where do this repo's tickets go?", "what language does it work in?") could not
 * be answered without reading the whole page and remembering the answers.
 *
 * Message KEYS, not labels, like SETTINGS_TABS in Config/index.tsx: module scope
 * is evaluated once at import, so a `t()` call here would pin the strip to whatever
 * language the app booted in.
 *
 * Rendered by the shared `TabStrip`, the same control the Team page switches
 * organizations with and the dashboard switches scopes with. Each tab carries an
 * icon because the strip styles every pill alike: Danger has no red of its own
 * there, and the bin is what keeps it from reading as a fourth ordinary tab.
 */
type RepoTab =
  | 'general' | 'tracker' | 'languages' | 'git'
  | 'commit' | 'resolve' | 'pr' | 'plan'
  | 'danger'

const REPO_TABS: { id: RepoTab; labelKey: MessageKey; icon: LucideIcon }[] = [
  // Labelled with each subject's OWN `*.section` key rather than a parallel
  // `repo.tab.*` family: a tab and the thing it holds have one name, so there is
  // nowhere for two spellings of it to drift apart — and no second string to forget
  // to translate. Danger is the exception: its section is headed "Danger Zone",
  // which is a warning, where a pill wants one word.
  { id: 'general', labelKey: 'repo.general.section', icon: Settings2 },
  { id: 'tracker', labelKey: 'repo.tracker.section', icon: Ticket },
  { id: 'languages', labelKey: 'repo.langs.section', icon: Languages },
  { id: 'git', labelKey: 'repo.git.section', icon: GitBranch },
  // One tab per skill rather than one "Skills" tab holding four sections: each of
  // these is a workflow with its own vocabulary, and stacking them made the tab that
  // held them longer than the five others put together.
  { id: 'commit', labelKey: 'repo.commit.section', icon: GitCommitHorizontal },
  { id: 'resolve', labelKey: 'repo.resolve.section', icon: MessageSquare },
  { id: 'pr', labelKey: 'repo.pr.section', icon: GitPullRequest },
  { id: 'plan', labelKey: 'repo.plan.section', icon: ClipboardList },
  { id: 'danger', labelKey: 'repo.tab.danger', icon: Trash2 },
]

/**
 * The label each `plan` enum value wears in the form.
 *
 * Total records over the value lists exported by types.ts, which are the same
 * lists `updateRepositoryPlanSettings` validates against — so the dropdowns can
 * only ever offer a value the write path accepts, and adding a value there
 * without a label here is a tsc error rather than a blank option.
 */
/**
 * The two trackers a repository can file into.
 *
 * Not a config value: a view onto `plan.tracker`, which the skills read and which keeps
 * its three values (`github` / `jira` / `ask`). The third is not a tracker — it is the
 * instruction to ask at runtime — so it is a toggle beside this select rather than an
 * option inside it. Naming a behaviour as if it were a tool is what made the old
 * single three-way row hard to answer: "Ask each time" sat next to a Jira project key
 * that mattered for only two of its three values.
 */
const TRACKER_MODES = ['github', 'jira'] as const

const TRACKER_MODE_LABELS: Record<(typeof TRACKER_MODES)[number], MessageKey> = {
  github: 'repo.tracker.modeGithub',
  jira: 'repo.tracker.modeJira',
}



const PLAN_SPLITTING_LABELS: Record<(typeof PLAN_SPLITTING_MODES)[number], MessageKey> = {
  conservative: 'repo.plan.splittingConservative',
  balanced: 'repo.plan.splittingBalanced',
  eager: 'repo.plan.splittingEager',
}

const PLAN_ACCEPTANCE_CRITERIA_LABELS: Record<(typeof PLAN_ACCEPTANCE_CRITERIA_FORMATS)[number], MessageKey> = {
  checklist: 'repo.plan.acceptanceCriteriaChecklist',
  gherkin: 'repo.plan.acceptanceCriteriaGherkin',
  none: 'repo.plan.acceptanceCriteriaNone',
}

/**
 * One label-plus-help row with its control on the right — the shape every setting
 * in this page wears. Module scope, not inside RepoPage like LangSelect below: a
 * component redeclared each render is a new type each render, so React would
 * remount it and the text fields inside would lose focus on every keystroke.
 */
function SettingRow({ label, description, align = 'start', children }: {
  label: string
  description: string
  align?: 'start' | 'center'
  children: React.ReactNode
}) {
  // Written out rather than interpolated: Tailwind only emits classes it can see
  // as whole strings in the source.
  const items = align === 'center' ? 'items-center' : 'items-start'
  return (
    <div className={`flex ${items} justify-between gap-6 py-3 border-b border-line-subtle`}>
      <div className="flex-1">
        <label className="block text-sm font-medium mb-0.5">{label}</label>
        <p className="text-xs text-text-secondary/50">{description}</p>
      </div>
      {children}
    </div>
  )
}

/** Native select over a closed value list, with its label map. */
function EnumSelect<T extends string>({ value, values, labels, onChange }: {
  value: string
  values: readonly T[]
  labels: Record<T, MessageKey>
  onChange: (value: string) => void
}) {
  const t = useT()
  return (
    <div className="relative">
      <select value={value} onChange={(e) => onChange(e.target.value)} className={`${SELECT} w-52`}>
        {values.map((v) => (
          <option key={v} value={v}>{t(labels[v])}</option>
        ))}
      </select>
      <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-secondary pointer-events-none" />
    </div>
  )
}

/**
 * Editable list of short strings shown as removable chips. Twin of the webapp's
 * ChipList (webapp/components/SettingRow.tsx), down to `inputId`: the id is a
 * prop precisely so two lists can coexist on this page without colliding.
 */
function ChipList({ items, onChange, placeholder, inputId }: {
  items: string[]
  onChange: (items: string[]) => void
  placeholder: string
  inputId: string
}) {
  const t = useT()
  const inputRef = useRef<HTMLInputElement>(null)

  const add = () => {
    const input = inputRef.current
    const value = input?.value.trim()
    if (!input || !value || items.includes(value)) return
    onChange([...items, value])
    input.value = ''
  }

  return (
    <>
      {items.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {items.map((item) => (
            <span
              key={item}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-surface border border-line-strong rounded-lg text-sm"
            >
              {item}
              <button
                onClick={() => onChange(items.filter((i) => i !== item))}
                aria-label={t('common.remove')}
                className="text-text-secondary hover:text-red transition-colors"
              >
                &times;
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <input
          ref={inputRef}
          type="text"
          id={inputId}
          placeholder={placeholder}
          className={`${INPUT} flex-1`}
          onKeyDown={(e) => {
            if (e.key !== 'Enter') return
            e.preventDefault()
            add()
          }}
        />
        <button onClick={add} className={BTN}>
          <Plus className="w-3 h-3" />
          {t('common.add')}
        </button>
      </div>
    </>
  )
}

/**
 * Sample commit message for the format preview. Deliberately NOT translated to
 * the interface language: it illustrates the shape Claude will produce, and what
 * Claude writes follows this repo's own `languages.commit` setting, not the UI's.
 * Translating it would show a French sample above a repo that commits in English.
 */
function generateCommitExample(format: string, style: string, includeTicketId: boolean): string {
  const examples: Record<string, { type?: string; scope?: string; emoji?: string; msg: string }> = {
    'conventional': { type: 'feat', msg: 'add user authentication' },
    'angular': { type: 'feat', scope: 'auth', msg: 'add user authentication' },
    'gitmoji': { emoji: '\u2728', msg: 'add user authentication' },
    'none': { msg: 'Add user authentication' }
  }

  const bodyText = 'Implement login flow with session management'
  const ticketId = '[PROJ-123]'
  const example = examples[format] || examples['conventional']

  let firstLine = ''
  switch (format) {
    case 'angular':
      firstLine = `${example.type}(${example.scope}): ${example.msg}`
      break
    case 'gitmoji':
      firstLine = `${example.emoji} ${example.msg}`
      break
    case 'none':
      firstLine = example.msg
      break
    case 'conventional':
    default:
      firstLine = `${example.type}: ${example.msg}`
      break
  }

  if (includeTicketId) {
    firstLine += ` ${ticketId}`
  }

  if (style === 'multi-line') {
    return `${firstLine}\n\n${bodyText}`
  }

  return firstLine
}

export function RepoPage({ repoName }: RepoPageProps) {
  const {
    config,
    updateRepository,
    setRepositoryRemoteUrl: saveRemoteUrlToCloud,
    deleteRepository,
    renameRepository,
    setRepositoryOrg,
    updateRepositoryLanguages,
    updateRepositoryCommitSettings,
    updateRepositoryResolveSettings,
    updateRepositoryPullRequestSettings,
    updateRepositoryIssuesSettings,
    updateRepositoryJiraSettings,
    updateRepositoryPlanSettings,
    updateRepositoryBranchSettings,
    updateRepositoryWorktreeFilesSettings,
    validatePath,
    getPRTemplate,
    createPRTemplate,
    updatePRTemplate,
  } = useConfig()

  const { orgs } = useOrg()
  const t = useT()
  const { status } = useAuth()
  const [tab, setTab] = useState<RepoTab>('general')
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [editedName, setEditedName] = useState(repoName)

  // Form state
  const repo = config?.repositories?.[repoName]
  const scopeOrg = repo?.orgId ? orgs.find((o) => o.id === repo.orgId) : null

  /**
   * A team repo's settings drive what every member's agents do — how they
   * commit, which branch they base on, in which language they write — so only
   * the org's admins, plus whoever created the repo, may change them. Other
   * members read.
   *
   * The one exception is the local folder: it is per-machine, private to its
   * user and never shared, so a read-only member still binds their own.
   * Personal repos (no org) have no such notion — only their owner sees them.
   *
   * The same rule is enforced by RLS on `repositories`; this only keeps the page
   * from offering an edit the database would refuse. Until the memberships have
   * loaded the role is unknown and the page stays locked, rather than briefly
   * inviting a change that fails.
   */
  const isOwner = !!repo?.ownerId && repo.ownerId === status.user?.id
  const readOnly = !!repo?.orgId && !isOwner && scopeOrg?.role !== 'admin'

  const [path, setPath] = useState(repo?.path || '')
  const [keywords, setKeywords] = useState((repo?.keywords || []).join(', '))
  const [pathStatus, setPathStatus] = useState<{ isGit?: boolean; exists?: boolean } | null>(null)
  const [pathChanged, setPathChanged] = useState(false)
  const [keywordsChanged, setKeywordsChanged] = useState(false)
  const [remoteUrl, setRemoteUrl] = useState(repo?.remoteUrl || '')
  const [remoteUrlChanged, setRemoteUrlChanged] = useState(false)
  const [remoteUrlError, setRemoteUrlError] = useState<string | null>(null)

  // PR Template state
  const [template, setTemplate] = useState<{ exists: boolean; path?: string; content?: string } | null>(null)
  const [templateContent, setTemplateContent] = useState('')
  const [templateChanged, setTemplateChanged] = useState(false)
  const [templateLoading, setTemplateLoading] = useState(true)

  // Remote branches state
  const [remoteBranches, setRemoteBranches] = useState<string[]>([])
  const [branchesLoading, setBranchesLoading] = useState(false)

  // Reset form state when repoName changes
  useEffect(() => {
    const currentRepo = config?.repositories?.[repoName]
    setEditedName(repoName)
    setPath(currentRepo?.path || '')
    setKeywords((currentRepo?.keywords || []).join(', '))
    setPathChanged(false)
    setKeywordsChanged(false)
    setTemplate(null)
    setTemplateContent('')
    setTemplateChanged(false)
    setTemplateLoading(true)
    setPathStatus(null)
  }, [repoName])

  // Validate path on mount and when repo changes
  useEffect(() => {
    if (repo?.path) {
      validatePath(repo.path).then((result) => {
        setPathStatus(result)
      })
    }
  }, [repoName, repo?.path, validatePath])

  // Load PR template
  useEffect(() => {
    if (repo?.path) {
      setTemplateLoading(true)
      getPRTemplate(repo.path).then((result) => {
        setTemplate(result)
        if (result.content) {
          setTemplateContent(result.content)
        }
        setTemplateLoading(false)
      })
    }
  }, [repoName, repo?.path, getPRTemplate])

  // Fetch remote branches
  useEffect(() => {
    if (!repo?.path) return
    setBranchesLoading(true)
    window.electronAPI.config.getRemoteBranches(repo.path)
      .then((result) => {
        if (!result.error) setRemoteBranches(result.branches)
      })
      .finally(() => setBranchesLoading(false))
  }, [repo?.path])

  const handlePathChange = async (value: string) => {
    setPath(value)
    setPathChanged(value !== repo?.path)
    if (value.trim()) {
      const result = await validatePath(value)
      setPathStatus(result)
    } else {
      setPathStatus(null)
    }
  }

  const handleKeywordsChange = (value: string) => {
    setKeywords(value)
    setKeywordsChanged(value !== (repo?.keywords || []).join(', '))
  }

  const savePath = async () => {
    try {
      await updateRepository(repoName, { path })
      setPathChanged(false)
      showToast(t('toast.pathUpdated'))
    } catch (error) {
      showToast(error instanceof Error ? error.message : t('toast.pathUpdateFailed'), 'error')
    }
  }

  const handleRemoteUrlChange = (value: string) => {
    setRemoteUrl(value)
    setRemoteUrlError(null)
    setRemoteUrlChanged(value.trim() !== (repo?.remoteUrl || ''))
  }

  const saveRemoteUrl = async () => {
    const value = remoteUrl.trim()
    // Checked here so the user is told before a round-trip, and again in main and
    // in the database — this one is a courtesy, not the guarantee.
    if (!/^https:\/\/github\.com\/[\w.-]+\/[\w.-]+$/.test(value)) {
      setRemoteUrlError(t('repo.general.remoteUrlInvalid'))
      return
    }
    try {
      await saveRemoteUrlToCloud(repoName, value)
      setRemoteUrlChanged(false)
      setRemoteUrlError(null)
      showToast(t('toast.remoteUrlUpdated'))
    } catch (error) {
      // The backend is the authority on who may change an address that is
      // already set; say so plainly rather than echoing a raw IPC error.
      const raw = error instanceof Error ? error.message : ''
      setRemoteUrlError(
        raw.includes('remote-url-refused')
          ? t('repo.general.remoteUrlRefused')
          : raw || t('toast.remoteUrlUpdateFailed'),
      )
    }
  }

  const saveKeywords = async () => {
    try {
      const keywordsArray = keywords.split(',').map(k => k.trim()).filter(k => k)
      await updateRepository(repoName, { keywords: keywordsArray })
      setKeywordsChanged(false)
      showToast(t('toast.keywordsUpdated'))
    } catch (error) {
      showToast(error instanceof Error ? error.message : t('toast.keywordsUpdateFailed'), 'error')
    }
  }

  const handleShare = async (orgId: string) => {
    if (!orgId) return
    try {
      await setRepositoryOrg(repoName, orgId)
      showToast(t('toast.repoShared'))
    } catch (error) {
      showToast(error instanceof Error ? error.message : t('toast.repoShareFailed'), 'error')
    }
  }

  const handleMakePersonal = async () => {
    try {
      await setRepositoryOrg(repoName, null)
      showToast(t('toast.repoNowPersonal'))
    } catch (error) {
      showToast(error instanceof Error ? error.message : t('toast.repoUpdateFailed'), 'error')
    }
  }

  // Bind (or re-point) this machine's local folder for the repo.
  const handlePickFolder = async () => {
    const folder = await window.electronAPI.dialog.openFolder()
    if (!folder) return
    try {
      await updateRepository(repoName, { path: folder })
      setPath(folder)
      setPathChanged(false)
      const result = await validatePath(folder)
      setPathStatus(result)
      showToast(t('toast.localFolderSet'))
    } catch (error) {
      showToast(error instanceof Error ? error.message : t('toast.localFolderFailed'), 'error')
    }
  }

  const handleLanguageChange = async (key: string, value: string) => {
    try {
      await updateRepositoryLanguages(repoName, { [key]: value === 'default' ? null : value })
      showToast(t('toast.languageUpdated'))
    } catch (error) {
      showToast(error instanceof Error ? error.message : t('toast.languageUpdateFailed'), 'error')
    }
  }

  const handleCommitSettingChange = async (key: string, value: any) => {
    try {
      const settingValue = value === 'default' ? null : value
      await updateRepositoryCommitSettings(repoName, { [key]: settingValue })
      showToast(t('toast.settingUpdated'))
    } catch (error) {
      showToast(error instanceof Error ? error.message : t('toast.settingUpdateFailed'), 'error')
    }
  }

  const handleResolveSettingChange = async (key: string, value: any) => {
    try {
      const settingValue = value === 'default' ? null : value
      await updateRepositoryResolveSettings(repoName, { [key]: settingValue })
      showToast(t('toast.settingUpdated'))
    } catch (error) {
      showToast(error instanceof Error ? error.message : t('toast.settingUpdateFailed'), 'error')
    }
  }

  const handlePRSettingChange = async (key: string, value: boolean | string) => {
    try {
      if (typeof value === 'boolean') {
        await updateRepositoryPullRequestSettings(repoName, { [key]: value ? null : false })
      } else {
        await updateRepositoryPullRequestSettings(repoName, { [key]: value })
      }
      showToast(t('toast.settingUpdated'))
    } catch (error) {
      showToast(error instanceof Error ? error.message : t('toast.settingUpdateFailed'), 'error')
    }
  }

  const handleIssuesSettingChange = async (key: string, value: boolean | string) => {
    try {
      if (typeof value === 'boolean') {
        await updateRepositoryIssuesSettings(repoName, { [key]: value ? null : false })
      } else {
        await updateRepositoryIssuesSettings(repoName, { [key]: value })
      }
      showToast(t('toast.settingUpdated'))
    } catch (error) {
      showToast(error instanceof Error ? error.message : t('toast.settingUpdateFailed'), 'error')
    }
  }

  /**
   * The one writer of the `jira` block — the repo's Jira site and project key.
   *
   * Two fields that used to live in two different sections, under two different
   * writers (`issues.jiraUrl` and `plan.jiraProject`). They are one address, so
   * they now share a block and this writer; see tracker.ts for the read side.
   */
  const handleJiraSettingChange = async (key: 'siteUrl' | 'projectKey', value: string) => {
    try {
      await updateRepositoryJiraSettings(repoName, { [key]: value })
      showToast(t('toast.settingUpdated'))
    } catch (error) {
      showToast(error instanceof Error ? error.message : t('toast.settingUpdateFailed'), 'error')
    }
  }

  /**
   * The one writer of the `plan` block.
   *
   * Unlike its siblings, `updateRepositoryPlanSettings` does not throw on a bad
   * value: it applies the fields it accepts and answers with the names of the ones
   * it REFUSED, so one stale value can never discard the rest of an object. That
   * makes a plain success toast a lie, hence the branch — a refused write has to
   * say so, and say which setting, or the form silently shows a value the config
   * does not hold.
   */
  const writePlanSettings = async (settings: PlanSettingsInput) => {
    try {
      const { rejected } = await updateRepositoryPlanSettings(repoName, settings)
      if (rejected.length > 0) {
        showToast(t('toast.settingRejected', { keys: rejected.join(', ') }), 'error')
        return
      }
      showToast(t('toast.settingUpdated'))
    } catch (error) {
      showToast(error instanceof Error ? error.message : t('toast.settingUpdateFailed'), 'error')
    }
  }

  // Booleans go over as themselves, deliberately unlike handlePRSettingChange's
  // `value ? null : false`: `true` is a value here, not the absence of one.
  const handlePlanSettingChange = (key: keyof PlanSettingsInput, value: string | boolean | string[]) =>
    writePlanSettings({ [key]: value === 'default' ? null : value })

  // `issueTypes` sits one level deeper, and its two names reset independently —
  // sending `{ issueTypes: { epic } }` leaves `story` alone.
  const handlePlanIssueTypeChange = (key: 'epic' | 'story', value: string) =>
    writePlanSettings({ issueTypes: { [key]: value } })

  const handleBranchSettingChange = async (key: string, value: string) => {
    try {
      await updateRepositoryBranchSettings(repoName, { [key]: value })
      showToast(t('toast.branchSettingUpdated'))
    } catch (error) {
      showToast(error instanceof Error ? error.message : t('toast.branchSettingUpdateFailed'), 'error')
    }
  }

  const handleWorktreeFilesChange = async (files: string[]) => {
    try {
      await updateRepositoryWorktreeFilesSettings(repoName, files)
      showToast(t('toast.worktreeFilesUpdated'))
    } catch (error) {
      showToast(error instanceof Error ? error.message : t('toast.worktreeFilesUpdateFailed'), 'error')
    }
  }

  const handleColorChange = async (color: string) => {
    try {
      await updateRepository(repoName, { color })
      showToast(t('toast.colorUpdated'))
    } catch (error) {
      showToast(error instanceof Error ? error.message : t('toast.colorUpdateFailed'), 'error')
    }
  }

  const handleGenerateTemplate = async () => {
    if (!repo?.path) return
    try {
      const lang = repo.languages?.pullRequest || 'en'
      await createPRTemplate(repo.path, lang)
      showToast(t('toast.prTemplateCreated'))
      // Reload template
      const result = await getPRTemplate(repo.path)
      setTemplate(result)
      if (result.content) setTemplateContent(result.content)
    } catch (error) {
      showToast(error instanceof Error ? error.message : t('toast.prTemplateCreateFailed'), 'error')
    }
  }

  const handleSaveTemplate = async () => {
    if (!repo?.path) return
    try {
      await updatePRTemplate(repo.path, templateContent)
      setTemplateChanged(false)
      showToast(t('toast.prTemplateUpdated'))
    } catch (error) {
      showToast(error instanceof Error ? error.message : t('toast.prTemplateUpdateFailed'), 'error')
    }
  }

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      await deleteRepository(repoName)
      showToast(t('toast.repoDeleted', { name: repoName }))
      window.location.hash = '#/'
    } catch (error) {
      showToast(error instanceof Error ? error.message : t('toast.repoDeleteFailed'), 'error')
    } finally {
      setIsDeleting(false)
      setIsDeleteModalOpen(false)
    }
  }

  const handleRename = async () => {
    const newName = editedName.trim()
    if (!newName || newName === repoName) {
      setEditedName(repoName)
      return
    }

    try {
      await renameRepository(repoName, newName)
      showToast(t('toast.repoRenamed', { name: newName }))
      window.location.hash = `#/repo/${encodeURIComponent(newName)}`
    } catch (error) {
      showToast(error instanceof Error ? error.message : t('toast.repoRenameFailed'), 'error')
      setEditedName(repoName)
    }
  }

  if (!repo) {
    return (
      <div className="text-center py-16">
        <p className="text-lg mb-4">{t('repo.notFound')}</p>
        <a href="#/" className="text-accent hover:underline">{t('repo.back')}</a>
      </div>
    )
  }

  const repoLangs = repo.languages || {}
  const commitSettings = repo.commit || {}
  const resolveSettings = repo.resolve || {}
  const prSettings = repo.pullRequest || {}
  const issuesSettings = repo.issues || {}
  const planSettings = repo.plan || {}
  const branchSettings = repo.branches || {}

  const styleVal = commitSettings.style || 'single-line'
  const formatVal = commitSettings.format || 'angular'
  const coAuthorVal = commitSettings.coAuthor !== undefined ? commitSettings.coAuthor : true
  const includeTicketIdVal = commitSettings.includeTicketId !== undefined ? commitSettings.includeTicketId : false
  // Absent means permitted — the same fallback the skill applies, so an untouched
  // repo reads the same on both sides.
  const allowOnProtectedBranchVal = commitSettings.allowOnProtectedBranch !== undefined ? commitSettings.allowOnProtectedBranch : true
  const resolveCommitModeVal = resolveSettings.commitMode || 'new'
  const resolveUseCommitConfigVal = resolveSettings.useCommitConfig !== undefined ? resolveSettings.useCommitConfig : true
  const resolveStyleVal = resolveSettings.style || 'single-line'
  const resolveFormatVal = resolveSettings.format || 'angular'
  const resolveReplyVal = resolveSettings.replyToComments !== undefined ? resolveSettings.replyToComments : true
  const resolveReplyLangVal = resolveSettings.replyLanguage || repoLangs.discussion || 'en'
  const autoLinkTicketsVal = prSettings.autoLinkTickets !== undefined ? prSettings.autoLinkTickets : true
  const watchCIVal = prSettings.watchCI !== undefined ? prSettings.watchCI : true
  const testAccountsVal = prSettings.testAccounts || 'off'
  const testAccountsSourceVal = prSettings.testAccountsSource || ''
  const commentOnPRVal = issuesSettings.commentOnPR !== undefined ? issuesSettings.commentOnPR : true
  const planTrackerVal = planSettings.tracker || 'ask'
  // Resolved, not read: both keys fall back to the legacy `issues.jiraUrl` /
  // `plan.jiraProject` they replaced, and a form that showed the raw new key would
  // display a blank next to a repo that is in fact configured — then overwrite it
  // with '' on the next save of a neighbouring field.
  const jiraSiteUrlVal = resolveJiraSite(repo)
  const jiraProjectVal = resolveJiraProject(repo)
  // Derived from the remote, or from an `issues.githubIssuesUrl` override when the
  // issues live in another repository. Displayed, never edited — see the Tracker tab.
  const githubIssuesTargetVal = resolveGitHubIssuesUrl(repo)
  // `ask` counts as "there is a Jira": it can only mean anything if Jira is one of the
  // two answers. Only `github` states that there is not one.
  const trackerModeVal = planTrackerVal === 'github' ? 'github' : 'jira'
  // The two free-text Jira issue-type names read '' when unset so the field shows
  // its placeholder — the documented default — rather than a value nobody typed.
  const planEpicTypeVal = planSettings.issueTypes?.epic || ''
  const planStoryTypeVal = planSettings.issueTypes?.story || ''
  const planUseRepoTemplatesVal = planSettings.useRepoTemplates ?? true
  const planSplittingVal = planSettings.splitting || 'balanced'
  const planAcceptanceCriteriaVal = planSettings.acceptanceCriteria || 'checklist'
  const planDefaultLabelsVal = planSettings.defaultLabels || []
  const planAssignToMeVal = planSettings.assignToMe ?? false
  const planDuplicateCheckVal = planSettings.duplicateCheck ?? true

  /**
   * `resolvedValue` is for the language keys whose effective value is a FALLBACK
   * CHAIN rather than the key itself: `languages.ticket` inherits `jiraComment`
   * when unset, so reading `repoLangs.ticket` alone would show English above a
   * repo whose tickets are written in French. Callers with a plain key omit it.
   */
  const LangSelect = ({ langKey, label, description, resolvedValue }: { langKey: string; label: string; description?: string; resolvedValue?: string }) => {
    const currentVal = resolvedValue || (repoLangs as any)[langKey] || 'en'

    return (
      <div className="flex items-start justify-between gap-6 py-4 border-b border-line-subtle last:border-b-0">
        <div className="flex-1">
          <label className="block text-sm font-semibold mb-1">{label}</label>
          {description && <p className="text-xs text-text-secondary/50">{description}</p>}
        </div>
        <div className="relative">
          <select
            value={currentVal}
            disabled={readOnly}
            onChange={(e) => handleLanguageChange(langKey, e.target.value)}
            className={`${SELECT} w-52 disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <option value="en">English</option>
            <option value="fr">Français</option>
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-secondary pointer-events-none" />
        </div>
      </div>
    )
  }

  /**
   * The clone address row, rendered on BOTH the Repository and the Tracker tab.
   *
   * One row, one piece of state, one save button: the two tabs never render at the
   * same time, so sharing them is what makes it impossible for the field to hold two
   * different answers depending on where you opened it. Only the label and the help
   * line differ — on Repository it is the address the team clones from, on Tracker it
   * is the repository the issues are filed in.
   *
   * A FUNCTION returning JSX, deliberately not a component: a component declared
   * inside RepoPage is a new type on every render, so React remounts it and the text
   * input loses focus on every keystroke. That is the reason SettingRow sits at module
   * scope, and it applies to anything holding an input.
   */
  const remoteUrlRow = (label: string, description: ReactNode) => (
    <div className="flex items-start justify-between gap-6 py-3 border-b border-line-subtle">
      <div className="flex-1">
        <label className="block text-sm font-medium mb-0.5">{label}</label>
        <p className="text-xs text-text-secondary/50">{description}</p>
      </div>
      <fieldset disabled={readOnly} className="flex flex-col gap-2 w-72 min-w-0">
        <input
          type="text"
          value={remoteUrl}
          placeholder="https://github.com/owner/repo"
          onChange={(e) => handleRemoteUrlChange(e.target.value)}
          className={`${INPUT} w-full`}
        />
        {remoteUrlError && (
          <div className="flex items-center gap-1.5 text-xs text-red">
            <AlertTriangle className="w-3 h-3" /> {remoteUrlError}
          </div>
        )}
        {remoteUrlChanged && (
          <button onClick={saveRemoteUrl} className="self-end px-3 py-1.5 bg-surface border border-line text-xs rounded-lg hover:text-ink transition-colors">
            {t('common.save')}
          </button>
        )}
      </fieldset>
    </div>
  )

  const resolvePreviewFormat = resolveUseCommitConfigVal
    ? (formatVal === 'default' ? 'angular' : formatVal)
    : (resolveFormatVal === 'default' ? 'angular' : resolveFormatVal)
  const resolvePreview = (() => {
    switch (resolvePreviewFormat) {
      case 'conventional': return 'fix: address review feedback for PROJ-123'
      case 'gitmoji': return '\uD83D\uDC1B address review feedback for PROJ-123'
      case 'none': return 'Address review feedback for PROJ-123'
      case 'angular':
      default: return 'fix(pr): address review feedback for PROJ-123'
    }
  })()

  const commitPreview = generateCommitExample(
    formatVal === 'default' ? 'angular' : formatVal,
    styleVal === 'default' ? 'single-line' : styleVal,
    includeTicketIdVal
  )

  // No entrance animation of its own: the settings content pane already animates
  // every page switch, and two nested slides would compound.
  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <button
            onClick={() => { window.location.hash = '#/' }}
            className="p-1.5 text-text-secondary hover:text-ink hover:bg-bg-tertiary rounded-lg transition-colors"
            title={t('repo.back')}
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h1 className="text-2xl font-semibold">{repoName}</h1>
        </div>
        <p className="text-text-secondary text-sm">
          {readOnly ? t('repo.subtitleReadOnly') : t('repo.subtitle')}
        </p>
      </div>

      {/* Read-only notice (team repo, and you are neither admin nor its creator) */}
      {readOnly && (
        <div className="flex items-start gap-4 p-4 mb-6 bg-surface-subtle border border-line-field rounded-xl">
          <Lock className="w-5 h-5 text-text-secondary flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-sm mb-1">{t('repo.readOnly.title')}</h3>
            <p className="text-xs text-text-secondary">
              {t('repo.readOnly.body', { org: scopeOrg?.name ?? t('repo.readOnly.theOrganization') })}
            </p>
          </div>
        </div>
      )}

      {/* Git Warning */}
      {pathStatus && !pathStatus.isGit && (
        <div className="flex items-start gap-4 p-4 mb-6 bg-red/10 border border-red/20 rounded-xl">
          <AlertTriangle className="w-5 h-5 text-red flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-red text-sm mb-1">
              {pathStatus.exists ? t('repo.gitWarning.notGitTitle') : t('repo.gitWarning.missingTitle')}
            </h3>
            <p className="text-xs text-text-secondary">
              {pathStatus.exists ? t('repo.gitWarning.notGitBody') : t('repo.gitWarning.missingBody')}
            </p>
          </div>
        </div>
      )}

      {/* No local folder warning (team repo not yet bound on this machine) */}
      {repo?.needsLocalPath && (
        <div className="flex items-start gap-4 p-4 mb-6 bg-yellow/10 border border-yellow/20 rounded-xl">
          <FolderOpen className="w-5 h-5 text-yellow flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold text-yellow text-sm mb-1">{t('repo.noLocal.title')}</h3>
            <p className="text-xs text-text-secondary mb-3">
              {t('repo.noLocal.body')}
            </p>
            <button
              onClick={handlePickFolder}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow/15 hover:bg-yellow/25 text-yellow text-xs font-medium rounded-lg transition-colors"
            >
              <FolderOpen className="w-3.5 h-3.5" />
              {t('repo.noLocal.action')}
            </button>
          </div>
        </div>
      )}

      {/* Sub-tabs, INSIDE one entry of the settings rail — the shared TabStrip, so a
          second level of navigation looks like every other tab row in the app rather
          than like something this page invented.

          Local state, not the hash route: `contentKey` in Config/index.tsx keys the
          content pane on `repo:{name}`, so switching sub-tab does not remount this
          page and the choice survives. Leaving the repository and coming back does
          remount it, which lands on Repository — the right default for reopening a
          repo you have not touched in a while. */}
      <div className="mb-6">
        <TabStrip
          ariaLabel={t('repo.tabs.aria')}
          items={REPO_TABS.map(({ id, labelKey, icon }) => ({ key: id, label: t(labelKey), icon }))}
          activeKey={tab}
          // The cast holds because TabStrip only ever reports back a key it was
          // handed, and every key here comes from REPO_TABS.
          onSelect={(key) => setTab(key as RepoTab)}
        />
      </div>


      {tab === 'general' && (
        <>
        {/* Scope / Sharing Section */}
        <div className="mb-6">
          <h2 className="text-xs text-text-secondary/50 uppercase tracking-wider mb-4">{t('repo.scope.section')}</h2>
          <div className="bg-surface border border-line-strong rounded-xl p-4 flex items-start justify-between gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                {repo?.orgId ? (
                  <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-accent/15 text-accent text-xs font-medium">
                    <Building2 className="w-3.5 h-3.5" />
                    {scopeOrg ? t('repo.scope.teamNamed', { name: scopeOrg.name }) : t('repo.scope.team')}
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-surface-strong text-text-secondary text-xs font-medium">
                    <Lock className="w-3.5 h-3.5" />
                    {t('repo.scope.personal')}
                  </span>
                )}
              </div>
              <p className="text-xs text-text-secondary/50">
                {repo?.orgId ? t('repo.scope.teamHelp') : t('repo.scope.personalHelp')}
              </p>
            </div>
            <fieldset disabled={readOnly} className="flex flex-col gap-2 w-72 shrink-0 min-w-0">
              {repo?.orgId ? (
                <button
                  onClick={handleMakePersonal}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 bg-surface border border-line text-xs rounded-lg hover:text-ink transition-colors"
                >
                  <Lock className="w-3.5 h-3.5" />
                  {t('repo.scope.makePersonal')}
                </button>
              ) : orgs.length > 0 ? (
                <div className="relative">
                  <select
                    value=""
                    onChange={(e) => handleShare(e.target.value)}
                    className={`${SELECT} w-full`}
                  >
                    <option value="" disabled>{t('repo.scope.sharePlaceholder')}</option>
                    {orgs.map((o) => (
                      <option key={o.id} value={o.id}>{o.name}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-secondary/50 pointer-events-none" />
                </div>
              ) : (
                <p className="text-xs text-text-secondary/40 text-right">{t('repo.scope.joinOrg')}</p>
              )}
            </fieldset>
          </div>
        </div>

        {/* General Section */}
        <div className="mb-6">
          <h2 className="text-xs text-text-secondary/50 uppercase tracking-wider mb-4">{t('repo.general.section')}</h2>
          <div className="bg-surface border border-line-strong rounded-xl p-4">
            {/* Name */}
            <div className="flex items-start justify-between gap-6 py-3 border-b border-line-subtle">
              <div className="flex-1">
                <label className="block text-sm font-medium mb-0.5">{t('repo.general.name')}</label>
                <p className="text-xs text-text-secondary/50">{t('repo.general.nameHelp')}</p>
              </div>
              <fieldset disabled={readOnly} className="flex flex-col gap-2 w-72 min-w-0">
                <input
                  type="text"
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  className={`${INPUT} w-full`}
                />
                {editedName !== repoName && editedName.trim() && (
                  <button onClick={handleRename} className="self-end px-3 py-1.5 bg-surface border border-line text-xs rounded-lg hover:text-ink transition-colors">
                    {t('common.save')}
                  </button>
                )}
              </fieldset>
            </div>

            {/* Keywords */}
            <div className="flex items-start justify-between gap-6 py-3 border-b border-line-subtle">
              <div className="flex-1">
                <label className="block text-sm font-medium mb-0.5">{t('repo.general.keywords')}</label>
                <p className="text-xs text-text-secondary/50">{t('repo.general.keywordsHelp')}</p>
              </div>
              <fieldset disabled={readOnly} className="flex flex-col gap-2 w-72 min-w-0">
                <input
                  type="text"
                  value={keywords}
                  onChange={(e) => handleKeywordsChange(e.target.value)}
                  className={`${INPUT} w-full`}
                />
                {keywordsChanged && (
                  <button onClick={saveKeywords} className="self-end px-3 py-1.5 bg-surface border border-line text-xs rounded-lg hover:text-ink transition-colors">
                    {t('common.save')}
                  </button>
                )}
              </fieldset>
            </div>


            {/* Color */}
            <div className="flex items-start justify-between gap-6 py-3">
              <div className="flex-1">
                <label className="block text-sm font-medium mb-0.5">{t('repo.general.color')}</label>
                <p className="text-xs text-text-secondary/50">{t('repo.general.colorHelp')}</p>
              </div>
              <fieldset disabled={readOnly} className="flex gap-2 min-w-0">
                {PROJECT_COLORS.map((color) => (
                  <button
                    key={color}
                    onClick={() => handleColorChange(color)}
                    className={`w-6 h-6 rounded-full transition-all ${
                      repo?.color === color
                        ? 'ring-2 ring-offset-2 ring-offset-bg-secondary ring-ink'
                        : 'hover:scale-110'
                    }`}
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                ))}
              </fieldset>
            </div>
          </div>
        </div>
        </>
      )}

      {tab === 'tracker' && (
        <>
        {/* Tracker — everything about WHERE this repo's tickets live, and nothing else.
            It was three sections: the remote under General, the Jira URL under Issues,
            the project key and the issue types under Plan. */}
        <div className="mb-6">
          <div className="bg-surface border border-line-strong rounded-xl p-4">
            <fieldset disabled={readOnly} className="w-full min-w-0">
            {/* Which trackers this repo uses, as the question a person actually has:
                is there a Jira in the picture, or is it GitHub alone? That is not quite
                `plan.tracker`, which answers something narrower — where /magic:plan
                FILES what it creates — and has three values to this one's two. So the
                mode is derived from it rather than stored: `github` means GitHub only,
                and `jira` or `ask` both mean a Jira is configured.

                Picking Jira + GitHub lands on `jira` rather than `ask`, because someone
                who has just declared a Jira most likely wants tickets in it; the row
                below is where they say otherwise. Going the other way writes `github`
                and leaves every Jira value in storage untouched, so the switch is not a
                way to lose a project key by accident. */}
            <SettingRow label={t('repo.tracker.mode')} description={t('repo.tracker.modeHelp')}>
              <EnumSelect
                value={trackerModeVal}
                values={TRACKER_MODES}
                labels={TRACKER_MODE_LABELS}
                onChange={(mode) => handlePlanSettingChange('tracker', mode === 'github' ? 'github' : 'jira')}
              />
            </SettingRow>

            {/* Only reachable in Jira mode, because it is a question about a CHOICE:
                with GitHub alone there is nothing to ask about. On means `ask`, off means
                the tracker named above — so switching it off leaves a repo filing into
                Jira, never into nothing. */}
            {trackerModeVal === 'jira' && (
              <SettingRow align="center" label={t('repo.tracker.askEachTime')} description={t('repo.tracker.askEachTimeHelp')}>
                <Switch
                  checked={planTrackerVal === 'ask'}
                  onChange={(next) => handlePlanSettingChange('tracker', next ? 'ask' : 'jira')}
                  label={t('repo.tracker.askEachTime')}
                />
              </SettingRow>
            )}
            </fieldset>

            {/* The GitHub link is the repo's own remote — the same row the Git tab shows
                as a clone address, same state and same save button (see remoteUrlRow).
                Outside the fieldset above because that row carries its own.

                Its help line names the RESOLVED issues target rather than repeating the
                field, because the two differ exactly when it matters: an
                `issues.githubIssuesUrl` override points the issues at another repository
                while the remote still points at the code. */}
            {remoteUrlRow(
              t('repo.tracker.githubRepo'),
              readOnly
                ? t('repo.general.remoteUrlHelpReadOnly')
                : githubIssuesTargetVal
                  ? t('repo.tracker.issuesGoTo', { target: githubIssuesTargetVal })
                  : t('repo.tracker.githubTargetNone'),
            )}

            <fieldset disabled={readOnly} className="w-full min-w-0">
            {/* Every Jira row hides in GitHub-only mode, the site URL included. It used
                to stay visible on the grounds that ticket links are shown by
                /magic:start, :pr and :done whatever /magic:plan does — true, and beside
                the point now that the mode is an explicit statement about whether this
                repo has a Jira at all. Nothing is cleared, so switching back brings the
                values straight back. */}
            {trackerModeVal === 'jira' && (
              <>
                <SettingRow label={t('repo.tracker.jiraLink')} description={t('repo.tracker.jiraLinkHelp')}>
                  <input
                    type="text"
                    value={jiraSiteUrlVal}
                    onChange={(e) => handleJiraSettingChange('siteUrl', e.target.value)}
                    placeholder="https://company.atlassian.net/browse/"
                    className={`${INPUT} w-72`}
                  />
                </SettingRow>

                <SettingRow label={t('repo.plan.jiraProject')} description={t('repo.plan.jiraProjectHelp')}>
                  <input
                    type="text"
                    value={jiraProjectVal}
                    onChange={(e) => handleJiraSettingChange('projectKey', e.target.value)}
                    placeholder="PROJ"
                    className={`${INPUT} w-72`}
                  />
                </SettingRow>

                <SettingRow label={t('repo.plan.epicType')} description={t('repo.plan.epicTypeHelp')}>
                  <input
                    type="text"
                    value={planEpicTypeVal}
                    onChange={(e) => handlePlanIssueTypeChange('epic', e.target.value)}
                    placeholder="Epic"
                    className={`${INPUT} w-72`}
                  />
                </SettingRow>

                <SettingRow label={t('repo.plan.storyType')} description={t('repo.plan.storyTypeHelp')}>
                  <input
                    type="text"
                    value={planStoryTypeVal}
                    onChange={(e) => handlePlanIssueTypeChange('story', e.target.value)}
                    placeholder="Story"
                    className={`${INPUT} w-72`}
                  />
                </SettingRow>
              </>
            )}

            <SettingRow align="center" label={t('repo.issues.commentOnPR')} description={t('repo.issues.commentOnPRHelp')}>
              <Switch
                checked={commentOnPRVal}
                onChange={(next) => handleIssuesSettingChange('commentOnPR', next)}
                label={t('repo.issues.commentOnPR')}
              />
            </SettingRow>
            </fieldset>
          </div>
        </div>
        </>
      )}

      {tab === 'languages' && (
        <>
        {/* Languages — one block for every language this repo works in.
            They used to be one row per skill section: discussion under General,
            commits under Commit, titles under Pull Request, two more under Issues and
            review replies under Resolve. Each was next to what it affected, which
            sounds right and meant that answering "what language does this repo work
            in?" required visiting five sections and remembering all five answers. */}
        <div className="mb-6">
          <fieldset disabled={readOnly} className="bg-surface border border-line-strong rounded-xl p-4 w-full min-w-0">
            <LangSelect langKey="discussion" label={t('repo.general.discussionLang')} description={t('repo.general.discussionLangHelp')} />
            <LangSelect langKey="commit" label={t('repo.langs.commit')} description={t('repo.commit.languageHelp')} />
            <LangSelect langKey="pullRequest" label={t('repo.langs.pullRequest')} description={t('repo.pr.languageHelp')} />
            <LangSelect langKey="jiraComment" label={t('repo.issues.commentLang')} description={t('repo.issues.commentLangHelp')} />
            <LangSelect
              langKey="ticket"
              label={t('repo.issues.ticketLang')}
              description={t('repo.issues.ticketLangHelp')}
              resolvedValue={resolveTicketLanguage(repoLangs)}
            />

            {/* Not a LangSelect: review replies live in `resolve.replyLanguage`, not in
                the `languages` block, and they fall back to the discussion language
                rather than to English. Shown only when replies are enabled — a language
                for something switched off is a setting with no effect. Styled like its
                neighbours so the block still reads as one list. */}
            {resolveReplyVal && (
              <div className="flex items-start justify-between gap-6 py-4 border-b border-line-subtle last:border-b-0">
                <div className="flex-1">
                  <label className="block text-sm font-semibold mb-1">{t('repo.resolve.replyLang')}</label>
                  <p className="text-xs text-text-secondary/50">{t('repo.resolve.replyLangHelp')}</p>
                </div>
                <div className="relative">
                  <select
                    value={resolveReplyLangVal}
                    onChange={(e) => handleResolveSettingChange('replyLanguage', e.target.value)}
                    className={`${SELECT} w-52`}
                  >
                    <option value="en">English</option>
                    <option value="fr">Français</option>
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-secondary pointer-events-none" />
                </div>
              </div>
            )}
          </fieldset>
        </div>
        </>
      )}

      {tab === 'git' && (
        <>
        {/* Git — how this repo's git is laid out: the folder on this machine, the branch
            features start from, and the files a worktree needs copied into it. Three
            rows that were spread over General, Branches and Worktree. */}
        {/* Git Section */}
        <div className="mb-6">
          <div className="bg-surface border border-line-strong rounded-xl p-4">
            {/* Path — always editable: the folder is this machine's, private to
                you, and a read-only member still needs to point the repo at it. */}
            <div className="flex items-start justify-between gap-6 py-3 border-b border-line-subtle">
              <div className="flex-1">
                <label className="block text-sm font-medium mb-0.5">{t('repo.general.path')}</label>
                <p className="text-xs text-text-secondary/50">
                  {readOnly ? t('repo.general.pathHelpReadOnly') : t('repo.general.pathHelp')}
                </p>
              </div>
              <div className="flex flex-col gap-2 w-72">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={path}
                    onChange={(e) => handlePathChange(e.target.value)}
                    className={`${INPUT} flex-1 min-w-0`}
                  />
                  <button
                    onClick={handlePickFolder}
                    title={t('repo.general.chooseFolder')}
                    className="p-2 bg-surface border border-line rounded-lg text-text-secondary hover:text-ink transition-colors shrink-0"
                  >
                    <FolderOpen className="w-4 h-4" />
                  </button>
                </div>
                {pathStatus && (
                  <div className={`flex items-center gap-1.5 text-xs ${
                    pathStatus.isGit ? 'text-green' : 'text-yellow'
                  }`}>
                    {pathStatus.isGit ? (
                      <><Check className="w-3 h-3" /> {t('repo.general.pathValid')}</>
                    ) : pathStatus.exists ? (
                      <><AlertTriangle className="w-3 h-3" /> {t('repo.general.pathNotGit')}</>
                    ) : (
                      <><AlertTriangle className="w-3 h-3" /> {t('repo.general.pathMissing')}</>
                    )}
                  </div>
                )}
                {pathChanged && (
                  <button onClick={savePath} className="self-end px-3 py-1.5 bg-surface border border-line text-xs rounded-lg hover:text-ink transition-colors">
                    {t('common.save')}
                  </button>
                )}
              </div>
            </div>

            {/* The same remote row the Tracker tab shows — same state, same save button
                (see remoteUrlRow). It appears twice because the address answers two
                different questions: here it is where a teammate clones this repo FROM,
                there it is the repository the issues are filed IN. One row shared
                between them is what keeps the two from drifting apart. */}
            {remoteUrlRow(
              t('repo.general.remoteUrl'),
              readOnly ? t('repo.general.remoteUrlHelpReadOnly') : t('repo.general.remoteUrlHelp'),
            )}

            {/* The two rows above are OUTSIDE the fieldset on purpose. The path is this
                machine's own, private to you, and a read-only member of a team repo still
                has to point the repo at their clone; the remote row carries its own
                fieldset. Everything below is shared config, so it follows `readOnly`. */}
            <fieldset disabled={readOnly} className="w-full min-w-0">
            <div className="flex items-start justify-between gap-6 py-3 border-b border-line-subtle">
              <div className="flex-1">
                <label className="block text-sm font-medium mb-0.5">{t('repo.branches.development')}</label>
                <p className="text-xs text-text-secondary/50">{t('repo.branches.developmentHelp')}</p>
              </div>
              <div className="relative">
                <select
                  value={branchSettings.development || ''}
                  onChange={(e) => handleBranchSettingChange('development', e.target.value)}
                  disabled={branchesLoading}
                  className={`${SELECT} w-52 disabled:opacity-50`}
                >
                  <option value="">
                    {branchesLoading ? t('common.loading') : t('repo.branches.select')}
                  </option>
                  {remoteBranches.map((branch) => (
                    <option key={branch} value={branch}>{branch}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-secondary/50 pointer-events-none" />
              </div>
            </div>

            <div className="py-3">
              <div className="flex-1 mb-3">
                <label className="block text-sm font-medium mb-0.5">{t('repo.worktree.files')}</label>
                <p className="text-xs text-text-secondary/50">{t('repo.worktree.filesHelp')}</p>
              </div>
              <ChipList
                items={repo.worktreeFiles || []}
                onChange={handleWorktreeFilesChange}
                placeholder=".env"
                inputId="worktree-file-input"
              />
            </div>
            </fieldset>
          </div>
        </div>
        </>
      )}

      {tab === 'commit' && (
        <>
        {/* Commit Section */}
        <div className="mb-6">
          <fieldset disabled={readOnly} className="bg-surface border border-line-strong rounded-xl p-4 w-full min-w-0">
            {/* Style */}
            <div className="flex items-start justify-between gap-6 py-3 border-b border-line-subtle">
              <div className="flex-1">
                <label className="block text-sm font-medium mb-0.5">{t('repo.commit.style')}</label>
                <p className="text-xs text-text-secondary/50">{t('repo.commit.styleHelp')}</p>
              </div>
              <div className="relative">
                <select
                  value={styleVal}
                  onChange={(e) => handleCommitSettingChange('style', e.target.value)}
                  className={`${SELECT} w-52`}
                >
                  <option value="single-line">{t('repo.commit.styleSingle')}</option>
                  <option value="multi-line">{t('repo.commit.styleMulti')}</option>
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-secondary pointer-events-none" />
              </div>
            </div>

            {/* Format */}
            <div className="flex items-start justify-between gap-6 py-3 border-b border-line-subtle">
              <div className="flex-1">
                <label className="block text-sm font-medium mb-0.5">{t('repo.commit.format')}</label>
                <p className="text-xs text-text-secondary/50">{t('repo.commit.formatHelp')}</p>
              </div>
              <div className="relative">
                <select
                  value={formatVal}
                  onChange={(e) => handleCommitSettingChange('format', e.target.value)}
                  className={`${SELECT} w-52`}
                >
                  <option value="conventional">{t('repo.commit.formatConventional')}</option>
                  <option value="angular">{t('repo.commit.formatAngular')}</option>
                  <option value="gitmoji">{t('repo.commit.formatGitmoji')}</option>
                  <option value="none">{t('repo.commit.formatNone')}</option>
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-secondary pointer-events-none" />
              </div>
            </div>

            {/* Co-Author Toggle */}
            <div className="flex items-center justify-between gap-6 py-3 border-b border-line-subtle">
              <div className="flex-1">
                <label className="block text-sm font-medium mb-0.5">{t('repo.commit.coAuthor')}</label>
                <p className="text-xs text-text-secondary/50">{t('repo.commit.coAuthorHelp')}</p>
              </div>
              <Switch
                checked={coAuthorVal}
                onChange={(next) => handleCommitSettingChange('coAuthor', next)}
                label={t('repo.commit.coAuthor')}
              />
            </div>

            {/* Include Ticket ID Toggle */}
            <div className="flex items-center justify-between gap-6 py-3 border-b border-line-subtle">
              <div className="flex-1">
                <label className="block text-sm font-medium mb-0.5">{t('repo.commit.ticketId')}</label>
                <p className="text-xs text-text-secondary/50">{t('repo.commit.ticketIdHelp')}</p>
              </div>
              <Switch
                checked={includeTicketIdVal}
                onChange={(next) => handleCommitSettingChange('includeTicketId', next)}
                label={t('repo.commit.ticketId')}
              />
            </div>

            {/* Direct commits on a protected branch. ON means allowed-but-asked; OFF
                means /magic:commit branches off first. The help text has to say which
                way round it is, because both states do something. */}
            <div className="flex items-center justify-between gap-6 py-3">
              <div className="flex-1">
                <label className="block text-sm font-medium mb-0.5">{t('repo.commit.protectedBranch')}</label>
                <p className="text-xs text-text-secondary/50">
                  {allowOnProtectedBranchVal
                    ? t('repo.commit.protectedBranchHelpOn')
                    : t('repo.commit.protectedBranchHelpOff')}
                </p>
              </div>
              <Switch
                checked={allowOnProtectedBranchVal}
                onChange={(next) => handleCommitSettingChange('allowOnProtectedBranch', next)}
                label={t('repo.commit.protectedBranch')}
              />
            </div>

            {/* Commit Preview */}
            <div className="mt-4 p-3 bg-surface border border-line-subtle rounded-lg">
              <div className="text-[10px] text-text-secondary/50 uppercase tracking-wider mb-2">{t('repo.example')}</div>
              <pre className="text-sm whitespace-pre-wrap text-text-secondary">{commitPreview}</pre>
            </div>
          </fieldset>
        </div>
        </>
      )}

      {tab === 'resolve' && (
        <>
        {/* Resolve Section */}
        <div className="mb-6">
          <fieldset disabled={readOnly} className="bg-surface border border-line-strong rounded-xl p-4 w-full min-w-0">
            {/* Commit Mode */}
            <div className="flex items-start justify-between gap-6 py-3 border-b border-line-subtle">
              <div className="flex-1">
                <label className="block text-sm font-medium mb-0.5">{t('repo.resolve.commitMode')}</label>
                <p className="text-xs text-text-secondary/50">{t('repo.resolve.commitModeHelp')}</p>
              </div>
              <div className="relative">
                <select
                  value={resolveCommitModeVal}
                  onChange={(e) => handleResolveSettingChange('commitMode', e.target.value)}
                  className={`${SELECT} w-52`}
                >
                  <option value="new">{t('repo.resolve.modeNew')}</option>
                  <option value="amend">{t('repo.resolve.modeAmend')}</option>
                  <option value="ask">{t('repo.resolve.modeAsk')}</option>
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-secondary pointer-events-none" />
              </div>
            </div>

            {/* Commit Format Source - shown when a new commit is possible (new or ask) */}
            {resolveCommitModeVal !== 'amend' && (
              <div className="flex items-start justify-between gap-6 py-3 border-b border-line-subtle">
                <div className="flex-1">
                  <label className="block text-sm font-medium mb-0.5">{t('repo.resolve.commitFormat')}</label>
                  <p className="text-xs text-text-secondary/50">{t('repo.resolve.commitFormatHelp')}</p>
                </div>
                <div className="relative">
                  <select
                    value={resolveUseCommitConfigVal ? 'commit' : 'custom'}
                    onChange={(e) => handleResolveSettingChange('useCommitConfig', e.target.value === 'commit')}
                    className={`${SELECT} w-52`}
                  >
                    <option value="commit">{t('repo.resolve.useCommitConfig')}</option>
                    <option value="custom">{t('repo.resolve.customConfig')}</option>
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-secondary pointer-events-none" />
                </div>
              </div>
            )}

            {/* Custom Style & Format - when a new commit is possible (new or ask) and useCommitConfig is false */}
            {resolveCommitModeVal !== 'amend' && !resolveUseCommitConfigVal && (
              <>
                <div className="flex items-start justify-between gap-6 py-3 border-b border-line-subtle">
                  <div className="flex-1">
                    <label className="block text-sm font-medium mb-0.5">{t('repo.commit.style')}</label>
                    <p className="text-xs text-text-secondary/50">{t('repo.commit.styleHelp')}</p>
                  </div>
                  <div className="relative">
                    <select
                      value={resolveStyleVal}
                      onChange={(e) => handleResolveSettingChange('style', e.target.value)}
                      className={`${SELECT} w-52`}
                    >
                      <option value="single-line">{t('repo.commit.styleSingle')}</option>
                      <option value="multi-line">{t('repo.commit.styleMulti')}</option>
                    </select>
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-secondary pointer-events-none" />
                  </div>
                </div>

                <div className="flex items-start justify-between gap-6 py-3 border-b border-line-subtle">
                  <div className="flex-1">
                    <label className="block text-sm font-medium mb-0.5">{t('repo.commit.format')}</label>
                    <p className="text-xs text-text-secondary/50">{t('repo.commit.formatHelp')}</p>
                  </div>
                  <div className="relative">
                    <select
                      value={resolveFormatVal}
                      onChange={(e) => handleResolveSettingChange('format', e.target.value)}
                      className={`${SELECT} w-52`}
                    >
                      <option value="conventional">{t('repo.commit.formatConventional')}</option>
                      <option value="angular">{t('repo.commit.formatAngular')}</option>
                      <option value="gitmoji">{t('repo.commit.formatGitmoji')}</option>
                      <option value="none">{t('repo.commit.formatNone')}</option>
                    </select>
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-secondary pointer-events-none" />
                  </div>
                </div>
              </>
            )}

            {/* Reply to Comments Toggle */}
            <div className="flex items-center justify-between gap-6 py-3 border-b border-line-subtle">
              <div className="flex-1">
                <label className="block text-sm font-medium mb-0.5">{t('repo.resolve.reply')}</label>
                <p className="text-xs text-text-secondary/50">{t('repo.resolve.replyHelp')}</p>
              </div>
              <Switch
                checked={resolveReplyVal}
                onChange={(next) => handleResolveSettingChange('replyToComments', next)}
                label={t('repo.resolve.reply')}
              />
            </div>

            {/* Preview / Info */}
            {resolveCommitModeVal === 'new' && (
              <div className="mt-4 p-3 bg-surface border border-line-subtle rounded-lg">
                <div className="text-[10px] text-text-secondary/50 uppercase tracking-wider mb-2">{t('repo.example')}</div>
                <pre className="text-sm whitespace-pre-wrap text-text-secondary">{resolvePreview}</pre>
              </div>
            )}
            {resolveCommitModeVal === 'amend' && (
              <div className="mt-4 p-3 bg-yellow/10 border border-yellow/20 rounded-lg flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-yellow flex-shrink-0" />
                <span className="text-sm text-text-secondary">{t('repo.resolve.amendNotice')} <code className="text-xs bg-surface-strong px-1.5 py-0.5 rounded">--force-with-lease</code></span>
              </div>
            )}
            {resolveCommitModeVal === 'ask' && (
              <div className="mt-4 p-3 bg-yellow/10 border border-yellow/20 rounded-lg flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-yellow flex-shrink-0 mt-0.5" />
                <span className="text-sm text-text-secondary">{t('repo.resolve.askNotice')} <code className="text-xs bg-surface-strong px-1.5 py-0.5 rounded">--force-with-lease</code>.</span>
              </div>
            )}
          </fieldset>
        </div>
        </>
      )}

      {tab === 'pr' && (
        <>
        {/* Pull Request Section */}
        <div className="mb-6">
          <fieldset disabled={readOnly} className="bg-surface border border-line-strong rounded-xl p-4 w-full min-w-0">
            {/* Auto-link Tickets */}
            <div className="flex items-center justify-between gap-6 py-3 border-b border-line-subtle">
              <div className="flex-1">
                <label className="block text-sm font-medium mb-0.5">{t('repo.pr.autoLink')}</label>
                <p className="text-xs text-text-secondary/50">{t('repo.pr.autoLinkHelp')}</p>
              </div>
              <Switch
                checked={autoLinkTicketsVal}
                onChange={(next) => handlePRSettingChange('autoLinkTickets', next)}
                label={t('repo.pr.autoLink')}
              />
            </div>

            {/* Watch CI & Review */}
            <div className="flex items-center justify-between gap-6 py-3 border-b border-line-subtle">
              <div className="flex-1">
                <label className="block text-sm font-medium mb-0.5">{t('repo.pr.watchCI')}</label>
                <p className="text-xs text-text-secondary/50">{t('repo.pr.watchCIHelp')}</p>
              </div>
              <Switch
                checked={watchCIVal}
                onChange={(next) => handlePRSettingChange('watchCI', next)}
                label={t('repo.pr.watchCI')}
              />
            </div>

            {/* Test Accounts */}
            <div className="flex items-start justify-between gap-6 py-3 border-b border-line-subtle">
              <div className="flex-1">
                <label className="block text-sm font-medium mb-0.5">{t('repo.pr.testAccounts')}</label>
                <p className="text-xs text-text-secondary/50">{t('repo.pr.testAccountsHelp')}</p>
                {testAccountsVal === 'inline' && (
                  <p className="text-xs text-yellow mt-1">{t('repo.pr.testAccountsPublicWarn')}</p>
                )}
              </div>
              <div className="relative">
                <select
                  value={testAccountsVal}
                  onChange={(e) => handlePRSettingChange('testAccounts', e.target.value)}
                  className={`${SELECT} w-52`}
                >
                  <option value="off">{t('repo.pr.testAccountsOff')}</option>
                  <option value="reference">{t('repo.pr.testAccountsReference')}</option>
                  <option value="inline">{t('repo.pr.testAccountsInline')}</option>
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-secondary pointer-events-none" />
              </div>
            </div>

            {/* Test Accounts Source - only when test accounts are surfaced */}
            {testAccountsVal !== 'off' && (
              <div className="flex items-start justify-between gap-6 py-3 border-b border-line-subtle">
                <div className="flex-1">
                  <label className="block text-sm font-medium mb-0.5">{t('repo.pr.testAccountsSource')}</label>
                  <p className="text-xs text-text-secondary/50">
                    {t('repo.pr.testAccountsSourceHelp')}
                  </p>
                </div>
                <input
                  type="text"
                  value={testAccountsSourceVal}
                  onChange={(e) => handlePRSettingChange('testAccountsSource', e.target.value)}
                  placeholder="docs/test-accounts.md"
                  className={`${INPUT} w-72`}
                />
              </div>
            )}

            {/* PR Template */}
            <div className="py-3">
              <div className="flex items-start justify-between gap-6 mb-3">
                <div className="flex-1">
                  <label className="block text-sm font-medium mb-0.5">{t('repo.pr.template')}</label>
                  <p className="text-xs text-text-secondary/50">{t('repo.pr.templateHelp')}</p>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  {templateLoading ? (
                    <><Loader2 className="w-3.5 h-3.5 animate-spin" /> {t('repo.pr.templateChecking')}</>
                  ) : template?.exists ? (
                    <><Check className="w-3.5 h-3.5 text-green" /> {t('repo.pr.templateFound')}</>
                  ) : (
                    <button
                      onClick={handleGenerateTemplate}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-text-secondary bg-surface border border-line-strong rounded-lg hover:bg-surface-strong hover:text-ink transition-all"
                    >
                      <Plus className="w-3 h-3" />
                      {t('repo.pr.templateGenerate')}
                    </button>
                  )}
                </div>
              </div>

              {template?.exists && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] text-text-secondary/50 bg-surface px-2 py-1 rounded">
                      {template.path}
                    </span>
                    {templateChanged && (
                      <button
                        onClick={handleSaveTemplate}
                        className="px-3 py-1.5 bg-surface border border-line text-xs rounded-lg hover:text-ink transition-colors"
                      >
                        {t('common.save')}
                      </button>
                    )}
                  </div>
                  <textarea
                    value={templateContent}
                    onChange={(e) => {
                      setTemplateContent(e.target.value)
                      setTemplateChanged(e.target.value !== template.content)
                    }}
                    className="w-full h-64 p-4 bg-surface border border-line-field rounded-lg text-sm resize-y focus:outline-none focus:border-accent transition-colors"
                    placeholder={t('repo.pr.templatePlaceholder')}
                  />
                </div>
              )}
            </div>
          </fieldset>
        </div>
        </>
      )}

      {tab === 'plan' && (
        <>
        {/* Plan Section */}
        <div className="mb-6">
          <fieldset disabled={readOnly} className="bg-surface border border-line-strong rounded-xl p-4 w-full min-w-0">
            <SettingRow label={t('repo.plan.splitting')} description={t('repo.plan.splittingHelp')}>
              <EnumSelect
                value={planSplittingVal}
                values={PLAN_SPLITTING_MODES}
                labels={PLAN_SPLITTING_LABELS}
                onChange={(v) => handlePlanSettingChange('splitting', v)}
              />
            </SettingRow>

            <SettingRow label={t('repo.plan.acceptanceCriteria')} description={t('repo.plan.acceptanceCriteriaHelp')}>
              <EnumSelect
                value={planAcceptanceCriteriaVal}
                values={PLAN_ACCEPTANCE_CRITERIA_FORMATS}
                labels={PLAN_ACCEPTANCE_CRITERIA_LABELS}
                onChange={(v) => handlePlanSettingChange('acceptanceCriteria', v)}
              />
            </SettingRow>

            {/* The three switches differ only by key, and their message keys are
                mechanically `repo.plan.<key>` / `<key>Help`. */}
            {([
              ['useRepoTemplates', planUseRepoTemplatesVal],
              ['duplicateCheck', planDuplicateCheckVal],
              ['assignToMe', planAssignToMeVal],
            ] as const).map(([key, checked]) => (
              <SettingRow
                key={key}
                align="center"
                label={t(`repo.plan.${key}`)}
                description={t(`repo.plan.${key}Help`)}
              >
                <Switch
                  checked={checked}
                  onChange={(next) => handlePlanSettingChange(key, next)}
                  label={t(`repo.plan.${key}`)}
                />
              </SettingRow>
            ))}

            <div className="py-3">
              <div className="flex-1 mb-3">
                <label className="block text-sm font-medium mb-0.5">{t('repo.plan.defaultLabels')}</label>
                <p className="text-xs text-text-secondary/50">{t('repo.plan.defaultLabelsHelp')}</p>
              </div>
              <ChipList
                items={planDefaultLabelsVal}
                onChange={(labels) => handlePlanSettingChange('defaultLabels', labels)}
                placeholder="enhancement"
                inputId="plan-default-label-input"
              />
            </div>
          </fieldset>
        </div>
        </>
      )}



      {tab === 'danger' && (
        <>
        {/* Danger Zone */}
        <div className="mb-6">
          <h2 className="text-xs text-red/50 uppercase tracking-wider mb-4">{t('repo.danger.section')}</h2>
          <fieldset disabled={readOnly} className="bg-red/5 border border-red/10 rounded-xl p-4 w-full min-w-0">
            <div className="flex items-center justify-between">
              <div>
                <label className="block text-sm font-medium mb-0.5">{t('repo.danger.delete')}</label>
                <p className="text-xs text-text-secondary/50">{t('repo.danger.deleteHelp')}</p>
              </div>
              <button
                onClick={() => setIsDeleteModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red border border-red/20 rounded-lg hover:bg-red/10 transition-all"
              >
                <Trash2 className="w-3 h-3" />
                {t('repo.danger.deleteAction')}
              </button>
            </div>
          </fieldset>
        </div>
        </>
      )}


      {/* Delete Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title={t('repo.delete.title')}
        footer={
          <>
            <button
              onClick={() => setIsDeleteModalOpen(false)}
              className="px-3 py-1.5 text-xs font-medium text-text-secondary border border-line rounded-lg hover:bg-surface-strong hover:text-ink transition-all"
            >
              {t('common.cancel')}
            </button>
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="px-3 py-1.5 text-xs font-medium text-red border border-red/20 rounded-lg hover:bg-red/10 disabled:opacity-50 transition-all"
            >
              {isDeleting ? t('repo.delete.deleting') : t('repo.danger.deleteAction')}
            </button>
          </>
        }
      >
        <p>{t('repo.delete.confirm', { name: repoName })}</p>
        <p className="mt-2 text-text-secondary/50">{t('repo.delete.irreversible')}</p>
      </Modal>
    </div>
  )
}
