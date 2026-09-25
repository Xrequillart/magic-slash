import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { Plus, Trash2, Save, Share2, FolderInput, Info, Sparkles, PenTool, GitFork, Wand2, FileText, Calculator, Scissors, EyeOff, SlidersHorizontal } from '@ds/desktop/icons'
import { Banner, Button, FormField, ImageField, Loader, SkillsOverview, SkillsRail, Text, type BannerAction, type NoticeCardProps, type SkillBudgetBanner, type SkillBudgetProps, type SkillsOverviewCard, type SkillsRailGroup } from '@ds/desktop'
import { useSkills, type SkillInfo, type SkillDetail, type RepoSkillInfo } from '../../hooks/useSkills'
import SkillDocument from './SkillDocument'
import { VSCode } from '@ds/desktop/icons'
import { SweepPane } from '../../components/SweepPane'
import { useTerminals } from '../../hooks/useTerminals'
import { useStore, type SkillsContextWindow } from '../../store'
import { useLocale, useT, type MessageKey, type Translate } from '../../i18n'
import { DEFAULT_CONTEXT_WINDOW, detectContextWindow, resolveContextWindow, formatWindow } from './contextWindow'

/**
 * The skill listing budget, as Claude Code actually computes it.
 *
 * Every turn, Claude Code injects a listing of each skill's name and description
 * into the system prompt. What that listing may spend is NOT a fixed number — it
 * is derived from the model's context window:
 *
 *   budget_chars = context_window × CHARS_PER_TOKEN × BUDGET_FRACTION
 *
 * 200k window → 8 000 chars; 1M window → 40 000 chars. This page used to hardcode
 * 16 000 chars / 4 000 tokens, which was twice too generous on a 200k model (the
 * gauge read half-full while Claude Code was already dropping descriptions) and
 * two and a half times too strict on a 1M one.
 *
 * The fraction is `skillListingBudgetFraction` in settings.json, and
 * `SLASH_COMMAND_TOOL_CHAR_BUDGET` overrides the whole computation with a fixed
 * character count. We mirror the shipped defaults; the window itself is read off
 * the running agents (see contextWindow.ts), and the switch above the gauges
 * forces one of the two presets when you want to size against another model.
 */
const CHARS_PER_TOKEN = 4
const BUDGET_FRACTION = 0.01

/**
 * `skillListingMaxDescChars` — the per-skill cap on `description` + `when_to_use`
 * combined. Text past it never reaches the model, so a 4 000-character
 * description costs 1 536, not 4 000. Counting the raw length would bill skills
 * for characters Claude never sees.
 */
const MAX_DESC_CHARS = 1536

/** The two windows worth comparing. Order is the order of the switch, after Auto. */
const CONTEXT_WINDOWS: readonly SkillsContextWindow[] = [200_000, 1_000_000]

function charBudgetFor(contextWindow: number): number {
  return Math.max(1, Math.floor(contextWindow * CHARS_PER_TOKEN * BUDGET_FRACTION))
}

interface SkillTokenEntry {
  name: string
  tokens: number
  /** What this skill actually spends — its description, capped at MAX_DESC_CHARS. */
  chars: number
  /** Its description is longer than the cap, so the listing shows a cut version. */
  truncated: boolean
  source: 'built-in' | 'custom' | 'repo'
  weight: 'high' | 'medium' | 'low'
}

interface DuplicateSkillEntry {
  name: string
  sources: Array<{ source: 'built-in' | 'custom' | 'repo'; repoName?: string }>
}

// Anchored to the per-skill cap rather than to round numbers: "high" is a skill
// spending the entire allowance a single description is allowed.
function getWeight(chars: number): 'high' | 'medium' | 'low' {
  if (chars >= MAX_DESC_CHARS) return 'high'
  if (chars >= MAX_DESC_CHARS / 2) return 'medium'
  return 'low'
}

