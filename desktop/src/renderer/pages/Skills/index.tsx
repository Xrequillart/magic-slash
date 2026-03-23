import { useState, useEffect, useCallback, useMemo } from 'react'
import { Plus, ArrowLeft, Trash2, Save, ImagePlus, X, ChevronRight, Image, Share2, FolderInput } from 'lucide-react'
import { useSkills, type SkillInfo, type SkillDetail, type RepoSkillInfo } from '../../hooks/useSkills'

function SkillCard({
  skill,
  imageUrl,
  badge,
  onClick,
}: {
  skill: SkillInfo | RepoSkillInfo
  imageUrl: string | null
  badge?: { label: string; className: string }
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-4 px-4 py-4 rounded-xl bg-white/[0.06] border border-white/[0.15] hover:bg-white/[0.12] hover:border-white/[0.15] transition-all group"
    >
      {/* Avatar */}
      <div className="w-12 h-12 rounded-lg bg-white/[0.06] flex items-center justify-center overflow-hidden flex-shrink-0">
        {imageUrl ? (
          <img src={imageUrl} alt={skill.name} className="w-full h-full object-cover" />
        ) : (
          <Image className="w-5 h-5 text-text-secondary" />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0 text-left">
        <div className="flex items-center gap-2">
          <span className="text-base font-semibold text-white truncate capitalize">{skill.name}</span>
          {badge && (
            <span className={`px-1.5 py-0.5 text-xs font-medium rounded flex-shrink-0 ${badge.className}`}>{badge.label}</span>
          )}
        </div>
        {skill.description && (
          <p className="text-sm text-text-secondary/60 truncate mt-1">{skill.description}</p>
        )}
      </div>

      {/* Arrow */}
      <ChevronRight className="w-4 h-4 text-text-secondary/30 group-hover:text-text-secondary/60 transition-colors flex-shrink-0" />
    </button>
  )
}

function SkillEditor({
  skill,
  isNew,
  onSave,
  onDelete,
  onShare,
  onBack,
}: {
  skill: SkillDetail | null
  isNew: boolean
  onSave: (name: string, content: string, imagePath?: string) => Promise<void>
  onDelete?: () => Promise<void>
  onShare?: (name: string) => Promise<void>
  onBack: () => void
}) {
  const [name, setName] = useState(skill?.name || '')
  const [description, setDescription] = useState(skill?.description || '')
  const [allowedTools, setAllowedTools] = useState(skill?.allowedTools || '')
  const [body, setBody] = useState('')
  const [imagePath, setImagePath] = useState<string | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [sharing, setSharing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isReadOnly = skill?.isBuiltIn || skill?.isRepoSkill || false

  // Initialize body from skill content (strip frontmatter)
  useEffect(() => {
    if (skill?.content) {
      const match = skill.content.match(/^---\n[\s\S]*?\n---\n?(.*)$/s)
      setBody(match ? match[1].trim() : skill.content)
    }
  }, [skill])

  // Load existing image
  useEffect(() => {
    if (skill?.hasImage && skill.dirName && !skill.isRepoSkill) {
      window.electronAPI.skills.getImage(skill.dirName).then((url) => {
        if (url) setImagePreview(url)
      })
    }
  }, [skill])

  const handlePickImage = async () => {
    const path = await window.electronAPI.dialog.openFile()
    if (path) {
      setImagePath(path)
      setImagePreview(null)
    }
  }

  const handleRemoveImage = () => {
    setImagePath(null)
    setImagePreview(null)
  }

  const buildContent = (): string => {
    const frontmatter = `---\nname: ${name}\ndescription: ${description}\nallowed-tools: ${allowedTools}\n---`
    return body ? `${frontmatter}\n\n${body}` : frontmatter
  }

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Skill name is required')
      return
    }

    // Validate name: only lowercase letters, numbers, hyphens
    if (!/^[a-z0-9-]+$/.test(name.trim())) {
      setError('Skill name must contain only lowercase letters, numbers, and hyphens')
      return
    }

    setSaving(true)
    setError(null)
    try {
      await onSave(name.trim(), buildContent(), imagePath || undefined)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setSaving(false)
    }
  }

  const handleShare = async () => {
    if (!onShare) return
    setSharing(true)
    try {
      await onShare(name)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setSharing(false)
    }
  }

  const handleDelete = async () => {
    if (!onDelete) return
    setDeleting(true)
    try {
      await onDelete()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setDeleting(false)
    }
  }

  const headerTitle = (() => {
    if (skill?.isRepoSkill) return `${skill.name} (repo: ${skill.repoName}, read-only)`
    if (isReadOnly) return `${skill?.name} (read-only)`
    if (isNew) return 'New Skill'
    return `Edit ${skill?.name}`
  })()

  return (
    <div className="flex flex-col gap-6 animate-fade-in max-w-[62rem] mx-auto w-full">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-text-secondary hover:text-white"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="text-xl font-semibold capitalize flex-1">
          {headerTitle}
        </h2>
        {!isNew && !isReadOnly && onShare && (
          <button
            onClick={handleShare}
            disabled={sharing}
            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-text-secondary border border-white/10 rounded-lg hover:bg-white/5 hover:text-white transition-all disabled:opacity-50"
          >
            <Share2 className="w-4 h-4" />
            {sharing ? 'Sharing...' : 'Share'}
          </button>
        )}
      </div>

      {error && (
        <div className="px-4 py-3 bg-red/10 border border-red/20 rounded-lg text-red text-sm">
          {error}
        </div>
      )}

      {/* Form */}
      <div className="flex flex-col gap-4">
        {/* Name */}
        <div>
          <label className="block text-base font-medium text-text-secondary mb-1.5">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={isReadOnly || !isNew}
            placeholder="my-skill"
            className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-base text-white placeholder-text-secondary/50 focus:outline-none focus:border-accent/50 disabled:opacity-50"
          />
          {isNew && (
            <p className="mt-1 text-xs text-text-secondary/60">Lowercase letters, numbers, and hyphens only</p>
          )}
        </div>

        {/* Description */}
        <div>
          <label className="block text-base font-medium text-text-secondary mb-1.5">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={isReadOnly}
            placeholder="Describe when this skill should be triggered..."
            rows={3}
            className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-base text-white placeholder-text-secondary/50 focus:outline-none focus:border-accent/50 disabled:opacity-50 resize-none"
          />
        </div>

        {/* Allowed Tools */}
        <div>
          <label className="block text-base font-medium text-text-secondary mb-1.5">Allowed Tools</label>
          <input
            type="text"
            value={allowedTools}
            onChange={(e) => setAllowedTools(e.target.value)}
            disabled={isReadOnly}
            placeholder="Bash(*), Read, Edit, Write, Glob, Grep"
            className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-base text-white placeholder-text-secondary/50 focus:outline-none focus:border-accent/50 disabled:opacity-50"
          />
        </div>

        {/* Image */}
        {!isReadOnly && (
          <div>
            <label className="block text-base font-medium text-text-secondary mb-1.5">Image (optional)</label>
            <div className="flex items-center gap-3">
              {imagePreview ? (
                <div className="relative w-16 h-16 rounded-lg overflow-hidden border border-white/10">
                  <img src={imagePreview} alt="Skill" className="w-full h-full object-cover" />
                  <button
                    onClick={handleRemoveImage}
                    className="absolute -top-1 -right-1 w-5 h-5 bg-red rounded-full flex items-center justify-center"
                  >
                    <X className="w-3 h-3 text-white" />
                  </button>
                </div>
              ) : imagePath ? (
                <div className="flex items-center gap-2 px-3 py-2 bg-white/5 border border-white/10 rounded-lg">
                  <ImagePlus className="w-4 h-4 text-accent" />
                  <span className="text-xs text-text-secondary truncate max-w-[200px]">{imagePath.split('/').pop()}</span>
                  <button onClick={handleRemoveImage} className="text-text-secondary hover:text-red">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : null}
              <button
                onClick={handlePickImage}
                className="px-3 py-2 text-sm font-medium text-text-secondary border border-white/10 rounded-lg hover:bg-white/5 hover:text-white transition-all flex items-center gap-2"
              >
                <ImagePlus className="w-4 h-4" />
                {imagePreview || imagePath ? 'Change' : 'Upload'}
              </button>
            </div>
          </div>
        )}

        {/* Content (markdown body) */}
        <div>
          <label className="block text-base font-medium text-text-secondary mb-1.5">
            Content (Markdown)
          </label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            disabled={isReadOnly}
            placeholder="Write the skill instructions in markdown..."
            rows={16}
            className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-base text-white font-mono placeholder-text-secondary/50 focus:outline-none focus:border-accent/50 disabled:opacity-50 resize-y"
          />
        </div>
      </div>

      {/* Actions */}
      {!isReadOnly && (
        <div className="flex items-center gap-3 pb-6">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-accent hover:bg-accent-hover text-white rounded-lg transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save'}
          </button>

          {!isNew && onDelete && (
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red border border-red/20 rounded-lg hover:bg-red/10 transition-colors disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" />
              {deleting ? 'Deleting...' : 'Delete'}
            </button>
          )}

        </div>
      )}
    </div>
  )
}

export function SkillsPage() {
  const { skills, loading, loadSkills, getSkill, createSkill, updateSkill, deleteSkill, downloadSkill, importSkill, getImage, repoSkills, repoSkillsLoading, loadRepoSkills, getRepoSkill } = useSkills()
  const [imageCache, setImageCache] = useState<Record<string, string | null>>({})

  // Hash routing state
  const [route, setRoute] = useState<{ page: string; params: { name?: string; filePath?: string } }>({ page: 'home', params: {} })
  const [editSkill, setEditSkill] = useState<SkillDetail | null>(null)

  const parseRoute = useCallback((): { page: string; params: { name?: string; filePath?: string } } => {
    const hash = window.location.hash || '#/'

    if (hash === '#/' || hash === '#') {
      return { page: 'home', params: {} }
    }

    const repoSkillMatch = hash.match(/^#\/repo-skill\/(.+)$/)
    if (repoSkillMatch) {
      return { page: 'repo-skill', params: { filePath: decodeURIComponent(repoSkillMatch[1]) } }
    }

    const skillMatch = hash.match(/^#\/skill\/(.+)$/)
    if (skillMatch) {
      return { page: 'skill', params: { name: decodeURIComponent(skillMatch[1]) } }
    }

    if (hash === '#/new') {
      return { page: 'new', params: {} }
    }

    return { page: 'home', params: {} }
  }, [])

  useEffect(() => {
    const handleHashChange = () => setRoute(parseRoute())
    window.addEventListener('hashchange', handleHashChange)
    setRoute(parseRoute())
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [parseRoute])

  // Load skills on mount (both in parallel)
  useEffect(() => {
    loadSkills()
    loadRepoSkills()
  }, [loadSkills, loadRepoSkills])

  // Load skill detail when navigating to a skill
  useEffect(() => {
    if (route.page === 'skill' && route.params.name) {
      getSkill(route.params.name).then(setEditSkill).catch(() => {
        window.location.hash = '#/'
      })
    } else if (route.page === 'repo-skill' && route.params.filePath) {
      getRepoSkill(route.params.filePath).then(setEditSkill).catch(() => {
        window.location.hash = '#/'
      })
    } else if (route.page === 'new') {
      setEditSkill(null)
    }
  }, [route, getSkill, getRepoSkill])

  // Load images for all skills
  useEffect(() => {
    skills.forEach((skill) => {
      if (skill.hasImage && imageCache[skill.dirName] === undefined) {
        getImage(skill.dirName).then((url) => {
          setImageCache((prev) => ({ ...prev, [skill.dirName]: url }))
        })
      }
    })
  }, [skills, getImage, imageCache])

  const builtInSkills = useMemo(() => skills.filter((s) => s.isBuiltIn), [skills])
  const customSkills = useMemo(() => skills.filter((s) => !s.isBuiltIn), [skills])

  const repoSkillsByRepo = useMemo(() => {
    const grouped: Record<string, { color?: string; skills: RepoSkillInfo[] }> = {}
    for (const rs of repoSkills) {
      if (!grouped[rs.repoName]) {
        grouped[rs.repoName] = { color: rs.repoColor, skills: [] }
      }
      grouped[rs.repoName].skills.push(rs)
    }
    return grouped
  }, [repoSkills])

  const navigateToList = useCallback(() => {
    window.location.hash = '#/'
    setEditSkill(null)
  }, [])

  const handleCreateSave = useCallback(async (name: string, content: string, imagePath?: string) => {
    await createSkill(name, content, imagePath)
    window.location.hash = '#/'
  }, [createSkill])

  const handleUpdateSave = useCallback(async (_name: string, content: string, imagePath?: string) => {
    if (!editSkill?.dirName) return
    await updateSkill(editSkill.dirName, content, imagePath)
    window.location.hash = '#/'
  }, [updateSkill, editSkill])

  const handleImport = useCallback(async () => {
    try {
      const result = await importSkill()
      if (result.success && result.name) {
        window.location.hash = `#/skill/${encodeURIComponent(result.name)}`
      }
    } catch {
      // Error will be visible via the skill list reload
    }
  }, [importSkill])

  const handleDelete = useCallback(async () => {
    if (editSkill?.dirName) {
      await deleteSkill(editSkill.dirName)
      window.location.hash = '#/'
    }
  }, [editSkill, deleteSkill])

  const content = (() => {
    // Skill detail / editor view
    if (route.page === 'new') {
      return (
        <SkillEditor
          skill={null}
          isNew
          onSave={handleCreateSave}
          onBack={navigateToList}
        />
      )
    }

    if (route.page === 'repo-skill' && editSkill) {
      return (
        <SkillEditor
          skill={editSkill}
          isNew={false}
          onSave={async () => {}}
          onBack={navigateToList}
        />
      )
    }

    if (route.page === 'skill' && editSkill) {
      return (
        <SkillEditor
          skill={editSkill}
          isNew={false}
          onSave={handleUpdateSave}
          onDelete={editSkill.isBuiltIn ? undefined : handleDelete}
          onShare={editSkill.isBuiltIn ? undefined : () => downloadSkill(editSkill.dirName)}
          onBack={navigateToList}
        />
      )
    }

    // List view
    return (
      <div className="flex flex-col gap-6 animate-fade-in max-w-[62rem] mx-auto w-full">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-semibold">Skills</h1>
          <p className="text-sm text-text-secondary mt-1">Manage the skills available to your agents.</p>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-white/20 border-t-accent rounded-full animate-spin" />
          </div>
        )}

        {!loading && (
          <>
            {/* Built-in section */}
            {builtInSkills.length > 0 && (
              <div>
                <h2 className="text-sm text-text-secondary/50 uppercase tracking-wider">Built-in</h2>
                <p className="text-xs text-text-secondary/30 mt-0.5 mb-3">Magic Slash core skills, powering the development workflow</p>
                <div className="grid grid-cols-3 gap-2">
                  {builtInSkills.map((skill) => (
                    <SkillCard
                      key={skill.dirName}
                      skill={skill}
                      imageUrl={imageCache[skill.dirName] ?? null}
                      badge={{ label: 'built-in', className: 'bg-accent/10 text-accent' }}
                      onClick={() => { window.location.hash = `#/skill/${encodeURIComponent(skill.dirName)}` }}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Custom section */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="text-sm text-text-secondary/50 uppercase tracking-wider">Custom</h2>
                  <p className="text-xs text-text-secondary/30 mt-0.5">User-level skills, available across all projects</p>
                </div>
                {customSkills.length > 0 && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleImport}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-text-secondary bg-white/[0.06] border border-white/[0.15] rounded-lg hover:bg-white/[0.12] hover:text-white transition-all"
                    >
                      <FolderInput className="w-3 h-3" />
                      <span>Import</span>
                    </button>
                    <button
                      onClick={() => { window.location.hash = '#/new' }}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-text-secondary bg-white/[0.06] border border-white/[0.15] rounded-lg hover:bg-white/[0.12] hover:text-white transition-all"
                    >
                      <Plus className="w-3 h-3" />
                      <span>New skill</span>
                    </button>
                  </div>
                )}
              </div>
              {customSkills.length === 0 ? (
                <div className="w-full py-8 border border-dashed border-border/50 rounded-xl">
                  <div className="text-sm text-text-secondary/50 mb-3 text-center">No custom skills yet</div>
                  <div className="flex items-center justify-center gap-3">
                    <button
                      onClick={() => { window.location.hash = '#/new' }}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-text-secondary bg-white/[0.06] border border-white/[0.15] rounded-lg hover:bg-white/[0.12] hover:text-white transition-all"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Create skill</span>
                    </button>
                    <button
                      onClick={handleImport}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-text-secondary bg-white/[0.06] border border-white/[0.15] rounded-lg hover:bg-white/[0.12] hover:text-white transition-all"
                    >
                      <FolderInput className="w-3 h-3" />
                      <span>Import folder</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {customSkills.map((skill) => (
                    <SkillCard
                      key={skill.dirName}
                      skill={skill}
                      imageUrl={imageCache[skill.dirName] ?? null}
                      onClick={() => { window.location.hash = `#/skill/${encodeURIComponent(skill.dirName)}` }}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Repository Skills section */}
            <div>
              <h2 className="text-sm text-text-secondary/50 uppercase tracking-wider">Repository Skills</h2>
              <p className="text-xs text-text-secondary/30 mt-0.5 mb-3">Skills defined in your registered repositories (.claude/skills/ and .claude/commands/)</p>
              {repoSkillsLoading && (
                <div className="flex items-center justify-center py-6">
                  <div className="w-5 h-5 border-2 border-white/20 border-t-accent rounded-full animate-spin" />
                </div>
              )}
              {!repoSkillsLoading && Object.keys(repoSkillsByRepo).length === 0 && (
                <p className="text-sm text-text-secondary/40">No skills found in registered repositories</p>
              )}
              {!repoSkillsLoading && Object.entries(repoSkillsByRepo).map(([repoName, { color, skills: rSkills }]) => (
                <div key={repoName} className="mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: color || '#6B7280' }}
                    />
                    <span className="text-sm font-medium text-text-secondary">{repoName}</span>
                    <span className="text-xs text-text-secondary/40">{rSkills.length}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {rSkills.map((rs) => (
                      <SkillCard
                        key={rs.filePath}
                        skill={rs}
                        imageUrl={null}
                        onClick={() => { window.location.hash = `#/repo-skill/${encodeURIComponent(rs.filePath)}` }}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    )
  })()

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-auto p-6">
        {content}
      </div>
    </div>
  )
}
