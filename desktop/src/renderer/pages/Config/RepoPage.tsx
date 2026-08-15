import { useState, useEffect } from 'react'
import {
  Trash2, Check, AlertTriangle, Plus, Loader2, ChevronDown, ArrowLeft, Building2, Lock, FolderOpen
} from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useConfig } from '../../hooks/useConfig'
import { useOrg } from '../../hooks/useOrg'
import { Modal } from '../../components/Modal'
import { showToast } from '../../components/Toast'
import { PROJECT_COLORS } from '../../utils/projectColors'
import { useT } from '../../i18n'
import { Switch } from '../../components/Switch'
import { INPUT, SELECT } from '../../theme/controls'

interface RepoPageProps {
  repoName: string
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
    deleteRepository,
    renameRepository,
    setRepositoryOrg,
    updateRepositoryLanguages,
    updateRepositoryCommitSettings,
    updateRepositoryResolveSettings,
    updateRepositoryPullRequestSettings,
    updateRepositoryIssuesSettings,
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

  const LangSelect = ({ langKey, label, description }: { langKey: string; label: string; description?: string }) => {
    const currentVal = (repoLangs as any)[langKey] || 'en'

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

          {/* Discussion Language */}
          <LangSelect langKey="discussion" label={t('repo.general.discussionLang')} description={t('repo.general.discussionLangHelp')} />

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

      {/* Branches Section */}
      <div className="mb-6">
        <h2 className="text-xs text-text-secondary/50 uppercase tracking-wider mb-4">{t('repo.branches.section')}</h2>
        <fieldset disabled={readOnly} className="bg-surface border border-line-strong rounded-xl p-4 w-full min-w-0">
          <div className="flex items-start justify-between gap-6 py-3">
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
        </fieldset>
      </div>

      {/* Worktree Files Section */}
      <div className="mb-6">
        <h2 className="text-xs text-text-secondary/50 uppercase tracking-wider mb-4">{t('repo.worktree.section')}</h2>
        <fieldset disabled={readOnly} className="bg-surface border border-line-strong rounded-xl p-4 w-full min-w-0">
          <div className="py-3">
            <div className="flex-1 mb-3">
              <label className="block text-sm font-medium mb-0.5">{t('repo.worktree.files')}</label>
              <p className="text-xs text-text-secondary/50">{t('repo.worktree.filesHelp')}</p>
            </div>
            <div className="flex flex-wrap gap-2 mb-3">
              {(repo.worktreeFiles || []).map((file, index) => (
                <span
                  key={index}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-surface border border-line-strong rounded-lg text-sm"
                >
                  {file}
                  <button
                    onClick={() => {
                      const newFiles = (repo.worktreeFiles || []).filter((_, i) => i !== index)
                      handleWorktreeFilesChange(newFiles)
                    }}
                    className="text-text-secondary hover:text-red transition-colors"
                  >
                    &times;
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                id="worktree-file-input"
                placeholder=".env"
                className={`${INPUT} flex-1`}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const input = e.currentTarget
                    const value = input.value.trim()
                    if (value && !(repo.worktreeFiles || []).includes(value)) {
                      handleWorktreeFilesChange([...(repo.worktreeFiles || []), value])
                      input.value = ''
                    }
                  }
                }}
              />
              <button
                onClick={() => {
                  const input = document.getElementById('worktree-file-input') as HTMLInputElement
                  const value = input?.value.trim()
                  if (value && !(repo.worktreeFiles || []).includes(value)) {
                    handleWorktreeFilesChange([...(repo.worktreeFiles || []), value])
                    input.value = ''
                  }
                }}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-text-secondary bg-surface border border-line-strong rounded-lg hover:bg-surface-strong hover:text-ink transition-all"
              >
                <Plus className="w-3 h-3" />
                {t('repo.worktree.add')}
              </button>
            </div>
          </div>
        </fieldset>
      </div>

      {/* Commit Section */}
      <div className="mb-6">
        <h2 className="text-xs text-text-secondary/50 uppercase tracking-wider mb-4">{t('repo.commit.section')}</h2>
        <fieldset disabled={readOnly} className="bg-surface border border-line-strong rounded-xl p-4 w-full min-w-0">
          <LangSelect langKey="commit" label={t('repo.commit.language')} description={t('repo.commit.languageHelp')} />

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

      {/* Resolve Section */}
      <div className="mb-6">
        <h2 className="text-xs text-text-secondary/50 uppercase tracking-wider mb-4">{t('repo.resolve.section')}</h2>
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

          {/* Reply Language - only when reply is enabled */}
          {resolveReplyVal && (
            <div className="flex items-start justify-between gap-6 py-3">
              <div className="flex-1">
                <label className="block text-sm font-medium mb-0.5">{t('repo.resolve.replyLang')}</label>
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

      {/* Pull Request Section */}
      <div className="mb-6">
        <h2 className="text-xs text-text-secondary/50 uppercase tracking-wider mb-4">{t('repo.pr.section')}</h2>
        <fieldset disabled={readOnly} className="bg-surface border border-line-strong rounded-xl p-4 w-full min-w-0">
          <LangSelect langKey="pullRequest" label={t('repo.commit.language')} description={t('repo.pr.languageHelp')} />

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

      {/* Jira / GitHub Issues Section */}
      <div className="mb-6">
        <h2 className="text-xs text-text-secondary/50 uppercase tracking-wider mb-4">{t('repo.issues.section')}</h2>
        <fieldset disabled={readOnly} className="bg-surface border border-line-strong rounded-xl p-4 w-full min-w-0">
          <LangSelect langKey="jiraComment" label={t('repo.issues.commentLang')} description={t('repo.issues.commentLangHelp')} />

          {/* Comment on PR */}
          <div className="flex items-center justify-between gap-6 py-3 border-b border-line-subtle">
            <div className="flex-1">
              <label className="block text-sm font-medium mb-0.5">{t('repo.issues.commentOnPR')}</label>
              <p className="text-xs text-text-secondary/50">{t('repo.issues.commentOnPRHelp')}</p>
            </div>
            <Switch
              checked={commentOnPRVal}
              onChange={(next) => handleIssuesSettingChange('commentOnPR', next)}
              label={t('repo.issues.commentOnPR')}
            />
          </div>

          {/* Jira URL */}
          <div className="flex items-start justify-between gap-6 py-3 border-b border-line-subtle">
            <div className="flex-1">
              <label className="block text-sm font-medium mb-0.5">{t('repo.issues.jiraUrl')}</label>
              <p className="text-xs text-text-secondary/50">
                {t('repo.issues.jiraUrlHelp')}
              </p>
            </div>
            <input
              type="text"
              value={issuesSettings.jiraUrl || ''}
              onChange={(e) => handleIssuesSettingChange('jiraUrl', e.target.value)}
              placeholder="https://company.atlassian.net/browse/"
              className={`${INPUT} w-72`}
            />
          </div>

          {/* GitHub Issues URL */}
          <div className="flex items-start justify-between gap-6 py-3">
            <div className="flex-1">
              <label className="block text-sm font-medium mb-0.5">{t('repo.issues.githubUrl')}</label>
              <p className="text-xs text-text-secondary/50">
                {t('repo.issues.githubUrlHelp')}
              </p>
            </div>
            <input
              type="text"
              value={issuesSettings.githubIssuesUrl || ''}
              onChange={(e) => handleIssuesSettingChange('githubIssuesUrl', e.target.value)}
              placeholder="https://github.com/org/repo/issues/"
              className={`${INPUT} w-72`}
            />
          </div>
        </fieldset>
      </div>

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