/**
 * WHICH HUE EACH ORIGIN WEARS, as a value rather than a class.
 *
 * THE PAGE'S AND NOT THE DESIGN SYSTEM'S: that built-in is the accent, a repository
 * is blue and a custom skill is green is a fact about how this product talks about
 * skills, and the shared components take `Label`'s contract — a CSS value — precisely
 * so the meaning stays here. The fallback triple is the one the Tailwind config
 * carries, and it is not decoration: an undefined variable invalidates the whole
 * `color-mix` and the plate disappears rather than coming out slightly wrong.
 *
 * THE THIRD KEY IS `custom` AND IT WAS `local`, which matched nothing: a skill's
 * source is `built-in | custom | repo` throughout this file, so every green plate was
 * asking for a colour that is not in the table and getting the neutral ground.
 */
const SOURCE_COLOR: Record<string, string> = {
  'built-in': 'rgb(var(--c-accent, 99 102 241))',
  repo: 'rgb(var(--c-blue, 59 130 246))',
  custom: 'rgb(var(--c-green, 34 197 94))',
}

/**
 * The disc beside a repository that has chosen no colour of its own. A grey, and a
 * VALUE rather than a class for `SOURCE_COLOR`'s reason — `SectionHeader.dot` paints it
 * inline, so Tailwind never sees it.
 */
const REPO_FALLBACK_COLOR = 'rgb(var(--c-text-secondary, 107 114 128))'

/** How loud a skill's share of the budget is. Same contract as `SOURCE_COLOR`. */
const WEIGHT_COLOR: Record<string, string> = {
  high: 'rgb(var(--c-red, 239 68 68))',
  medium: 'rgb(var(--c-orange, 249 115 22))',
  low: 'rgb(var(--c-green, 34 197 94))',
}

const WEIGHT_LABELS: Record<string, MessageKey> = {
  high: 'skills.weight.high',
  medium: 'skills.weight.medium',
  low: 'skills.weight.low',
}

// A skill's origin, shown as a badge. Keys rather than the raw union member, so
// the badge reads "intégré" in French instead of the internal identifier.
const SOURCE_KEYS: Record<string, MessageKey> = {
  'built-in': 'skills.source.builtIn',
  custom: 'skills.source.custom',
  repo: 'skills.source.repo',
}

function sourceLabel(source: string, t: Translate): string {
  const key = SOURCE_KEYS[source]
  return key ? t(key) : source
}

/**
 * THE GAUGE, AS `SkillBudget` WANTS IT. The drawing is the design system's now; what stays
 * here is the arithmetic above and which window it runs against.
 *
 * Auto / 200K / 1M is a segmented control, and `Auto` is not a value but a source — so its
 * label carries the window it resolved to (`Auto · 1M`), and the hint under the switch
 * says where that number came from.
 */
