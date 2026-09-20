import { useState, useEffect, useCallback, useMemo, useRef, type ReactNode } from 'react'
import { Plus, Trash2, Save, ChevronRight, Share2, FolderInput, FolderGit2, Gauge, Info, AlertTriangle, Sparkles, PenTool, GitFork, Wand2, LayoutGrid, FileText, Calculator, Scissors, EyeOff, SlidersHorizontal } from '@ds/desktop/icons'
import { Banner, BreakdownList, BudgetMeter, Button, ButtonIcon, EmptyState, FormField, Icon, ImageField, Label, Loader, MenuSidebarItem, NoteCard, NoticeCard, SectionHeader, SkillCard, TabStrip, Text, type BannerAction, type MenuSidebarItemProps, type TabStripItem } from '@ds/desktop'
import { useSkills, type SkillInfo, type SkillDetail, type RepoSkillInfo } from '../../hooks/useSkills'
import SkillDocument from './SkillDocument'
import { VSCode } from '@ds/desktop/icons'
import { SweepPane } from '../../components/SweepPane'
import { useTerminals } from '../../hooks/useTerminals'
import { useStore, type SkillsContextWindow, type SkillsContextWindowSetting } from '../../store'
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
 * Auto / 200K / 1M. Drawn as a segmented control rather than a select: the
 * reading of every gauge below depends on which one is active, so all three
 * stay visible.
 *
 * `Auto` is not a value, it is a source — so its label carries the window it
 * resolved to (`Auto · 1M`), and a line under the switch says where that number
 * came from. Without it, a gauge scaled to a window nobody typed is a surprise
 * with no explanation on screen.
 *
 * THE PILL IS `TabStrip`'s NOW, and with it went a rail built out of `grid-cols-3`
 * and three hard-coded `translate-x` classes — a highlight that was correct only
 * while there happened to be exactly three segments, and silently wrong the day a
 * fourth window is worth comparing. `TabStrip` MEASURES the active tab instead, so
 * the segments can be any width and any number.
 */
function ContextWindowSwitch({
  value,
  detected,
  effectiveWindow,
  onChange,
}: {
  value: SkillsContextWindowSetting
  /** The window the running agents report, or undefined when none does. */
  detected: number | undefined
  /** What the gauges are actually scaled to, once auto and the fallback resolve. */
  effectiveWindow: number
  onChange: (next: SkillsContextWindowSetting) => void
}) {
  const t = useT()

  // One tab per switch position, in the order they are drawn: Auto, then the two
  // forced presets. Auto's label is not a fixed string — it carries the window it
  // resolved to (`Auto · 1M`) once `detected` is known.
  const items: TabStripItem[] = [
    {
      key: 'auto',
      label: detected !== undefined
        ? t('skills.budget.window.autoValue', { window: formatWindow(detected) })
        : t('skills.budget.window.auto'),
    },
    { key: String(CONTEXT_WINDOWS[0]), label: t('skills.budget.window.small') },
    { key: String(CONTEXT_WINDOWS[1]), label: t('skills.budget.window.large') },
  ]

  const hint = value === 'auto'
    ? detected !== undefined
      ? t('skills.budget.window.autoDetected')
      : t('skills.budget.window.autoNoAgent', { window: formatWindow(DEFAULT_CONTEXT_WINDOW) })
    : t('skills.budget.window.forced', { window: formatWindow(effectiveWindow) })

  return (
    <div className="flex flex-col items-end gap-1 flex-shrink-0">
      <div className="flex items-center gap-2">
        <Text size="2xs" tone="secondary" className="whitespace-nowrap opacity-60">
          {t('skills.budget.window.label')}
        </Text>
        <TabStrip
          items={items}
          activeKey={String(value)}
          // The key comes back as a string because a tab's identity is a string.
          // `auto` is the one non-numeric position, so it is the only branch.
          onSelect={(key) => onChange(key === 'auto' ? 'auto' : (Number(key) as SkillsContextWindow))}
          ariaLabel={t('skills.budget.window.label')}
        />
      </div>
      <Text size="2xs" tone="secondary" className="block text-right opacity-50">
        {hint}
      </Text>
    </div>
  )
}

