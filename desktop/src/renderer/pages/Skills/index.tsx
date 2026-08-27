import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { Plus, Trash2, Save, ImagePlus, X, ChevronRight, Image, Share2, FolderInput, Gauge, Info, AlertTriangle, Sparkles, PenTool, GitFork, Wand2, LayoutGrid, FileText, Calculator, Scissors, EyeOff, SlidersHorizontal, type LucideIcon } from 'lucide-react'
import { useSkills, type SkillInfo, type SkillDetail, type RepoSkillInfo } from '../../hooks/useSkills'
import SkillDocument from './SkillDocument'
import { VSCodeIcon } from '../../components/agent-info-sidebar/icons'
import { SweepPane } from '../../components/SweepPane'
import { useTerminals } from '../../hooks/useTerminals'
import { useStore, type SkillsContextWindow, type SkillsContextWindowSetting } from '../../store'
import { useLocale, useT, type MessageKey, type Translate } from '../../i18n'
import { BTN, BTN_DANGER, BTN_PRIMARY, INPUT } from '../../theme/controls'
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

// One class per slot the switch's highlight can travel to, in the same order as
// the segments below (Auto, then CONTEXT_WINDOWS). Indexed rather than derived
// from a chain of `value === ...` checks, so a slot added or reordered here is
// the only place that has to change. Written as literal classes, not a computed
// `translate-x-[${...}%]`: Tailwind's build-time scan only picks up class names
// that appear verbatim in the source.
const HIGHLIGHT_OFFSETS = ['translate-x-0', 'translate-x-full', 'translate-x-[200%]'] as const

function charBudgetFor(contextWindow: number): number {
  return Math.max(1, Math.floor(contextWindow * CHARS_PER_TOKEN * BUDGET_FRACTION))
}