function useSkillBudget(skills: SkillInfo[], repoSkills: RepoSkillInfo[]): SkillBudgetProps {
  const t = useT()
  const locale = useLocale()
  const contextWindow = useStore((s) => s.skillsContextWindow)
  const setContextWindow = useStore((s) => s.setSkillsContextWindow)

  // One selector, resolved to a primitive inside the store rather than in a useMemo over
  // `terminals`: the terminal array is replaced on every statusline tick (several times a
  // second, per agent), so selecting it would re-render the whole gauge continuously.
  // Selecting the number means a re-render only when the detected window itself moves.
  // The inspected agent is resolved the way the info sidebar does it, so both panels talk
  // about the same agent.
  const detected = useStore((s) => detectContextWindow(
    s.terminals,
    s.isSplitMode && s.focusedPane === 'secondary' ? s.splitTerminalId : s.activeTerminalId,
  ))

  const effectiveWindow = resolveContextWindow(contextWindow, detected)
  const charBudget = charBudgetFor(effectiveWindow)
  const tokenBudget = Math.floor(charBudget / CHARS_PER_TOKEN)

  const { totalTokens, totalChars, truncatedCount, breakdown } = useMemo(() => {
    const entries: SkillTokenEntry[] = []
    const add = (name: string, description: string, source: SkillTokenEntry['source']) => {
      const raw = (description || '').length
      // Only what survives the per-skill cap reaches the model, so only that is billed.
      const chars = Math.min(raw, MAX_DESC_CHARS)
      entries.push({
        name,
        chars,
        tokens: Math.ceil(chars / CHARS_PER_TOKEN),
        truncated: raw > MAX_DESC_CHARS,
        source,
        weight: getWeight(chars),
      })
    }
    for (const s of skills) add(s.name, s.description, s.isBuiltIn ? 'built-in' : 'custom')
    for (const rs of repoSkills) add(rs.name, rs.description, 'repo')

    entries.sort((a, b) => b.tokens - a.tokens)
    let tc = 0, cc = 0, cut = 0
    for (const e of entries) {
      tc += e.tokens; cc += e.chars
      if (e.truncated) cut += 1
    }
    return { totalTokens: tc, totalChars: cc, truncatedCount: cut, breakdown: entries }
  }, [skills, repoSkills])

  const n = (value: number) => value.toLocaleString(locale)

  const banners: SkillBudgetBanner[] = []
  if (totalChars > charBudget) {
    banners.push({ id: 'over', variant: 'danger', text: t('skills.budget.over', { over: n(totalChars - charBudget) }) })
  }
  if (truncatedCount > 0) {
    // `Scissors` over the variant's own mark: the warning is about a specific thing that
    // happened to the descriptions, not about severity in general.
    banners.push({
      id: 'truncated',
      variant: 'warning',
      icon: Scissors,
      text: t(truncatedCount > 1 ? 'skills.budget.truncated.other' : 'skills.budget.truncated.one', {
        count: truncatedCount,
        max: n(MAX_DESC_CHARS),
      }),
    })
  }

  return {
    title: t('skills.budget.section'),
    help: t('skills.budget.help'),
    window: {
      label: t('skills.budget.window.label'),
      items: [
        {
          key: 'auto',
          label: detected !== undefined
            ? t('skills.budget.window.autoValue', { window: formatWindow(detected) })
            : t('skills.budget.window.auto'),
        },
        { key: String(CONTEXT_WINDOWS[0]), label: t('skills.budget.window.small') },
        { key: String(CONTEXT_WINDOWS[1]), label: t('skills.budget.window.large') },
      ],
      activeKey: String(contextWindow),
      // The key comes back as a string because a tab's identity is a string. `auto` is the
      // one non-numeric position, so it is the only branch.
      onSelect: (key) => setContextWindow(key === 'auto' ? 'auto' : (Number(key) as SkillsContextWindow)),
      hint: contextWindow === 'auto'
        ? detected !== undefined
          ? t('skills.budget.window.autoDetected')
          : t('skills.budget.window.autoNoAgent', { window: formatWindow(DEFAULT_CONTEXT_WINDOW) })
        : t('skills.budget.window.forced', { window: formatWindow(effectiveWindow) }),
    },
    meters: [
      { label: t('skills.budget.chars'), value: totalChars, max: charBudget, unit: t('skills.budget.unitChars'), locale, tone: 'accent' },
      { label: t('skills.budget.tokens'), value: totalTokens, max: tokenBudget, unit: t('skills.budget.unitTokens'), locale, tone: 'warning' },
    ],
    banners,
    how: {
      label: t('skills.budget.how'),
      notes: [
        { id: 'scope', icon: FileText, title: t('skills.budget.card.scope.title'), body: t('skills.budget.card.scope.body') },
        {
          id: 'formula',
          icon: Calculator,
          title: t('skills.budget.card.formula.title'),
          body: t('skills.budget.card.formula.body', {
            // Formatted, not grouped: the detected window is whatever the model reports,
            // so "1M" reads where "1 048 576" would not.
            context: formatWindow(effectiveWindow),
            percent: `${BUDGET_FRACTION * 100}`,
            chars: n(charBudget),
            tokens: n(tokenBudget),
          }),
        },
        { id: 'cap', icon: Scissors, title: t('skills.budget.card.cap.title', { max: n(MAX_DESC_CHARS) }), body: t('skills.budget.card.cap.body', { max: n(MAX_DESC_CHARS) }) },
        { id: 'overflow', icon: EyeOff, title: t('skills.budget.card.overflow.title'), body: t('skills.budget.card.overflow.body') },
        { id: 'why', icon: SlidersHorizontal, title: t('skills.budget.card.why.title'), body: t('skills.budget.card.why.body') },
        { id: 'override', icon: Info, title: t('skills.budget.card.override.title'), body: t('skills.budget.card.override.body') },
      ],
    },
    breakdown: {
      label: t('skills.budget.details'),
      rows: breakdown.map((entry) => ({
        id: `${entry.source}-${entry.name}`,
        lead: { label: sourceLabel(entry.source, t), color: SOURCE_COLOR[entry.source] },
        name: entry.name,
        ...(entry.truncated ? { tags: [{ label: t('skills.budget.cut'), color: WEIGHT_COLOR.medium }] } : {}),
        detail: t('skills.budget.tok', { count: entry.tokens }),
        verdict: { label: t(WEIGHT_LABELS[entry.weight]), color: WEIGHT_COLOR[entry.weight] },
      })),
    },
  }
}

