import { useState, useEffect } from 'react'
import {
  Trash2, Check, AlertTriangle, Plus, Loader2, ChevronDown, ArrowLeft
} from 'lucide-react'
import { useConfig } from '../../hooks/useConfig'
import { Modal } from '../../components/Modal'
import { showToast } from '../../components/Toast'
import { PROJECT_COLORS } from '../../utils/projectColors'

interface RepoPageProps {
  repoName: string
}

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
    updateRepositoryLanguages,
    updateRepositoryCommitSettings,
    updateRepositoryPullRequestSettings,
    updateRepositoryIssuesSettings,
    updateRepositoryBranchSettings,
    validatePath,
    getPRTemplate,
    createPRTemplate,
    updatePRTemplate,
  } = useConfig()

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [editedName, setEditedName] = useState(repoName)

  // Form state
  const repo = config?.repositories?.[repoName]

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
      showToast('Path updated')
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Failed to update path', 'error')
    }
  }

  const saveKeywords = async () => {
    try {
      const keywordsArray = keywords.split(',').map(k => k.trim()).filter(k => k)
      await updateRepository(repoName, { keywords: keywordsArray })
      setKeywordsChanged(false)
      showToast('Keywords updated')
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Failed to update keywords', 'error')
    }
  }

  const handleLanguageChange = async (key: string, value: string) => {
    try {
      await updateRepositoryLanguages(repoName, { [key]: value === 'default' ? null : value })
      showToast('Language updated')
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Failed to update language', 'error')
    }
  }

  const handleCommitSettingChange = async (key: string, value: any) => {
    try {
      const settingValue = value === 'default' ? null : value
      await updateRepositoryCommitSettings(repoName, { [key]: settingValue })
      showToast('Setting updated')
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Failed to update setting', 'error')
    }
  }

  const handlePRSettingChange = async (key: string, value: boolean) => {
    try {
      await updateRepositoryPullRequestSettings(repoName, { [key]: value ? null : false })
      showToast('Setting updated')
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Failed to update setting', 'error')
    }
  }

  const handleIssuesSettingChange = async (key: string, value: boolean | string) => {
    try {
      if (typeof value === 'boolean') {
        await updateRepositoryIssuesSettings(repoName, { [key]: value ? null : false })
      } else {
        await updateRepositoryIssuesSettings(repoName, { [key]: value })
      }
      showToast('Setting updated')
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Failed to update setting', 'error')
    }
  }

  const handleBranchSettingChange = async (key: string, value: string) => {
    try {
      await updateRepositoryBranchSettings(repoName, { [key]: value })
      showToast('Branch setting updated')
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Failed to update branch setting', 'error')
    }
  }

  const handleColorChange = async (color: string) => {
    try {
      await updateRepository(repoName, { color })
      showToast('Color updated')
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Failed to update color', 'error')
    }
  }

  const handleGenerateTemplate = async () => {
    if (!repo?.path) return
    try {
      const lang = repo.languages?.pullRequest || 'en'
      await createPRTemplate(repo.path, lang)
      showToast('PR template created')
      // Reload template
      const result = await getPRTemplate(repo.path)
      setTemplate(result)
      if (result.content) setTemplateContent(result.content)
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Failed to create template', 'error')
    }
  }

  const handleSaveTemplate = async () => {
    if (!repo?.path) return
    try {
      await updatePRTemplate(repo.path, templateContent)
      setTemplateChanged(false)
      showToast('PR template updated')
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Failed to update template', 'error')
    }
  }

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      await deleteRepository(repoName)
      showToast(`Repository '${repoName}' deleted`)
      window.location.hash = '#/'
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Failed to delete repository', 'error')
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
      showToast(`Repository renamed to '${newName}'`)
      window.location.hash = `#/repo/${encodeURIComponent(newName)}`
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Failed to rename repository', 'error')
      setEditedName(repoName)
    }
  }

  if (!repo) {
    return (
      <div className="animate-fade-in text-center py-16">
        <p className="text-lg mb-4">Repository not found</p>
        <a href="#/" className="text-accent hover:underline">Back to repositories</a>
      </div>
    )
  }

  const repoLangs = repo.languages || {}
  const commitSettings = repo.commit || {}
  const prSettings = repo.pullRequest || {}
  const issuesSettings = repo.issues || {}
  const branchSettings = repo.branches || {}

  const styleVal = commitSettings.style || 'single-line'
  const formatVal = commitSettings.format || 'angular'
  const coAuthorVal = commitSettings.coAuthor !== undefined ? commitSettings.coAuthor : true
  const includeTicketIdVal = commitSettings.includeTicketId !== undefined ? commitSettings.includeTicketId : false
  const autoLinkTicketsVal = prSettings.autoLinkTickets !== undefined ? prSettings.autoLinkTickets : true
  const commentOnPRVal = issuesSettings.commentOnPR !== undefined ? issuesSettings.commentOnPR : true

  const LangSelect = ({ langKey, label, description }: { langKey: string; label: string; description?: string }) => {
    const currentVal = (repoLangs as any)[langKey] || 'en'

    return (
      <div className="flex items-start justify-between gap-6 py-4 border-b border-white/5 last:border-b-0">
        <div className="flex-1">
          <label className="block text-sm font-semibold mb-1">{label}</label>
          {description && <p className="text-xs text-text-secondary/50">{description}</p>}
        </div>
        <div className="relative">
          <select
            value={currentVal}
            onChange={(e) => handleLanguageChange(langKey, e.target.value)}
            className="w-52 px-3 py-2.5 pr-10 bg-bg border border-white/10 rounded-lg text-sm cursor-pointer appearance-none focus:outline-none focus:border-accent transition-colors"
          >
            <option value="en">English</option>
            <option value="fr">Francais</option>
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary pointer-events-none" />
        </div>
      </div>
    )
  }

  const commitPreview = generateCommitExample(
    formatVal === 'default' ? 'angular' : formatVal,
    styleVal === 'default' ? 'single-line' : styleVal,
    includeTicketIdVal
  )

  return (
    <div className="animate-fade-in max-w-2xl mx-auto pb-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <button
            onClick={() => { window.location.hash = '#/' }}
            className="p-1.5 text-text-secondary hover:text-white hover:bg-bg-tertiary rounded-lg transition-colors"
            title="Back to repositories"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h1 className="text-2xl font-semibold">{repoName}</h1>
        </div>
        <p className="text-text-secondary text-sm">Configure repository settings</p>
      </div>

      {/* Git Warning */}
      {pathStatus && !pathStatus.isGit && (
        <div className="flex items-start gap-4 p-4 mb-6 bg-red/10 border border-red/20 rounded-xl">
          <AlertTriangle className="w-5 h-5 text-red flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-red text-sm mb-1">
              {pathStatus.exists ? 'Not a Git repository' : 'Directory not found'}
            </h3>
            <p className="text-xs text-text-secondary">
              {pathStatus.exists
                ? 'This directory is not initialized as a Git repository. Run "git init" in this folder or select a different path.'
                : 'The specified path does not exist. Please update the path to a valid directory.'}
            </p>
          </div>
        </div>
      )}

      {/* General Section */}
      <div className="mb-6">
        <h2 className="text-xs text-text-secondary/50 uppercase tracking-wider mb-4">General</h2>
        <div className="bg-bg-tertiary/30 border border-white/5 rounded-xl p-5">
          {/* Name */}
          <div className="flex items-start justify-between gap-6 py-3 border-b border-white/5">
            <div className="flex-1">
              <label className="block text-sm font-medium mb-0.5">Name</label>
              <p className="text-xs text-text-secondary/50">Repository display name</p>
            </div>
            <div className="flex flex-col gap-2 w-72">
              <input
                type="text"
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                className="w-full px-3 py-2 bg-bg border border-white/10 rounded-lg text-sm focus:outline-none focus:border-accent transition-colors"
              />
              {editedName !== repoName && editedName.trim() && (
                <button onClick={handleRename} className="self-end px-3 py-1.5 bg-white/5 border border-white/10 text-xs rounded-lg hover:text-white transition-colors">
                  Save
                </button>
              )}
            </div>
          </div>

          {/* Path */}
          <div className="flex items-start justify-between gap-6 py-3 border-b border-white/5">
            <div className="flex-1">
              <label className="block text-sm font-medium mb-0.5">Path</label>
              <p className="text-xs text-text-secondary/50">Local path to the repository</p>
            </div>
            <div className="flex flex-col gap-2 w-72">
              <input
                type="text"
                value={path}
                onChange={(e) => handlePathChange(e.target.value)}
                className="w-full px-3 py-2 bg-bg border border-white/10 rounded-lg text-sm focus:outline-none focus:border-accent transition-colors"
              />
              {pathStatus && (
                <div className={`flex items-center gap-1.5 text-xs ${
                  pathStatus.isGit ? 'text-green' : 'text-yellow'
                }`}>
                  {pathStatus.isGit ? (
                    <><Check className="w-3 h-3" /> Valid git repository</>
                  ) : pathStatus.exists ? (
                    <><AlertTriangle className="w-3 h-3" /> Not a git repository</>
                  ) : (
                    <><AlertTriangle className="w-3 h-3" /> Directory does not exist</>
                  )}
                </div>
              )}
              {pathChanged && (
                <button onClick={savePath} className="self-end px-3 py-1.5 bg-white/5 border border-white/10 text-xs rounded-lg hover:text-white transition-colors">
                  Save
                </button>
              )}
            </div>
          </div>

          {/* Keywords */}
          <div className="flex items-start justify-between gap-6 py-3 border-b border-white/5">
            <div className="flex-1">
              <label className="block text-sm font-medium mb-0.5">Keywords</label>
              <p className="text-xs text-text-secondary/50">Auto-detection keywords (comma-separated)</p>
            </div>
            <div className="flex flex-col gap-2 w-72">
              <input
                type="text"
                value={keywords}
                onChange={(e) => handleKeywordsChange(e.target.value)}
                className="w-full px-3 py-2 bg-bg border border-white/10 rounded-lg text-sm focus:outline-none focus:border-accent transition-colors"
              />
              {keywordsChanged && (
                <button onClick={saveKeywords} className="self-end px-3 py-1.5 bg-white/5 border border-white/10 text-xs rounded-lg hover:text-white transition-colors">
                  Save
                </button>
              )}
            </div>
          </div>

          {/* Discussion Language */}
          <LangSelect langKey="discussion" label="Discussion Language" description="Language used by Claude when discussing with you" />

          {/* Color */}
          <div className="flex items-start justify-between gap-6 py-3">
            <div className="flex-1">
              <label className="block text-sm font-medium mb-0.5">Color</label>
              <p className="text-xs text-text-secondary/50">Project color in sidebar</p>
            </div>
            <div className="flex gap-2">
              {PROJECT_COLORS.map((color) => (
                <button
                  key={color}
                  onClick={() => handleColorChange(color)}
                  className={`w-6 h-6 rounded-full transition-all ${
                    repo?.color === color
                      ? 'ring-2 ring-offset-2 ring-offset-bg-secondary ring-white'
                      : 'hover:scale-110'
                  }`}
                  style={{ backgroundColor: color }}
                  title={color}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Branches Section */}
      <div className="mb-6">
        <h2 className="text-xs text-text-secondary/50 uppercase tracking-wider mb-4">Branches</h2>
        <div className="bg-bg-tertiary/30 border border-white/5 rounded-xl p-5">
          <div className="flex items-start justify-between gap-6 py-3">
            <div className="flex-1">
              <label className="block text-sm font-medium mb-0.5">Development Branch</label>
              <p className="text-xs text-text-secondary/50">Base branch for comparing commits</p>
            </div>
            <input
              type="text"
              value={branchSettings.development || ''}
              onChange={(e) => handleBranchSettingChange('development', e.target.value)}
              placeholder="develop"
              className="w-52 px-3 py-2 bg-bg border border-white/10 rounded-lg text-sm focus:outline-none focus:border-accent transition-colors"
            />
          </div>
        </div>
      </div>

      {/* Commit Section */}
      <div className="mb-6">
        <h2 className="text-xs text-text-secondary/50 uppercase tracking-wider mb-4">Commit</h2>
        <div className="bg-bg-tertiary/30 border border-white/5 rounded-xl p-5">
          <LangSelect langKey="commit" label="Language" description="Language used for commit messages" />

          {/* Style */}
          <div className="flex items-start justify-between gap-6 py-3 border-b border-white/5">
            <div className="flex-1">
              <label className="block text-sm font-medium mb-0.5">Style</label>
              <p className="text-xs text-text-secondary/50">Single line or multi-line with body</p>
            </div>
            <div className="relative">
              <select
                value={styleVal}
                onChange={(e) => handleCommitSettingChange('style', e.target.value)}
                className="w-52 px-3 py-2 pr-10 bg-bg border border-white/10 rounded-lg text-sm cursor-pointer appearance-none focus:outline-none focus:border-accent transition-colors"
              >
                <option value="single-line">Single line</option>
                <option value="multi-line">Multi-line (with body)</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary pointer-events-none" />
            </div>
          </div>

          {/* Format */}
          <div className="flex items-start justify-between gap-6 py-3 border-b border-white/5">
            <div className="flex-1">
              <label className="block text-sm font-medium mb-0.5">Format</label>
              <p className="text-xs text-text-secondary/50">Commit message format/convention</p>
            </div>
            <div className="relative">
              <select
                value={formatVal}
                onChange={(e) => handleCommitSettingChange('format', e.target.value)}
                className="w-52 px-3 py-2 pr-10 bg-bg border border-white/10 rounded-lg text-sm cursor-pointer appearance-none focus:outline-none focus:border-accent transition-colors"
              >
                <option value="conventional">Conventional (type: description)</option>
                <option value="angular">Angular (type(scope): description)</option>
                <option value="gitmoji">Gitmoji (emoji + description)</option>
                <option value="none">None (free form)</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary pointer-events-none" />
            </div>
          </div>

          {/* Co-Author Toggle */}
          <div className="flex items-center justify-between gap-6 py-3 border-b border-white/5">
            <div className="flex-1">
              <label className="block text-sm font-medium mb-0.5">Co-Author</label>
              <p className="text-xs text-text-secondary/50">Add Claude as co-author in commits</p>
            </div>
            <label className="relative inline-block w-11 h-6 cursor-pointer">
              <input
                type="checkbox"
                checked={coAuthorVal}
                onChange={(e) => handleCommitSettingChange('coAuthor', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-border rounded-full peer peer-checked:bg-accent transition-colors" />
              <div className="absolute left-0.5 top-0.5 w-5 h-5 bg-text-secondary rounded-full peer-checked:translate-x-5 peer-checked:bg-white transition-all" />
            </label>
          </div>

          {/* Include Ticket ID Toggle */}
          <div className="flex items-center justify-between gap-6 py-3">
            <div className="flex-1">
              <label className="block text-sm font-medium mb-0.5">Include Ticket ID</label>
              <p className="text-xs text-text-secondary/50">Add ticket ID from branch name in commit message</p>
            </div>
            <label className="relative inline-block w-11 h-6 cursor-pointer">
              <input
                type="checkbox"
                checked={includeTicketIdVal}
                onChange={(e) => handleCommitSettingChange('includeTicketId', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-border rounded-full peer peer-checked:bg-accent transition-colors" />
              <div className="absolute left-0.5 top-0.5 w-5 h-5 bg-text-secondary rounded-full peer-checked:translate-x-5 peer-checked:bg-white transition-all" />
            </label>
          </div>

          {/* Commit Preview */}
          <div className="mt-4 p-3 bg-white/5 border border-white/5 rounded-lg">
            <div className="text-[10px] text-text-secondary/50 uppercase tracking-wider mb-2">Example</div>
            <pre className="text-sm whitespace-pre-wrap text-text-secondary">{commitPreview}</pre>
          </div>
        </div>
      </div>

      {/* Pull Request Section */}
      <div className="mb-6">
        <h2 className="text-xs text-text-secondary/50 uppercase tracking-wider mb-4">Pull Request</h2>
        <div className="bg-bg-tertiary/30 border border-white/5 rounded-xl p-5">
          <LangSelect langKey="pullRequest" label="Language" description="Language used for pull request titles and descriptions" />

          {/* Auto-link Tickets */}
          <div className="flex items-center justify-between gap-6 py-3 border-b border-white/5">
            <div className="flex-1">
              <label className="block text-sm font-medium mb-0.5">Auto-link Tickets</label>
              <p className="text-xs text-text-secondary/50">Add Jira/GitHub ticket links in PR description</p>
            </div>
            <label className="relative inline-block w-11 h-6 cursor-pointer">
              <input
                type="checkbox"
                checked={autoLinkTicketsVal}
                onChange={(e) => handlePRSettingChange('autoLinkTickets', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-border rounded-full peer peer-checked:bg-accent transition-colors" />
              <div className="absolute left-0.5 top-0.5 w-5 h-5 bg-text-secondary rounded-full peer-checked:translate-x-5 peer-checked:bg-white transition-all" />
            </label>
          </div>

          {/* PR Template */}
          <div className="py-3">
            <div className="flex items-start justify-between gap-6 mb-3">
              <div className="flex-1">
                <label className="block text-sm font-medium mb-0.5">PR Template</label>
                <p className="text-xs text-text-secondary/50">Template used when creating pull requests</p>
              </div>
              <div className="flex items-center gap-2 text-xs">
                {templateLoading ? (
                  <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Checking...</>
                ) : template?.exists ? (
                  <><Check className="w-3.5 h-3.5 text-green" /> Template found</>
                ) : (
                  <button
                    onClick={handleGenerateTemplate}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-text-secondary bg-white/[0.06] border border-white/[0.15] rounded-lg hover:bg-white/[0.12] hover:text-white transition-all"
                  >
                    <Plus className="w-3 h-3" />
                    Generate template
                  </button>
                )}
              </div>
            </div>

            {template?.exists && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] text-text-secondary/50 bg-white/5 px-2 py-1 rounded">
                    {template.path}
                  </span>
                  {templateChanged && (
                    <button
                      onClick={handleSaveTemplate}
                      className="px-3 py-1.5 bg-white/5 border border-white/10 text-xs rounded-lg hover:text-white transition-colors"
                    >
                      Save
                    </button>
                  )}
                </div>
                <textarea
                  value={templateContent}
                  onChange={(e) => {
                    setTemplateContent(e.target.value)
                    setTemplateChanged(e.target.value !== template.content)
                  }}
                  className="w-full h-64 p-4 bg-bg border border-white/10 rounded-lg text-sm resize-y focus:outline-none focus:border-accent transition-colors"
                  placeholder="PR template content..."
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Jira / GitHub Issues Section */}
      <div className="mb-6">
        <h2 className="text-xs text-text-secondary/50 uppercase tracking-wider mb-4">Jira / GitHub Issues</h2>
        <div className="bg-bg-tertiary/30 border border-white/5 rounded-xl p-5">
          <LangSelect langKey="jiraComment" label="Comment Language" description="Language used for Jira and GitHub issue comments" />

          {/* Comment on PR */}
          <div className="flex items-center justify-between gap-6 py-3 border-b border-white/5">
            <div className="flex-1">
              <label className="block text-sm font-medium mb-0.5">Comment on PR Creation</label>
              <p className="text-xs text-text-secondary/50">Add a comment with PR link when creating a pull request</p>
            </div>
            <label className="relative inline-block w-11 h-6 cursor-pointer">
              <input
                type="checkbox"
                checked={commentOnPRVal}
                onChange={(e) => handleIssuesSettingChange('commentOnPR', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-border rounded-full peer peer-checked:bg-accent transition-colors" />
              <div className="absolute left-0.5 top-0.5 w-5 h-5 bg-text-secondary rounded-full peer-checked:translate-x-5 peer-checked:bg-white transition-all" />
            </label>
          </div>

          {/* Jira URL */}
          <div className="flex items-start justify-between gap-6 py-3 border-b border-white/5">
            <div className="flex-1">
              <label className="block text-sm font-medium mb-0.5">Jira URL</label>
              <p className="text-xs text-text-secondary/50">
                Base URL for Jira tickets (e.g., PROJ-123)
              </p>
            </div>
            <input
              type="text"
              value={issuesSettings.jiraUrl || ''}
              onChange={(e) => handleIssuesSettingChange('jiraUrl', e.target.value)}
              placeholder="https://company.atlassian.net/browse/"
              className="w-72 px-3 py-2 bg-bg border border-white/10 rounded-lg text-sm focus:outline-none focus:border-accent transition-colors"
            />
          </div>

          {/* GitHub Issues URL */}
          <div className="flex items-start justify-between gap-6 py-3">
            <div className="flex-1">
              <label className="block text-sm font-medium mb-0.5">GitHub Issues URL</label>
              <p className="text-xs text-text-secondary/50">
                Base URL for GitHub issues (e.g., #456)
              </p>
            </div>
            <input
              type="text"
              value={issuesSettings.githubIssuesUrl || ''}
              onChange={(e) => handleIssuesSettingChange('githubIssuesUrl', e.target.value)}
              placeholder="https://github.com/org/repo/issues/"
              className="w-72 px-3 py-2 bg-bg border border-white/10 rounded-lg text-sm focus:outline-none focus:border-accent transition-colors"
            />
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="mb-6">
        <h2 className="text-xs text-red/50 uppercase tracking-wider mb-4">Danger Zone</h2>
        <div className="bg-red/5 border border-red/10 rounded-xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <label className="block text-sm font-medium mb-0.5">Delete this repository</label>
              <p className="text-xs text-text-secondary/50">Remove this repository from Magic Slash configuration</p>
            </div>
            <button
              onClick={() => setIsDeleteModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red border border-red/20 rounded-lg hover:bg-red/10 transition-all"
            >
              <Trash2 className="w-3 h-3" />
              Delete repository
            </button>
          </div>
        </div>
      </div>

      {/* Delete Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Delete repository"
        footer={
          <>
            <button
              onClick={() => setIsDeleteModalOpen(false)}
              className="px-3 py-1.5 text-xs font-medium text-text-secondary border border-white/10 rounded-lg hover:bg-white/10 hover:text-white transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="px-3 py-1.5 text-xs font-medium text-red border border-red/20 rounded-lg hover:bg-red/10 disabled:opacity-50 transition-all"
            >
              {isDeleting ? 'Deleting...' : 'Delete repository'}
            </button>
          </>
        }
      >
        <p>Are you sure you want to delete <strong className="text-white">{repoName}</strong>?</p>
        <p className="mt-2 text-text-secondary/50">This action cannot be undone.</p>
      </Modal>
    </div>
  )
}