function BudgetBar({ label, value, max, unit, barColor }: { label: string; value: number; max: number; unit: string; barColor: string }) {
  const percentage = Math.min(Math.round((value / max) * 100), 100)
  // Over budget is not a shade of "nearly full": past the line Claude Code stops
  // listing descriptions, so the bar changes colour rather than just filling up.
  const fill = value > max ? 'bg-red' : barColor
  // A bare toLocaleString() follows the OS locale, which is not the language the
  // app is showing — a French UI on an English machine would group with commas.
  const locale = useLocale()

  return (
    <div className="flex-1 px-4 py-3 rounded-xl bg-surface-subtle border border-line-field">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-text-secondary/60">{label}</span>
        <span className="text-xs font-medium text-text-secondary">
          {value.toLocaleString(locale)} / {max.toLocaleString(locale)} {unit}
        </span>
      </div>
      <div className="w-full h-2 rounded-full bg-surface overflow-hidden">
        <div
          className={`relative h-full rounded-full transition-all duration-300 overflow-hidden ${fill}`}
          style={{ width: `${percentage}%` }}
        >
          <div
            className="absolute inset-y-0 w-[30%] rounded-full"
            style={{
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
              animation: 'shimmer-sweep 5s ease-in-out infinite',
            }}
          />
        </div>
      </div>
      <div className="mt-1.5 text-xs text-text-secondary/40 text-right">{percentage}%</div>
    </div>
  )
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

const weightStyles: Record<string, { className: string; labelKey: MessageKey }> = {
  high: { className: 'bg-red/10 text-red', labelKey: 'skills.weight.high' },
  medium: { className: 'bg-orange/10 text-orange', labelKey: 'skills.weight.medium' },
  low: { className: 'bg-green/10 text-green', labelKey: 'skills.weight.low' },
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

  // One segment per switch position, in the order they are drawn: Auto, then
  // the two forced presets. Auto's label is not a fixed string — it carries
  // the window it resolved to (`Auto · 1M`) once `detected` is known.
  const segments: { value: SkillsContextWindowSetting; label: string }[] = [
    {
      value: 'auto',
      label: detected !== undefined
        ? t('skills.budget.window.autoValue', { window: formatWindow(detected) })
        : t('skills.budget.window.auto'),
    },
    { value: CONTEXT_WINDOWS[0], label: t('skills.budget.window.small') },
    { value: CONTEXT_WINDOWS[1], label: t('skills.budget.window.large') },
  ]
  const activeIndex = Math.max(0, segments.findIndex((segment) => segment.value === value))

  const hint = value === 'auto'
    ? detected !== undefined
      ? t('skills.budget.window.autoDetected')
      : t('skills.budget.window.autoNoAgent', { window: formatWindow(DEFAULT_CONTEXT_WINDOW) })
    : t('skills.budget.window.forced', { window: formatWindow(effectiveWindow) })

  return (
    <div className="flex flex-col items-end gap-1 flex-shrink-0">
      <div className="flex items-center gap-2">
        <span className="text-[11px] text-text-secondary/50 whitespace-nowrap">{t('skills.budget.window.label')}</span>
        <div className="relative grid grid-cols-3 bg-surface rounded-full p-px border border-line-subtle" role="group" aria-label={t('skills.budget.window.label')}>
          <div
            className={`absolute top-px bottom-px left-px w-[calc((100%_-_2px)/3)] bg-surface-strong rounded-full transition-transform duration-200 ${HIGHLIGHT_OFFSETS[activeIndex]}`}
          />
          {segments.map((segment) => (
            <button
              key={String(segment.value)}
              onClick={() => onChange(segment.value)}
              aria-pressed={value === segment.value}
              className={`relative z-10 px-3 py-1 rounded-full text-[11px] font-medium transition-colors duration-200 text-center whitespace-nowrap ${
                value === segment.value ? 'text-ink' : 'text-text-secondary/50 hover:text-text-secondary'
              }`}
            >
              {segment.label}
            </button>
          ))}
        </div>
      </div>
      <p className="text-[10px] text-text-secondary/40 text-right">{hint}</p>
    </div>
  )
}

function InfoCard({ icon: Icon, title, body }: { icon: LucideIcon; title: string; body: string }) {
  return (
    <div className="flex flex-col gap-1.5 px-3 py-2.5 rounded-xl bg-surface-subtle border border-line-subtle">
      <div className="flex items-center gap-1.5">
        <Icon className="w-3.5 h-3.5 text-text-secondary/50 flex-shrink-0" />
        <span className="text-[11px] font-medium text-text-secondary">{title}</span>
      </div>
      <p className="text-[11px] text-text-secondary/40 leading-relaxed">{body}</p>
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
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-sm text-text-secondary">
            <Gauge className="w-4 h-4" />
            <span>{t('skills.budget.section')}</span>
          </div>
          <p className="text-xs text-text-secondary/30 mt-0.5">{t('skills.budget.help')}</p>
        </div>
        <ContextWindowSwitch
          value={contextWindow}
          detected={detected}
          effectiveWindow={effectiveWindow}
          onChange={setContextWindow}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <BudgetBar label={t('skills.budget.chars')} value={totalChars} max={charBudget} unit={t('skills.budget.unitChars')} barColor="bg-accent" />
        <BudgetBar label={t('skills.budget.tokens')} value={totalTokens} max={tokenBudget} unit={t('skills.budget.unitTokens')} barColor="bg-orange" />
      </div>

      {overBudget && (
        <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-red/10 border border-red/20">
          <AlertTriangle className="w-3.5 h-3.5 text-red flex-shrink-0 mt-0.5" />
          <p className="text-[11px] text-red leading-relaxed">
            {t('skills.budget.over', { over: n(totalChars - charBudget) })}
          </p>
        </div>
      )}

      {truncatedCount > 0 && (
        <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-orange/10 border border-orange/20">
          <Scissors className="w-3.5 h-3.5 text-orange flex-shrink-0 mt-0.5" />
          <p className="text-[11px] text-orange leading-relaxed">
            {t(truncatedCount > 1 ? 'skills.budget.truncated.other' : 'skills.budget.truncated.one', {
              count: truncatedCount,
              max: n(MAX_DESC_CHARS),
            })}
          </p>
        </div>
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
            <InfoCard
              icon={FileText}
              title={t('skills.budget.card.scope.title')}
              body={t('skills.budget.card.scope.body')}
            />
            <InfoCard
              icon={Calculator}
              title={t('skills.budget.card.formula.title')}
              body={t('skills.budget.card.formula.body', {
                // Formatted, not grouped: the detected window is whatever the
                // model reports, so "1M" reads where "1 048 576" would not.
                context: formatWindow(effectiveWindow),
                percent: `${BUDGET_FRACTION * 100}`,
                chars: n(charBudget),
                tokens: n(tokenBudget),
              })}
            />
            <InfoCard
              icon={Scissors}
              title={t('skills.budget.card.cap.title', { max: n(MAX_DESC_CHARS) })}
              body={t('skills.budget.card.cap.body', { max: n(MAX_DESC_CHARS) })}
            />
            <InfoCard
              icon={EyeOff}
              title={t('skills.budget.card.overflow.title')}
              body={t('skills.budget.card.overflow.body')}
            />
            <InfoCard
              icon={SlidersHorizontal}
              title={t('skills.budget.card.why.title')}
              body={t('skills.budget.card.why.body')}
            />
            <InfoCard
              icon={Info}
              title={t('skills.budget.card.override.title')}
              body={t('skills.budget.card.override.body')}
            />
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
            <div className="mt-2 px-4 py-3 rounded-xl bg-surface-subtle border border-line-field">
              <div className="flex flex-col gap-1.5">
                {breakdown.map((entry) => {
                  const sourceColor = entry.source === 'built-in' ? 'bg-accent/10 text-accent' : entry.source === 'repo' ? 'bg-blue/10 text-blue' : 'bg-green/10 text-green'
                  const ws = weightStyles[entry.weight]
                  return (
                    <div key={`${entry.source}-${entry.name}`} className="flex items-center gap-2">
                      <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded flex-shrink-0 ${sourceColor}`}>{sourceLabel(entry.source, t)}</span>
                      <span className="text-xs text-ink truncate min-w-0 flex-1 capitalize">{entry.name}</span>
                      {entry.truncated && (
                        <span className="px-1.5 py-0.5 text-[10px] font-medium rounded flex-shrink-0 bg-orange/10 text-orange">
                          {t('skills.budget.cut')}
                        </span>
                      )}
                      <span className="text-[10px] text-text-secondary/50 w-14 text-right flex-shrink-0">{t('skills.budget.tok', { count: entry.tokens })}</span>
                      <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded flex-shrink-0 w-14 text-center ${ws.className}`}>{t(ws.labelKey)}</span>
                    </div>
                  )
                })}
              </div>
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
    <div className="rounded-lg bg-orange/10 border border-orange/20 px-3 py-2.5">
      <div className="flex items-center gap-2 mb-2">
        <AlertTriangle className="w-4 h-4 text-orange flex-shrink-0" />
        <p className="text-xs text-orange">
          {t(duplicates.length > 1 ? 'skills.duplicates.other' : 'skills.duplicates.one', { count: duplicates.length })}
        </p>
      </div>
      <div className="flex flex-col gap-1.5 ml-6">
        {duplicates.map((dup) => (
          <div key={dup.name} className="flex items-center gap-2">
            <span className="text-xs text-ink truncate min-w-0 flex-1 capitalize">{dup.name}</span>
            <span className="text-[10px] text-orange/70 flex-shrink-0">{t('skills.duplicates.times', { count: dup.sources.length })}</span>
            <div className="flex items-center gap-1 flex-shrink-0">
              {dup.sources.map((s, i) => {
                const sourceColor = s.source === 'built-in'
                  ? 'bg-accent/10 text-accent'
                  : s.source === 'repo'
                    ? 'bg-blue/10 text-blue'
                    : 'bg-green/10 text-green'
                const label = s.source === 'repo' && s.repoName
                  ? t('skills.source.repoNamed', { name: s.repoName })
                  : sourceLabel(s.source, t)
                return (
                  <span
                    key={`${s.source}-${s.repoName || ''}-${i}`}
                    className={`px-1.5 py-0.5 text-[10px] font-medium rounded ${sourceColor}`}
                  >
                    {label}
                  </span>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function LongDescriptionsAlert({ longDescriptions, onFix }: { longDescriptions: { name: string; source: string; wordCount: number; filePath: string }[]; onFix: () => void }) {
  const t = useT()
  if (longDescriptions.length === 0) return null

  return (
    <div className="rounded-lg bg-orange/10 border border-orange/20 px-3 py-2.5">
      <div className="flex items-center gap-2 mb-2">
        <AlertTriangle className="w-4 h-4 text-orange flex-shrink-0" />
        <p className="text-xs text-orange">
          {t(longDescriptions.length > 1 ? 'skills.longDesc.other' : 'skills.longDesc.one', { count: longDescriptions.length })}
        </p>
      </div>
      <div className="flex flex-col gap-1.5 ml-6">
        {longDescriptions.map((entry) => (
          <div key={`${entry.source}-${entry.name}`} className="flex items-center gap-2">
            <span className="text-xs text-ink truncate min-w-0 flex-1 capitalize">{entry.name}</span>
            <span className="text-[10px] text-orange/70 flex-shrink-0">{t('skills.longDesc.words', { count: entry.wordCount })}</span>
          </div>
        ))}
      </div>
      <div className="mt-2.5 ml-6 flex justify-end gap-2">
        <button
          onClick={() => longDescriptions.forEach((e) => window.electronAPI.shell.openInVSCode(e.filePath))}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-orange border border-orange/20 rounded-lg hover:bg-orange/10 transition-colors"
        >
          <VSCodeIcon className="w-3.5 h-3.5" />
          {t('skills.openInVSCode')}
        </button>
        <button
          onClick={onFix}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-orange border border-orange/20 rounded-lg hover:bg-orange/10 transition-colors"
        >
          <Wand2 className="w-3.5 h-3.5" />
          {t('skills.fixWithAgent')}
        </button>
      </div>
    </div>
  )
}

function SkillsWarnings({ duplicates, longDescriptions, onFixLongDescriptions }: { duplicates: DuplicateSkillEntry[]; longDescriptions: { name: string; source: string; wordCount: number; filePath: string }[]; onFixLongDescriptions: () => void }) {
  const t = useT()
  if (duplicates.length === 0 && longDescriptions.length === 0) return null

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 text-sm text-text-secondary">
        <AlertTriangle className="w-4 h-4" />
        <span>{t('skills.warnings')}</span>
      </div>
      <DuplicateSkillsAlert duplicates={duplicates} />
      <LongDescriptionsAlert longDescriptions={longDescriptions} onFix={onFixLongDescriptions} />
    </div>
  )
}

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
      className="w-full flex items-center gap-3 px-2 py-2 rounded-xl bg-surface border border-line-strong hover:bg-surface-strong hover:border-line-strong transition-all group"
    >
      {/* Avatar */}
      <div className="w-12 h-12 rounded-lg bg-surface flex items-center justify-center overflow-hidden flex-shrink-0">
        {imageUrl ? (
          <img src={imageUrl} alt={skill.name} className="w-full h-full object-cover" />
        ) : (
          <Image className="w-5 h-5 text-text-secondary" />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0 text-left">
        <div className="flex items-center gap-2">
          <span className="text-base font-semibold text-ink truncate capitalize">{skill.name}</span>
          {badge && (
            <span className={`px-1.5 py-0.5 text-xs font-medium rounded flex-shrink-0 ${badge.className}`}>{badge.label}</span>
          )}
        </div>
        {skill.description && (
          <p className="text-sm text-text-secondary/60 truncate mt-1">{skill.description}</p>
        )}
      </div>

      {/* Arrow */}
      <ChevronRight className="w-4 h-4 text-icon-muted group-hover:text-icon transition-colors flex-shrink-0" />
    </button>
  )
}

/**
 * Permanent left rail: every skill, grouped by origin, so you can move from one
 * to the next without going back to the list first. "All skills" at the top is
 * a destination of its own — the overview with the gauges and the warnings.
 * Mirrors the settings rail: same width, same surface, same active pill.
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
  const activeRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: 'nearest' })
  }, [activeKey])

  const renderRow = (key: string, label: string, hash: string, leading: React.ReactNode) => {
    const isActive = activeKey === key
    return (
      <button
        key={key}
        ref={isActive ? activeRef : undefined}
        onClick={() => onSelect(hash)}
        className={`w-full flex items-center gap-2 text-left px-2.5 py-1.5 mt-0.5 text-sm rounded-lg transition-all ${
          isActive ? 'bg-accent/15 text-ink font-medium' : 'text-text-secondary hover:text-ink hover:bg-surface'
        }`}
      >
        {leading}
        <span className="truncate capitalize">{label}</span>
      </button>
    )
  }

  // `first` rather than a `first:` variant: the repository groups each sit in
  // their own wrapper, so a CSS first-child rule would fire on every one of them
  // and eat the separation instead of only skipping it at the top of the rail.
  const groupHeader = (
    icon: React.ReactNode,
    label: string,
    count: number,
    { action, first }: { action?: React.ReactNode; first?: boolean } = {}
  ) => (
    <div className={`flex items-center gap-1.5 px-2.5 mb-1.5 ${first ? 'mt-3' : 'mt-7'} text-[11px] uppercase tracking-wider text-text-secondary/50`}>
      {icon}
      <span className="truncate">{label}</span>
      <span className="text-text-secondary/30">{count}</span>
      {action && <span className="ml-auto">{action}</span>}
    </div>
  )

  const avatar = (dirName: string, name: string) => {
    const url = imageCache[dirName] ?? null
    return url ? (
      <img src={url} alt={name} className="w-5 h-5 rounded object-cover shrink-0" />
    ) : (
      <span className="w-5 h-5 rounded bg-surface-strong flex items-center justify-center shrink-0">
        <Image className="w-3 h-3 text-icon" />
      </span>
    )
  }

  return (
    <div className="w-56 shrink-0 flex flex-col border-r border-line-field bg-surface-sunken-soft">
      <div className="px-2 pt-3 pb-1 border-b border-line-field">
        <button
          onClick={() => onSelect('#/')}
          className={`w-full flex items-center gap-2 px-2.5 py-1.5 mb-2 text-sm font-medium rounded-lg transition-colors ${
            activeKey === 'all'
              ? 'bg-accent/15 text-ink'
              : 'text-text-secondary hover:bg-surface hover:text-ink'
          }`}
        >
          <LayoutGrid className="w-4 h-4 shrink-0" />
          <span className="truncate">{t('skills.allSkills')}</span>
        </button>
      </div>

      {/* No `space-y` here: its `> * + *` rule outranks a plain `mt-*` class, so
          it would flatten every group header's separation back to 2px. The rows
          carry their own `mt-0.5` instead, and sibling margins collapse — a
          header's `mt-7` wins over the 2px above it. */}
      <nav className="flex-1 overflow-y-auto px-2 pb-3">
        {builtInSkills.length > 0 && (
          <>
            {groupHeader(<Sparkles className="w-3 h-3" />, t('skills.builtIn'), builtInSkills.length, { first: true })}
            {builtInSkills.map((s) =>
              renderRow(`skill:${s.dirName}`, s.name, `#/skill/${encodeURIComponent(s.dirName)}`, avatar(s.dirName, s.name))
            )}
          </>
        )}

        {groupHeader(<PenTool className="w-3 h-3" />, t('skills.custom'), customSkills.length, {
          first: builtInSkills.length === 0,
          action: (
            <button
              onClick={onNew}
              title={t('skills.new')}
              className="p-0.5 rounded text-icon hover:text-ink hover:bg-surface transition-colors"
            >
              <Plus className="w-3 h-3" />
            </button>
          ),
        })}
        {customSkills.length === 0 ? (
          <p className="px-2.5 py-1 text-xs text-text-secondary/40">{t('skills.customEmpty')}</p>
        ) : (
          customSkills.map((s) =>
            renderRow(`skill:${s.dirName}`, s.name, `#/skill/${encodeURIComponent(s.dirName)}`, avatar(s.dirName, s.name))
          )
        )}
        {activeKey === 'new' && (
          <div className="w-full flex items-center gap-2 px-2.5 py-1.5 mt-0.5 text-sm rounded-lg bg-accent/15 text-ink font-medium">
            <Plus className="w-4 h-4 shrink-0" />
            <span className="truncate">{t('skills.editor.newTitle')}</span>
          </div>
        )}

        {Object.entries(repoSkillsByRepo).map(([repoName, { color, skills: rSkills }]) => (
          <div key={repoName}>
            {groupHeader(
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color || '#6B7280' }} />,
              repoName,
              rSkills.length
            )}
            {rSkills.map((rs) =>
              renderRow(
                `repo-skill:${rs.filePath}`,
                rs.name,
                `#/repo-skill/${encodeURIComponent(rs.filePath)}`,
                <GitFork className="w-4 h-4 shrink-0 text-icon-muted" />
              )
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
    <div className="flex flex-col gap-6 max-w-[62rem] w-full">
      {/* Header — no back arrow: the rail is always there to navigate from */}
      <div className="flex items-center gap-3">
        <h2 className="text-xl font-semibold capitalize flex-1">
          {headerTitle}
        </h2>
        {!isNew && onShare && (
          <button
            onClick={handleShare}
            disabled={sharing}
            className={`${BTN} disabled:opacity-50`}
          >
            <Share2 className="w-3.5 h-3.5" />
            {sharing ? t('skills.editor.sharing') : t('skills.editor.share')}
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
          <label className="block text-base font-medium text-text-secondary mb-1.5">{t('skills.editor.name')}</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={!isNew}
            placeholder="my-skill"
            className={`${INPUT} w-full disabled:opacity-50`}
          />
          {isNew && (
            <p className="mt-1 text-xs text-text-secondary/60">{t('skills.editor.nameHelp')}</p>
          )}
        </div>

        {/* Description */}
        <div>
          <label className="block text-base font-medium text-text-secondary mb-1.5">{t('skills.editor.description')}</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t('skills.editor.descriptionPlaceholder')}
            rows={3}
            className={`${INPUT} w-full disabled:opacity-50 resize-none`}
          />
        </div>

        {/* Allowed Tools */}
        <div>
          <label className="block text-base font-medium text-text-secondary mb-1.5">{t('skills.editor.allowedTools')}</label>
          <input
            type="text"
            value={allowedTools}
            onChange={(e) => setAllowedTools(e.target.value)}
            placeholder="Bash(*), Read, Edit, Write, Glob, Grep"
            className={`${INPUT} w-full disabled:opacity-50`}
          />
        </div>

        {/* Image */}
        <div>
          <label className="block text-base font-medium text-text-secondary mb-1.5">{t('skills.editor.image')}</label>
          <div className="flex items-center gap-3">
            {imagePreview ? (
              <div className="relative w-16 h-16 rounded-lg overflow-hidden border border-line">
                <img src={imagePreview} alt="Skill" className="w-full h-full object-cover" />
                <button
                  onClick={handleRemoveImage}
                  className="absolute -top-1 -right-1 w-5 h-5 bg-red rounded-full flex items-center justify-center"
                >
                  <X className="w-3 h-3 text-ink" />
                </button>
              </div>
            ) : imagePath ? (
              <div className="flex items-center gap-2 px-3 py-2 bg-surface border border-line rounded-lg">
                <ImagePlus className="w-4 h-4 text-accent" />
                <span className="text-xs text-text-secondary truncate max-w-[200px]">{imagePath.split('/').pop()}</span>
                <button onClick={handleRemoveImage} className="text-text-secondary hover:text-red">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : null}
            <button
              onClick={handlePickImage}
              className={BTN}
            >
              <ImagePlus className="w-3.5 h-3.5" />
              {imagePreview || imagePath ? t('skills.editor.change') : t('skills.editor.upload')}
            </button>
          </div>
        </div>

        {/* Content (markdown body) */}
        <div>
          <label className="block text-base font-medium text-text-secondary mb-1.5">
            {t('skills.editor.content')}
          </label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={t('skills.editor.contentPlaceholder')}
            rows={16}
            className={`${INPUT} w-full font-mono disabled:opacity-50 resize-y`}
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 pb-6">
        <button
          onClick={handleSave}
          disabled={saving}
          className={`${BTN_PRIMARY} disabled:opacity-50`}
        >
          <Save className="w-3.5 h-3.5" />
          {saving ? t('common.saving') : t('common.save')}
        </button>

        {!isNew && onDelete && (
          <button
            onClick={handleDelete}
            disabled={deleting}
            className={`${BTN_DANGER} disabled:opacity-50`}
          >
            <Trash2 className="w-3.5 h-3.5" />
            {deleting ? t('skills.editor.deleting') : t('common.remove')}
          </button>
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
        <div className="w-6 h-6 border-2 border-line-strong border-t-accent rounded-full animate-spin" />
      </div>
    )
  })()

  // Overview — the "All skills" destination: warnings, budget, and the cards.
  const overview = (
    <div className="flex flex-col gap-10 max-w-[62rem] mx-auto w-full">
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
          <div className="w-6 h-6 border-2 border-line-strong border-t-accent rounded-full animate-spin" />
        </div>
      )}

      {!loading && (
        <>
          {/* Built-in section */}
          {builtInSkills.length > 0 && (
            <div>
              <div className="flex items-center gap-2 text-sm text-text-secondary">
                <Sparkles className="w-4 h-4" />
                <span>{t('skills.builtIn')}</span>
              </div>
              <p className="text-xs text-text-secondary/30 mt-0.5 mb-3">{t('skills.builtInHelp')}</p>
              <div className="grid grid-cols-3 gap-2">
                {builtInSkills.map((skill) => (
                  <SkillCard
                    key={skill.dirName}
                    skill={skill}
                    imageUrl={imageCache[skill.dirName] ?? null}
                    badge={{ label: t('skills.source.builtIn'), className: 'bg-accent/10 text-accent' }}
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
                <div className="flex items-center gap-2 text-sm text-text-secondary">
                  <PenTool className="w-4 h-4" />
                  <span>{t('skills.custom')}</span>
                </div>
                <p className="text-xs text-text-secondary/30 mt-0.5">{t('skills.customHelp')}</p>
              </div>
              {customSkills.length > 0 && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleImport}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-text-secondary bg-surface border border-line-strong rounded-lg hover:bg-surface-strong hover:text-ink transition-all"
                  >
                    <FolderInput className="w-3 h-3" />
                    <span>{t('skills.import')}</span>
                  </button>
                  <button
                    onClick={() => { window.location.hash = '#/new' }}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-text-secondary bg-surface border border-line-strong rounded-lg hover:bg-surface-strong hover:text-ink transition-all"
                  >
                    <Plus className="w-3 h-3" />
                    <span>{t('skills.new')}</span>
                  </button>
                </div>
              )}
            </div>
            {customSkills.length === 0 ? (
              <div className="w-full py-8 border border-dashed border-border/50 rounded-xl">
                <div className="text-sm text-text-secondary/50 mb-3 text-center">{t('skills.customEmpty')}</div>
                <div className="flex items-center justify-center gap-3">
                  <button
                    onClick={() => { window.location.hash = '#/new' }}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-text-secondary bg-surface border border-line-strong rounded-lg hover:bg-surface-strong hover:text-ink transition-all"
                  >
                    <Plus className="w-3 h-3" />
                    <span>{t('skills.create')}</span>
                  </button>
                  <button
                    onClick={handleImport}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-text-secondary bg-surface border border-line-strong rounded-lg hover:bg-surface-strong hover:text-ink transition-all"
                  >
                    <FolderInput className="w-3 h-3" />
                    <span>{t('skills.importFolder')}</span>
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
            <div className="flex items-center gap-2 text-sm text-text-secondary">
              <GitFork className="w-4 h-4" />
              <span>{t('skills.repos')}</span>
            </div>
            <p className="text-xs text-text-secondary/30 mt-0.5 mb-3">{t('skills.reposHelp')}</p>
            {repoSkillsLoading && (
              <div className="flex items-center justify-center py-6">
                <div className="w-5 h-5 border-2 border-line-strong border-t-accent rounded-full animate-spin" />
              </div>
            )}
            {!repoSkillsLoading && Object.keys(repoSkillsByRepo).length === 0 && (
              <p className="text-sm text-text-secondary/40">{t('skills.reposEmpty')}</p>
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