type LongDescription = { name: string; source: string; wordCount: number; filePath: string }

/**
 * The two warnings, as `NoticeCard`s. Their buttons are DATA — the card draws them, ranks
 * them and paints them in the warning's own orange. Fixing is the point of reading this;
 * opening the files is the way round it.
 */
function buildWarnings(
  duplicates: DuplicateSkillEntry[],
  longDescriptions: LongDescription[],
  onFix: () => void,
  t: Translate,
): (NoticeCardProps & { id: string })[] {
  const notices: (NoticeCardProps & { id: string })[] = []
  if (duplicates.length > 0) {
    notices.push({
      id: 'duplicates',
      variant: 'warning',
      rows: duplicates.map((dup) => ({
        id: dup.name,
        name: dup.name,
        detail: t('skills.duplicates.times', { count: dup.sources.length }),
        tags: dup.sources.map((s) => ({
          label: s.source === 'repo' && s.repoName ? t('skills.source.repoNamed', { name: s.repoName }) : sourceLabel(s.source, t),
          color: SOURCE_COLOR[s.source],
        })),
      })),
      children: t(duplicates.length > 1 ? 'skills.duplicates.other' : 'skills.duplicates.one', { count: duplicates.length }),
    })
  }
  if (longDescriptions.length > 0) {
    const actions: BannerAction[] = [
      {
        label: t('skills.openInVSCode'),
        icon: VSCode,
        onClick: () => longDescriptions.forEach((e) => window.electronAPI.shell.openInVSCode(e.filePath)),
      },
      { label: t('skills.fixWithAgent'), icon: Wand2, onClick: onFix, primary: true },
    ]
    notices.push({
      id: 'long',
      variant: 'warning',
      actions,
      rows: longDescriptions.map((entry) => ({
        id: `${entry.source}-${entry.name}`,
        name: entry.name,
        detail: t('skills.longDesc.words', { count: entry.wordCount }),
      })),
      children: t(longDescriptions.length > 1 ? 'skills.longDesc.other' : 'skills.longDesc.one', { count: longDescriptions.length }),
    })
  }
  return notices
}

/**
 * Where a rail key sends the page. The rail hands back KEYS and knows nothing of routes;
 * this is the one place the two are paired.
 */
function hashForKey(key: string): string {
  if (key.startsWith('skill:')) return `#/skill/${encodeURIComponent(key.slice('skill:'.length))}`
  if (key.startsWith('repo-skill:')) return `#/repo-skill/${encodeURIComponent(key.slice('repo-skill:'.length))}`
  return '#/'
}