function TokenBudgetGauge({ skills, repoSkills }: { skills: SkillInfo[]; repoSkills: RepoSkillInfo[] }) {
  const [showBreakdown, setShowBreakdown] = useState(false)
  const [showHow, setShowHow] = useState(false)
  const t = useT()
  const locale = useLocale()
  const contextWindow = useStore((s) => s.skillsContextWindow)
  const setContextWindow = useStore((s) => s.setSkillsContextWindow)

  // One selector, resolved to a primitive inside the store rather than in a
  // useMemo over `terminals`: the terminal array is replaced on every statusline
  // tick (several times a second, per agent), so selecting it would re-render the
  // whole gauge continuously. Selecting the number means a re-render only when
  // the detected window itself moves. The inspected agent is resolved the way the
  // info sidebar does it, so both panels talk about the same agent.
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
      // Only what survives the per-skill cap reaches the model, so only that is
      // billed here.
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

  const overBudget = totalChars > charBudget
  const n = (value: number) => value.toLocaleString(locale)

  return (
    <div className="flex flex-col gap-3">
      {/* `items-start`, not `items-center`: the left column is two lines and the
          switch is two lines, and centring two blocks of unequal height against each
          other leaves neither heading on the same baseline as anything. */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <SectionHeader icon={Gauge} title={t('skills.budget.section')} spacing="none" />
          <Text size="xs" tone="secondary" className="mt-0.5 block opacity-40">
            {t('skills.budget.help')}
          </Text>
        </div>
        <ContextWindowSwitch
          value={contextWindow}
          detected={detected}
          effectiveWindow={effectiveWindow}
          onChange={setContextWindow}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <BudgetMeter label={t('skills.budget.chars')} value={totalChars} max={charBudget} unit={t('skills.budget.unitChars')} locale={locale} tone="accent" />
        <BudgetMeter label={t('skills.budget.tokens')} value={totalTokens} max={tokenBudget} unit={t('skills.budget.unitTokens')} locale={locale} tone="warning" />
      </div>

      {/* Both of these are a `Banner`: a fact about the surface above them, true for
          as long as it is true and gone when it is not. `bordered` because they float
          in a column rather than banding a card — see the prop's own note. */}
      {overBudget && (
        <Banner variant="danger" bordered>
          {t('skills.budget.over', { over: n(totalChars - charBudget) })}
        </Banner>
      )}

      {truncatedCount > 0 && (
        // `Scissors` over the variant's own mark: the warning is about a specific
        // thing that happened to the descriptions, not about severity in general.
        <Banner variant="warning" icon={Scissors} bordered>
          {t(truncatedCount > 1 ? 'skills.budget.truncated.other' : 'skills.budget.truncated.one', {
            count: truncatedCount,
            max: n(MAX_DESC_CHARS),
          })}
        </Banner>
      )}

      {/* How this is computed — collapsed by default, because it answers a
          question you only ask once, but it has to be answerable in place. */}
      <div>
        <button
          onClick={() => setShowHow((v) => !v)}
          className="flex items-center gap-1.5 text-xs text-icon hover:text-text-secondary transition-colors"
        >
          <ChevronRight className={`w-3.5 h-3.5 transition-transform ${showHow ? 'rotate-90' : ''}`} />
          <span>{t('skills.budget.how')}</span>
        </button>
        {showHow && (
          <div className="mt-2 grid grid-cols-2 gap-2">
            <NoteCard icon={FileText} title={t('skills.budget.card.scope.title')}>
              {t('skills.budget.card.scope.body')}
            </NoteCard>
            <NoteCard icon={Calculator} title={t('skills.budget.card.formula.title')}>
              {t('skills.budget.card.formula.body', {
                // Formatted, not grouped: the detected window is whatever the
                // model reports, so "1M" reads where "1 048 576" would not.
                context: formatWindow(effectiveWindow),
                percent: `${BUDGET_FRACTION * 100}`,
                chars: n(charBudget),
                tokens: n(tokenBudget),
              })}
            </NoteCard>
            <NoteCard icon={Scissors} title={t('skills.budget.card.cap.title', { max: n(MAX_DESC_CHARS) })}>
              {t('skills.budget.card.cap.body', { max: n(MAX_DESC_CHARS) })}
            </NoteCard>
            <NoteCard icon={EyeOff} title={t('skills.budget.card.overflow.title')}>
              {t('skills.budget.card.overflow.body')}
            </NoteCard>
            <NoteCard icon={SlidersHorizontal} title={t('skills.budget.card.why.title')}>
              {t('skills.budget.card.why.body')}
            </NoteCard>
            <NoteCard icon={Info} title={t('skills.budget.card.override.title')}>
              {t('skills.budget.card.override.body')}
            </NoteCard>
          </div>
        )}
      </div>

      {/* Breakdown toggle */}
      {breakdown.length > 0 && (
        <div>
          <button
            onClick={() => setShowBreakdown((v) => !v)}
            className="flex items-center gap-1.5 text-xs text-icon hover:text-text-secondary transition-colors"
          >
            <ChevronRight className={`w-3.5 h-3.5 transition-transform ${showBreakdown ? 'rotate-90' : ''}`} />
            <span>{t('skills.budget.details')}</span>
          </button>
          {showBreakdown && (
            <div className="mt-2 px-4 py-3 rounded-xl bg-surface-subtle">
              <BreakdownList
                rows={breakdown.map((entry) => ({
                  id: `${entry.source}-${entry.name}`,
                  lead: { label: sourceLabel(entry.source, t), color: SOURCE_COLOR[entry.source] },
                  name: entry.name,
                  tags: entry.truncated ? [{ label: t('skills.budget.cut'), color: WEIGHT_COLOR.medium }] : undefined,
                  detail: t('skills.budget.tok', { count: entry.tokens }),
                  verdict: { label: t(WEIGHT_LABELS[entry.weight]), color: WEIGHT_COLOR[entry.weight] },
                }))}
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function DuplicateSkillsAlert({ duplicates }: { duplicates: DuplicateSkillEntry[] }) {
  const t = useT()
  if (duplicates.length === 0) return null

  return (
    <NoticeCard
      variant="warning"
      rows={duplicates.map((dup) => ({
        id: dup.name,
        name: dup.name,
        detail: t('skills.duplicates.times', { count: dup.sources.length }),
        tags: dup.sources.map((s) => ({
          label: s.source === 'repo' && s.repoName ? t('skills.source.repoNamed', { name: s.repoName }) : sourceLabel(s.source, t),
          color: SOURCE_COLOR[s.source],
        })),
      }))}
    >
      {t(duplicates.length > 1 ? 'skills.duplicates.other' : 'skills.duplicates.one', { count: duplicates.length })}
    </NoticeCard>
  )
}

function LongDescriptionsAlert({ longDescriptions, onFix }: { longDescriptions: { name: string; source: string; wordCount: number; filePath: string }[]; onFix: () => void }) {
  const t = useT()

  /* The two buttons as DATA — the banner draws them, ranks them and paints them in the
     warning's own orange, which is what the pair of hand-rolled `text-orange border
     border-orange/20` buttons under the list were each spelling for themselves. Fixing
     is the point of reading this; opening the files is the way round it. */
  const actions = useMemo<BannerAction[]>(
    () => [
      {
        label: t('skills.openInVSCode'),
        icon: VSCode,
        onClick: () => longDescriptions.forEach((e) => window.electronAPI.shell.openInVSCode(e.filePath)),
      },
      { label: t('skills.fixWithAgent'), icon: Wand2, onClick: onFix, primary: true },
    ],
    [t, longDescriptions, onFix],
  )

  if (longDescriptions.length === 0) return null

  return (
    <NoticeCard
      variant="warning"
      actions={actions}
      rows={longDescriptions.map((entry) => ({
        id: `${entry.source}-${entry.name}`,
        name: entry.name,
        detail: t('skills.longDesc.words', { count: entry.wordCount }),
      }))}
    >
      {t(longDescriptions.length > 1 ? 'skills.longDesc.other' : 'skills.longDesc.one', { count: longDescriptions.length })}
    </NoticeCard>
  )
}

function SkillsWarnings({ duplicates, longDescriptions, onFixLongDescriptions }: { duplicates: DuplicateSkillEntry[]; longDescriptions: { name: string; source: string; wordCount: number; filePath: string }[]; onFixLongDescriptions: () => void }) {
  const t = useT()
  if (duplicates.length === 0 && longDescriptions.length === 0) return null

  return (
    <div className="flex flex-col gap-3">
      {/* `spacing="none"` — the column above already spaces its children with a `gap`,
          and a heading that also carried a margin would be two places to adjust. */}
      <SectionHeader icon={AlertTriangle} title={t('skills.warnings')} spacing="none" />
      <DuplicateSkillsAlert duplicates={duplicates} />
      <LongDescriptionsAlert longDescriptions={longDescriptions} onFix={onFixLongDescriptions} />
    </div>
  )
}

/**
 * Permanent left rail: every skill, grouped by origin, so you can move from one
 * to the next without going back to the list first. "All skills" at the top is
 * a destination of its own — the overview with the gauges and the warnings.
 *
 * EVERY ROW IS A `MenuSidebarItem` NOW, which is the component the app's own sidebar
 * is built from — and the one whose notes said it would grow an active state "the day
 * the sidebar navigates rather than overlays". This rail is that day, so the pill that
 * was spelled here by hand is the component's.
 *
 * A REPOSITORY IS A `Label`. It was a bare 8px disc beside a word, which is a colour
 * with nothing to say it is a name; `Label` in the repo's own hue IS that object, and
 * the listing on the right now draws the same one.
 */
function SkillsRail({
  builtInSkills,
  customSkills,
  repoSkillsByRepo,
  imageCache,
  activeKey,
  onSelect,
  onNew,
}: {
  builtInSkills: SkillInfo[]
  customSkills: SkillInfo[]
  repoSkillsByRepo: Record<string, { color?: string; skills: RepoSkillInfo[] }>
  imageCache: Record<string, string | null>
  activeKey: string
  onSelect: (hash: string) => void
  onNew: () => void
}) {
  const t = useT()
  // The active row can sit far down a long rail — a skill opened from the list
  // would otherwise be selected off-screen.
  const activeRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: 'nearest' })
  }, [activeKey])

  /**
   * One row. Wrapped in a `div` ONLY to carry the scroll ref: `MenuSidebarItem`
   * forwards no ref, and a component that did would be a component whose caller can
   * reach into its DOM. The wrapper costs nothing — it is `display: block` around a
   * full-width button.
   */
  const row = (key: string, label: string, hash: string, mark: Partial<MenuSidebarItemProps>) => {
    const isActive = activeKey === key
    return (
      <div key={key} ref={isActive ? activeRef : undefined}>
        <MenuSidebarItem
          label={label}
          active={isActive}
          onClick={() => onSelect(hash)}
          className="capitalize"
          {...mark}
        />
      </div>
    )
  }

  /**
   * A group heading. `first` rather than a `first:` variant: the repository groups each
   * sit in their own wrapper, so a CSS first-child rule would fire on every one of them
   * and eat the separation instead of only skipping it at the top of the rail.
   *
   * NOT A `SectionHeader`. That heading is 14px beside a 16px glyph, which is the scale
   * of a heading over a PAGE's section; this is the quiet 11px caps of a rail, under
   * which the rows are the content. Two different rungs, and the rail's is the one that
   * keeps 40 rows readable in 224px.
   */
  const groupHeader = (
    mark: ReactNode,
    label: string,
    count: number,
    { action, first }: { action?: ReactNode; first?: boolean } = {}
  ) => (
    <div className={`flex items-center gap-1.5 px-2.5 mb-1.5 ${first ? 'mt-3' : 'mt-7'} text-text-secondary/50`}>
      {mark}
      <Text size="2xs" tone="inherit" className="truncate uppercase tracking-wider">
        {label}
      </Text>
      <Text size="2xs" tone="inherit" className="flex-shrink-0 opacity-60">
        {String(count)}
      </Text>
      {action && <span className="ml-auto flex items-center">{action}</span>}
    </div>
  )

  const thumb = (dirName: string, name: string) => ({
    thumb: { src: imageCache[dirName] ?? null, alt: name },
  })

  return (
    <div className="w-56 shrink-0 flex flex-col border-r border-line-field bg-surface-sunken-soft">
      <div className="px-2 pt-3 pb-1 border-b border-line-field">
        <MenuSidebarItem
          label={t('skills.allSkills')}
          icon={LayoutGrid}
          active={activeKey === 'all'}
          onClick={() => onSelect('#/')}
          className="mb-2"
        />
      </div>

      {/* No `space-y` here: its `> * + *` rule outranks a plain `mt-*` class, so
          it would flatten every group header's separation back to 2px. */}
      <nav className="flex-1 overflow-y-auto px-2 pb-3" aria-label={t('skills.allSkills')}>
        {builtInSkills.length > 0 && (
          <>
            {groupHeader(<Icon glyph={Sparkles} size="2xs" tone="inherit" />, t('skills.builtIn'), builtInSkills.length, { first: true })}
            {builtInSkills.map((s) =>
              row(`skill:${s.dirName}`, s.name, `#/skill/${encodeURIComponent(s.dirName)}`, thumb(s.dirName, s.name))
            )}
          </>
        )}

        {groupHeader(<Icon glyph={PenTool} size="2xs" tone="inherit" />, t('skills.custom'), customSkills.length, {
          first: builtInSkills.length === 0,
          /* `neutral` and not `ghost`: `ghost` has NO PLATE AT REST and is for a button
             nested inside something that already has one — see its note. A group header
             is bare ground, where a plateless control is a control with nothing to say
             it is one until the pointer arrives.

             `sm` — 24px. The rung note calls the three above `2xs` "what a control
             standing in a row should be", and this one stands in a row: it is the only
             thing in the rail somebody comes looking for rather than reads past. It is
             taller than the 10px caps beside it, which is what `items-center` on the
             header is for — the word sits against the middle of the button rather than
             the button hanging off the text's baseline. */
          action: <ButtonIcon icon={Plus} title={t('skills.new')} size="sm" tone="neutral" onClick={onNew} />,
        })}
        {customSkills.length === 0 ? (
          <Text size="xs" tone="secondary" className="block px-2.5 py-1 opacity-40">
            {t('skills.customEmpty')}
          </Text>
        ) : (
          customSkills.map((s) =>
            row(`skill:${s.dirName}`, s.name, `#/skill/${encodeURIComponent(s.dirName)}`, thumb(s.dirName, s.name))
          )
        )}
        {/* The skill being written has no route to go to yet, so it is a row that
            reports rather than navigates — `MenuSidebarItem` with a no-op click would
            be a control that lies about being one. */}
        {activeKey === 'new' && (
          <div className="w-full flex items-center gap-2 px-2 py-2 rounded-lg bg-accent/15 text-ink text-xs font-medium">
            <Icon glyph={Plus} tone="inherit" className="flex-shrink-0" />
            <Text tone="inherit" className="truncate">{t('skills.editor.newTitle')}</Text>
          </div>
        )}

        {Object.entries(repoSkillsByRepo).map(([repoName, { color, skills: rSkills }]) => (
          <div key={repoName}>
            {/* The repository IS the heading here: a `Label` in its own hue carries the
                name, so the row needs no separate word beside it. */}
            <div className="flex items-center gap-1.5 px-2.5 mb-1.5 mt-7 text-text-secondary/50">
              <Label size="xs" icon={FolderGit2} color={color || REPO_FALLBACK_COLOR} truncate title={repoName}>
                {repoName}
              </Label>
              <Text size="2xs" tone="inherit" className="flex-shrink-0 opacity-60">
                {String(rSkills.length)}
              </Text>
            </div>
            {rSkills.map((rs) =>
              row(`repo-skill:${rs.filePath}`, rs.name, `#/repo-skill/${encodeURIComponent(rs.filePath)}`, { icon: GitFork })
            )}
          </div>
        ))}
      </nav>
    </div>
  )
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

  // Overview — the "All skills" destination: warnings, budget, and the cards.
  const overview = (
    <div className="flex flex-col gap-10 w-full">
      {/* Warnings */}
      {!loading && (
        <SkillsWarnings duplicates={duplicateSkills} longDescriptions={longDescriptions} onFixLongDescriptions={handleFixLongDescriptions} />
      )}

      {/* Token Budget Gauge */}
      {!loading && (skills.length > 0 || repoSkills.length > 0) && (
        <TokenBudgetGauge skills={skills} repoSkills={repoSkills} />
      )}

      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader variant="spin" size="xl" tone="accent" />
        </div>
      )}

      {!loading && (
        <>
          {/* Built-in section */}
          {builtInSkills.length > 0 && (
            <div>
              <SectionHeader
                icon={Sparkles}
                title={t('skills.builtIn')}
                hint={t('skills.builtInHelp')}
                className="mb-3"
                spacing="none"
              />
              <div className="grid grid-cols-3 gap-2">
                {builtInSkills.map((skill) => (
                  <SkillCard
                    key={skill.dirName}
                    name={skill.name}
                    description={skill.description}
                    imageUrl={imageCache[skill.dirName] ?? null}
                    badge={{ label: t('skills.source.builtIn'), color: SOURCE_COLOR['built-in'] }}
                    onClick={() => { window.location.hash = `#/skill/${encodeURIComponent(skill.dirName)}` }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Custom section */}
          <div>
            {/* The two controls only exist once there is a list to act on: with no
                custom skills the same two verbs are the `EmptyState`'s, and offering
                them twice on one screen is two answers to one question. */}
            <SectionHeader
              icon={PenTool}
              title={t('skills.custom')}
              hint={t('skills.customHelp')}
              actions={customSkills.length > 0 ? customActions : []}
              className="mb-3"
              spacing="none"
            />
            {customSkills.length === 0 ? (
              <EmptyState actions={emptyActions}>{t('skills.customEmpty')}</EmptyState>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {customSkills.map((skill) => (
                  <SkillCard
                    key={skill.dirName}
                    name={skill.name}
                    description={skill.description}
                    imageUrl={imageCache[skill.dirName] ?? null}
                    onClick={() => { window.location.hash = `#/skill/${encodeURIComponent(skill.dirName)}` }}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Repository Skills section */}
          <div>
            <SectionHeader
              icon={GitFork}
              title={t('skills.repos')}
              hint={t('skills.reposHelp')}
              className="mb-3"
              spacing="none"
            />
            {repoSkillsLoading && (
              <div className="flex items-center justify-center py-6">
                <Loader variant="spin" size="lg" tone="accent" />
              </div>
            )}
            {!repoSkillsLoading && Object.keys(repoSkillsByRepo).length === 0 && (
              <EmptyState>{t('skills.reposEmpty')}</EmptyState>
            )}
            {!repoSkillsLoading && Object.entries(repoSkillsByRepo).map(([repoName, { color, skills: rSkills }]) => (
              <div key={repoName} className="mb-4">
                {/* THE REPOSITORY IS A `Label` — a name on a plate in its own hue, which
                    is what a repo has instead of a glyph. It was a bare disc beside a
                    word: a colour with nothing to say it was a name. The rail draws the
                    same object one rung smaller. */}
                <div className="mb-2 flex items-center gap-2">
                  <Label size="sm" icon={FolderGit2} color={color || REPO_FALLBACK_COLOR} truncate title={repoName}>
                    {repoName}
                  </Label>
                  <Text size="xs" tone="secondary" className="flex-shrink-0 opacity-40">
                    {String(rSkills.length)}
                  </Text>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {rSkills.map((rs) => (
                    <SkillCard
                      key={rs.filePath}
                      name={rs.name}
                      description={rs.description}
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

  return (
    <div className="h-full flex animate-fade-in">
      <SkillsRail
        builtInSkills={builtInSkills}
        customSkills={customSkills}
        repoSkillsByRepo={repoSkillsByRepo}
        imageCache={imageCache}
        activeKey={activeKey}
        onSelect={(hash) => { window.location.hash = hash }}
        onNew={() => { window.location.hash = '#/new' }}
      />
      <div ref={contentScrollRef} className="flex-1 overflow-y-auto p-6">
        <SweepPane pageKey={activeKey} order={railPosition} scrollRef={contentScrollRef}>
          {activeKey === 'all' ? overview : detail}
        </SweepPane>
      </div>
    </div>
  )
}
