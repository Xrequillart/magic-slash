import { useState } from 'react'
import { Banner, type BannerVariant } from './Banner'
import { BreakdownList, type BreakdownRow } from './BreakdownList'
import { BudgetMeter, type BudgetMeterProps } from './BudgetMeter'
import { ChevronRight, Gauge } from './icons'
import { NoteCard } from './NoteCard'
import { SectionHeader } from './SectionHeader'
import { TabStrip, type TabStripItem } from './TabStrip'
import { Text } from './Text'
import type { IconComponent } from './types'

/**
 * THE SKILLS PAGE'S BUDGET GAUGE: what the skill listing spends of the share of the
 * context window Claude Code gives it, with the window it is scaled to beside it.
 *
 * IT WAS `TokenBudgetGauge` AND `ContextWindowSwitch` IN `pages/Skills/index.tsx`, and
 * only the DRAWING moved. The arithmetic — the 1% of the window, the per-skill cap, which
 * window the running agent reports — is Claude Code's behaviour as the app understands it,
 * so it stays in the app, and what arrives here is its result: two meters, the facts that
 * are true about them, and the six cards that explain them.
 *
 * THE TWO DISCLOSURES ARE THIS FILE'S OWN STATE, collapsed at rest: "how is this
 * computed" is a question you ask once, and the breakdown is forty rows nobody wants on
 * arrival — but both have to be answerable in place.
 */

/** Auto / 200K / 1M, and the sentence under it saying where the number came from. */
export interface SkillBudgetWindow {
  /** The word before the switch. */
  label: string
  items: TabStripItem[]
  activeKey: string
  onSelect?: (key: string) => void
  /**
   * WHERE THE WINDOW CAME FROM, under the switch. `Auto` is a source, not a value, and a
   * gauge scaled to a window nobody typed is a surprise with no explanation on screen.
   */
  hint: string
}

/** A fact about the meters, true for as long as it is true — over budget, cut short. */
export interface SkillBudgetBanner {
  id: string
  variant: BannerVariant
  icon?: IconComponent
  text: string
}

export interface SkillBudgetNote {
  id: string
  icon: IconComponent
  title: string
  body: string
}

export interface SkillBudgetProps {
  title: string
  /** The line under the heading. */
  help: string
  window: SkillBudgetWindow
  /** Characters, then tokens: two in a `grid-cols-2`. */
  meters: BudgetMeterProps[]
  banners?: SkillBudgetBanner[]
  /** The "how is this computed" disclosure and the cards it opens on. */
  how: { label: string; notes: SkillBudgetNote[] }
  /** The per-skill breakdown. Absent, or with no rows, draws no disclosure. */
  breakdown?: { label: string; rows: BreakdownRow[] }
  className?: string
}

export function SkillBudget({ title, help, window, meters, banners = [], how, breakdown, className = '' }: SkillBudgetProps) {
  const [showHow, setShowHow] = useState(false)
  const [showBreakdown, setShowBreakdown] = useState(false)

  return (
    <div className={`flex flex-col gap-3 ${className}`.trim()}>
      {/* `items-start`, not `items-center`: the left column is two lines and the switch is
          two lines, and centring two blocks of unequal height against each other leaves
          neither heading on the same baseline as anything. */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <SectionHeader icon={Gauge} title={title} spacing="none" />
          <Text size="xs" tone="secondary" className="mt-0.5 block opacity-40">
            {help}
          </Text>
        </div>
        {/* A segmented control rather than a select: the reading of every gauge below
            depends on which one is active, so all three stay visible. */}
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          <div className="flex items-center gap-2">
            <Text size="2xs" tone="secondary" className="whitespace-nowrap opacity-60">
              {window.label}
            </Text>
            <TabStrip
              items={window.items}
              activeKey={window.activeKey}
              {...(window.onSelect ? { onSelect: window.onSelect } : {})}
              ariaLabel={window.label}
            />
          </div>
          <Text size="2xs" tone="secondary" className="block text-right opacity-50">
            {window.hint}
          </Text>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {meters.map((meter) => <BudgetMeter key={meter.label} {...meter} />)}
      </div>

      {/* `bordered` because they float in a column rather than banding a card. */}
      {banners.map((banner) => (
        <Banner key={banner.id} variant={banner.variant} {...(banner.icon ? { icon: banner.icon } : {})} bordered>
          {banner.text}
        </Banner>
      ))}

      <div>
        <Disclosure label={how.label} open={showHow} onToggle={() => setShowHow((v) => !v)} />
        {showHow && (
          <div className="mt-2 grid grid-cols-2 gap-2">
            {how.notes.map((note) => (
              <NoteCard key={note.id} icon={note.icon} title={note.title}>{note.body}</NoteCard>
            ))}
          </div>
        )}
      </div>

      {breakdown && breakdown.rows.length > 0 && (
        <div>
          <Disclosure label={breakdown.label} open={showBreakdown} onToggle={() => setShowBreakdown((v) => !v)} />
          {showBreakdown && (
            <div className="mt-2 px-4 py-3 rounded-xl bg-surface-subtle">
              <BreakdownList rows={breakdown.rows} />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function Disclosure({ label, open, onToggle }: { label: string; open: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      className="flex items-center gap-1.5 text-xs text-icon hover:text-text-secondary transition-colors"
    >
      <ChevronRight className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-90' : ''}`} />
      <span>{label}</span>
    </button>
  )
}