function SkillEditor({
  skill,
  isNew,
  onSave,
  onDelete,
  onShare,
}: {
  skill: SkillDetail | null
  isNew: boolean
  onSave: (name: string, content: string, imagePath?: string) => Promise<void>
  onDelete?: () => Promise<void>
  onShare?: (name: string) => Promise<void>
}) {
  const [name, setName] = useState(skill?.name || '')
  const [description, setDescription] = useState(skill?.description || '')
  const [allowedTools, setAllowedTools] = useState(skill?.allowedTools || '')
  const [body, setBody] = useState('')
  const [imagePath, setImagePath] = useState<string | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const t = useT()
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [sharing, setSharing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Initialize body from skill content (strip frontmatter)
  useEffect(() => {
    if (skill?.content) {
      const match = skill.content.match(/^---\n[\s\S]*?\n---\n?(.*)$/s)
      setBody(match ? match[1].trim() : skill.content)
    }
  }, [skill])

  // Load existing image
  useEffect(() => {
    if (skill?.hasImage && skill.dirName) {
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
      setError(t('skills.error.nameRequired'))
      return
    }

    // Validate name: only lowercase letters, numbers, hyphens
    if (!/^[a-z0-9-]+$/.test(name.trim())) {
      setError(t('skills.error.nameFormat'))
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

  const headerTitle = isNew
    ? t('skills.editor.newTitle')
    : t('skills.editor.editTitle', { name: skill?.name ?? '' })

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Header — no back arrow: the rail is always there to navigate from */}
      <div className="flex items-center gap-3">
        <Text size="xl" weight="bold" className="flex-1 capitalize">
          {headerTitle}
        </Text>
        {!isNew && onShare && (
          <Button size="sm" tone="neutral" icon={Share2} busy={sharing} onClick={handleShare}>
            {sharing ? t('skills.editor.sharing') : t('skills.editor.share')}
          </Button>
        )}
      </div>

      {/* A `Banner` and not a red box of its own: it states a fact about the form
          under it, which is the whole of what a banner is for. */}
      {error && (
        <Banner variant="danger" bordered>
          {error}
        </Banner>
      )}

      {/* Form */}
      <div className="flex flex-col gap-4">
        <FormField
          label={t('skills.editor.name')}
          hint={isNew ? t('skills.editor.nameHelp') : undefined}
          input={{ value: name, onChange: setName, disabled: !isNew, placeholder: 'my-skill' }}
        />

        <FormField
          label={t('skills.editor.description')}
          input={{
            multiline: true,
            value: description,
            onChange: setDescription,
            placeholder: t('skills.editor.descriptionPlaceholder'),
            rows: 3,
          }}
        />

        <FormField
          label={t('skills.editor.allowedTools')}
          input={{ value: allowedTools, onChange: setAllowedTools, placeholder: 'Bash(*), Read, Edit, Write, Glob, Grep' }}
        />

        {/* The one field whose control is not a box. `FormField` draws an `Input` from
            data and nothing else, so the label here is its own — a field component that
            also took arbitrary controls would be `SettingRow` with a different layout. */}
        <div>
          <Text size="sm" tone="secondary" className="mb-1.5 block">
            {t('skills.editor.image')}
          </Text>
          <ImageField
            src={imagePreview}
            filename={imagePath?.split('/').pop() ?? null}
            pickLabel={t('skills.editor.upload')}
            changeLabel={t('skills.editor.change')}
            removeLabel={t('common.remove')}
            onPick={handlePickImage}
            onRemove={handleRemoveImage}
          />
        </div>

        <FormField
          label={t('skills.editor.content')}
          // The one field that IS the page, so it is the one allowed to grow.
          input={{
            multiline: true,
            value: body,
            onChange: setBody,
            placeholder: t('skills.editor.contentPlaceholder'),
            rows: 16,
            mono: true,
            resize: 'vertical',
          }}
        />
      </div>

      {/* Actions. `BTN_PRIMARY` and `BTN_DANGER` are gone with them: `Button`'s tones
          say the same thing, and its `busy` spins the mark where the old constants only
          dimmed the whole control. */}
      <div className="flex items-center gap-3 pb-6">
        <Button size="sm" tone="accent" icon={Save} busy={saving} onClick={handleSave}>
          {saving ? t('common.saving') : t('common.save')}
        </Button>

        {!isNew && onDelete && (
          <Button size="sm" tone="danger" icon={Trash2} busy={deleting} onClick={handleDelete}>
            {deleting ? t('skills.editor.deleting') : t('common.remove')}
          </Button>
        )}
      </div>
    </div>
  )
}

export function SkillsPage() {
  const { skills, loading, loadSkills, getSkill, createSkill, updateSkill, deleteSkill, downloadSkill, importSkill, getImage, repoSkills, repoSkillsLoading, loadRepoSkills, getRepoSkill } = useSkills()
  const { launchClaudeTerminal } = useTerminals()
  const { closeModal } = useStore()
  const t = useT()
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

  // Load skill detail when navigating to a skill. Dropped first, on every route
  // change: the rail keeps this page mounted, so without the reset the editor
  // would mount against the previously loaded skill and keep its name and
  // description — the fields seed from props once, at mount.
  useEffect(() => {
    setEditSkill(null)
    if (route.page === 'skill' && route.params.name) {
      getSkill(route.params.name).then(setEditSkill).catch(() => {
        window.location.hash = '#/'
      })
    } else if (route.page === 'repo-skill' && route.params.filePath) {
      getRepoSkill(route.params.filePath).then(setEditSkill).catch(() => {
        window.location.hash = '#/'
      })
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

  const duplicateSkills = useMemo(() => {
    const nameMap = new Map<string, Array<{ source: 'built-in' | 'custom' | 'repo'; repoName?: string }>>()

    for (const s of skills) {
      const key = s.name.toLowerCase()
      if (!nameMap.has(key)) nameMap.set(key, [])
      nameMap.get(key)!.push({ source: s.isBuiltIn ? 'built-in' : 'custom' })
    }

    for (const rs of repoSkills) {
      const key = rs.name.toLowerCase()
      if (!nameMap.has(key)) nameMap.set(key, [])
      nameMap.get(key)!.push({ source: 'repo', repoName: rs.repoName })
    }

    const duplicates: DuplicateSkillEntry[] = []
    for (const [name, sources] of nameMap) {
      if (sources.length > 1) {
        duplicates.push({ name, sources })
      }
    }

    return duplicates
  }, [skills, repoSkills])

  const longDescriptions = useMemo(() => {
    const entries: { name: string; source: string; wordCount: number; filePath: string }[] = []
    for (const s of skills) {
      const wordCount = (s.description || '').split(/\s+/).filter(Boolean).length
      if (wordCount > 110) entries.push({ name: s.name, source: s.isBuiltIn ? 'built-in' : 'custom', wordCount, filePath: `~/.claude/skills/${s.dirName}/SKILL.md` })
    }
    for (const rs of repoSkills) {
      const wordCount = (rs.description || '').split(/\s+/).filter(Boolean).length
      if (wordCount > 110) entries.push({ name: rs.name, source: 'repo', wordCount, filePath: rs.filePath })
    }
    return entries
  }, [skills, repoSkills])

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

  const handleFixLongDescriptions = useCallback(async () => {
    const details = longDescriptions.map((e) => `- ${e.name} (${e.wordCount} words, located in ${e.filePath})`).join('\n')
    const prompt = `Optimize the descriptions of the following skills to be under 110 words each while keeping their meaning and trigger conditions:\n${details}\nRead each skill file, rewrite only the description field in the frontmatter, and save.`
    const terminal = await launchClaudeTerminal(t('skills.fixAgentName'), '~/Documents')
    // Dismiss the Skills overlay so the freshly launched agent is visible.
    closeModal()
    setTimeout(() => {
      window.electronAPI.terminal.write(terminal.id, `${prompt}\r`)
    }, 500)
  }, [longDescriptions, launchClaudeTerminal, closeModal])

  // Which rail row is lit, and what the content pane is showing. The pane is
  // keyed on it so switching skills remounts the editor — its form state is
  // seeded from props, and a reused instance would keep the previous skill's.
  const activeKey = (() => {
    if (route.page === 'new') return 'new'
    if (route.page === 'skill' && route.params.name) return `skill:${route.params.name}`
    if (route.page === 'repo-skill' && route.params.filePath) return `repo-skill:${route.params.filePath}`
    return 'all'
  })()

  // Where each row sits in the rail, so the sweep travels the way the eye does.
  // Built from the very arrays the rail renders, in the order it renders them:
  // All, the built-ins, the custom skills, the draft row, then the repository
  // groups. A key the rail does not know about lands at the top, which is where
  // "All" is — a page reached from outside the rail then sweeps in like a step
  // down the list.
  const railPosition = useMemo(() => {
    const rows = [
      'all',
      ...builtInSkills.map((s) => `skill:${s.dirName}`),
      ...customSkills.map((s) => `skill:${s.dirName}`),
      'new',
      ...Object.values(repoSkillsByRepo).flatMap(({ skills: rSkills }) =>
        rSkills.map((rs) => `repo-skill:${rs.filePath}`)
      ),
    ]
    const positions = new Map(rows.map((key, index) => [key, index]))
    return (key: string) => positions.get(key) ?? 0
  }, [builtInSkills, customSkills, repoSkillsByRepo])

  // A page opens at its top. The pane is the scroll container and survives the
  // switch, so a long skill would otherwise leave the next one scrolled past
  // its own heading.
  const contentScrollRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    contentScrollRef.current?.scrollTo({ top: 0 })
  }, [activeKey])

  const detail = (() => {
    if (route.page === 'new') {
      return <SkillEditor skill={null} isNew onSave={handleCreateSave} />
    }

    // Built-ins and repo skills are not editable from here, so they are not shown
    // as a form: the whole SKILL.md reads as a document instead.
    if ((route.page === 'repo-skill' || route.page === 'skill') && editSkill) {
      if (editSkill.isBuiltIn || editSkill.isRepoSkill) {
        return <SkillDocument skill={editSkill} />
      }

      return (
        <SkillEditor
          skill={editSkill}
          isNew={false}
          onSave={handleUpdateSave}
          onDelete={handleDelete}
          onShare={() => downloadSkill(editSkill.dirName)}
        />
      )
    }

    // The detail is still loading (getSkill resolves a tick after the route).
    return (
      <div className="flex items-center justify-center py-12">
        <Loader variant="spin" size="xl" tone="accent" />
      </div>
    )
  })()

  /**
   * CREATE AND IMPORT, declared ONCE for the two places that offer them.
   *
   * They used to be four hand-built buttons: two beside the section heading and two
   * more inside the empty state, each spelling `px-2.5 py-1.5 text-xs font-medium
   * text-text-secondary bg-surface border border-line-strong rounded-lg` — and the
   * empty state's pair had drifted to `px-3`. `SectionHeader` and `EmptyState` both
   * take their controls as data and draw them at one rung, so this is the list and
   * neither of them decides what a button looks like.
   */
  const newAction = useMemo(
    () => ({ id: 'new', label: t('skills.new'), icon: Plus, onClick: () => { window.location.hash = '#/new' } }),
    [t],
  )
  const importAction = useMemo(
    () => ({ id: 'import', label: t('skills.import'), icon: FolderInput, onClick: handleImport }),
    [t, handleImport],
  )
  // The heading reads import-then-new; the empty state leads with creating, which is
  // what somebody with no skills at all is nearly always there to do.
  const customActions = useMemo(() => [importAction, newAction], [importAction, newAction])
  const emptyActions = useMemo(
    () => [
      { ...newAction, label: t('skills.create') },
      { ...importAction, label: t('skills.importFolder') },
    ],
    [newAction, importAction, t],
  )

  const budget = useSkillBudget(skills, repoSkills)
  const warnings = useMemo(
    () => buildWarnings(duplicateSkills, longDescriptions, handleFixLongDescriptions, t),
    [duplicateSkills, longDescriptions, handleFixLongDescriptions, t],
  )

  const cardFor = (skill: SkillInfo, badge?: boolean): SkillsOverviewCard => ({
    key: skill.dirName,
    name: skill.name,
    description: skill.description,
    imageUrl: imageCache[skill.dirName] ?? null,
    ...(badge ? { badge: { label: t('skills.source.builtIn'), color: SOURCE_COLOR['built-in'] } } : {}),
    onClick: () => { window.location.hash = `#/skill/${encodeURIComponent(skill.dirName)}` },
  })

  // Overview — the "All skills" destination: warnings, budget, and the cards.
  const overview = (
    <SkillsOverview
      loading={loading}
      warnings={{ title: t('skills.warnings'), notices: warnings }}
      {...(skills.length > 0 || repoSkills.length > 0 ? { budget } : {})}
      sections={[
        ...(builtInSkills.length > 0
          ? [{
            id: 'built-in',
            icon: Sparkles,
            title: t('skills.builtIn'),
            hint: t('skills.builtInHelp'),
            cards: builtInSkills.map((skill) => cardFor(skill, true)),
          }]
          : []),
        {
          id: 'custom',
          icon: PenTool,
          title: t('skills.custom'),
          hint: t('skills.customHelp'),
          // The two controls only exist once there is a list to act on: with no custom
          // skills the same two verbs are the empty state's, and offering them twice on
          // one screen is two answers to one question.
          actions: customSkills.length > 0 ? customActions : [],
          cards: customSkills.map((skill) => cardFor(skill)),
          empty: { text: t('skills.customEmpty'), actions: emptyActions },
        },
        {
          id: 'repos',
          icon: GitFork,
          title: t('skills.repos'),
          hint: t('skills.reposHelp'),
          loading: repoSkillsLoading,
          repos: Object.entries(repoSkillsByRepo).map(([repoName, { color, skills: rSkills }]) => ({
            id: repoName,
            name: repoName,
            color: color || REPO_FALLBACK_COLOR,
            cards: rSkills.map((rs) => ({
              key: rs.filePath,
              name: rs.name,
              description: rs.description,
              onClick: () => { window.location.hash = `#/repo-skill/${encodeURIComponent(rs.filePath)}` },
            })),
          })),
          empty: { text: t('skills.reposEmpty') },
        },
      ]}
    />
  )

  const railGroups: SkillsRailGroup[] = [
    ...(builtInSkills.length > 0
      ? [{
        id: 'built-in',
        label: t('skills.builtIn'),
        icon: Sparkles,
        rows: builtInSkills.map((s) => ({ key: `skill:${s.dirName}`, label: s.name, thumb: { src: imageCache[s.dirName] ?? null, alt: s.name } })),
      }]
      : []),
    {
      id: 'custom',
      label: t('skills.custom'),
      icon: PenTool,
      rows: customSkills.map((s) => ({ key: `skill:${s.dirName}`, label: s.name, thumb: { src: imageCache[s.dirName] ?? null, alt: s.name } })),
      empty: t('skills.customEmpty'),
      action: { icon: Plus, title: t('skills.new'), onClick: () => { window.location.hash = '#/new' } },
      ...(activeKey === 'new' ? { draft: t('skills.editor.newTitle') } : {}),
    },
    ...Object.entries(repoSkillsByRepo).map(([repoName, { color, skills: rSkills }]) => ({
      id: `repo:${repoName}`,
      label: repoName,
      repoColor: color || REPO_FALLBACK_COLOR,
      rows: rSkills.map((rs) => ({ key: `repo-skill:${rs.filePath}`, label: rs.name, icon: GitFork })),
    })),
  ]

  return (
    <div className="h-full flex animate-fade-in">
      <SkillsRail
        overviewLabel={t('skills.allSkills')}
        groups={railGroups}
        activeKey={activeKey}
        onSelect={(key) => { window.location.hash = hashForKey(key) }}
        ariaLabel={t('skills.allSkills')}
      />
      <div ref={contentScrollRef} className="flex-1 overflow-y-auto p-6">
        <SweepPane pageKey={activeKey} order={railPosition} scrollRef={contentScrollRef}>
          {activeKey === 'all' ? overview : detail}
        </SweepPane>
      </div>
    </div>
  )
}
