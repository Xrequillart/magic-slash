import { EmptyState, type EmptyStateAction } from './EmptyState'
import { AlertTriangle, FolderGit2 } from './icons'
import { Label } from './Label'
import { Loader } from './Loader'
import { NoticeCard, type NoticeCardProps } from './NoticeCard'
import { SectionHeader, type SectionHeaderAction } from './SectionHeader'
import { SkillBudget, type SkillBudgetProps } from './SkillBudget'
import { SkillCard, type SkillCardProps } from './SkillCard'
import { Text } from './Text'
import type { IconComponent } from './types'

/**
 * THE SKILLS PAGE'S "ALL SKILLS" DESTINATION: what is wrong, what the listing costs, and
 * every skill as a card — three sections, built-in, yours, your repositories'.
 *
 * IT WAS THE `overview` CONSTANT IN `pages/Skills/index.tsx`, moved for `SkillsRail`'s
 * reason: the site draws this window, and both now render this file. Like `TaskBoard`, it
 * owns the column, the gaps and the order of the bands, and nothing of what they MEAN —
 * which skill is built in, what a duplicate is, how the budget is computed all arrive as
 * data already worked out.
 */

/** One card in a section. `key` is React's; the rest is `SkillCard`'s. */
export type SkillsOverviewCard = SkillCardProps & { key: string }

/**
 * A repository's cards, under its name on a plate in its own hue — the object the rail
 * draws one rung smaller.
 */
export interface SkillsOverviewRepo {
  id: string
  name: string
  /** A CSS value. */
  color: string
  cards: SkillsOverviewCard[]
}

export interface SkillSectionProps {
  id: string
  icon: IconComponent
  title: string
  hint?: string
  actions?: SectionHeaderAction[]
  /** The cards, three to a row. */
  cards?: SkillsOverviewCard[]
  /** OR one block per repository — the repositories section. */
  repos?: SkillsOverviewRepo[]
  /** A read is in flight: a spinner instead of the cards. */
  loading?: boolean
  /** Drawn when there is nothing to show — no cards and no repositories. */
  empty?: { text: string; actions?: EmptyStateAction[] }
}

export interface SkillsOverviewProps {
  /** The heading over the warnings, and the warnings. No notices draws no band. */
  warnings?: { title: string; notices: (NoticeCardProps & { id: string })[] }
  budget?: SkillBudgetProps
  sections: SkillSectionProps[]
  /** The whole page is still loading: one spinner, and nothing else. */
  loading?: boolean
  className?: string
}

export function SkillsOverview({ warnings, budget, sections, loading, className = '' }: SkillsOverviewProps) {
  return (
    <div className={`flex flex-col gap-10 w-full ${className}`.trim()}>
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader variant="spin" size="xl" tone="accent" />
        </div>
      ) : (
        <>
          {warnings && warnings.notices.length > 0 && (
            <div className="flex flex-col gap-3">
              <SectionHeader icon={AlertTriangle} title={warnings.title} spacing="none" />
              {warnings.notices.map(({ id, ...notice }) => <NoticeCard key={id} {...notice} />)}
            </div>
          )}
          {budget && <SkillBudget {...budget} />}
          {sections.map(({ id, ...section }) => <SkillSection key={id} id={id} {...section} />)}
        </>
      )}
    </div>
  )
}

/** A heading, and the cards under it. Exported for a page that needs one on its own. */
export function SkillSection({ icon, title, hint, actions, cards = [], repos = [], loading, empty }: SkillSectionProps) {
  const isEmpty = cards.length === 0 && repos.length === 0

  return (
    <div>
      <SectionHeader
        icon={icon}
        title={title}
        {...(hint ? { hint } : {})}
        {...(actions ? { actions } : {})}
        className="mb-3"
        spacing="none"
      />
      {loading ? (
        <div className="flex items-center justify-center py-6">
          <Loader variant="spin" size="lg" tone="accent" />
        </div>
      ) : isEmpty ? (
        empty && <EmptyState {...(empty.actions ? { actions: empty.actions } : {})}>{empty.text}</EmptyState>
      ) : (
        <>
          {cards.length > 0 && <CardGrid cards={cards} />}
          {repos.map((repo) => (
            <div key={repo.id} className="mb-4">
              <div className="mb-2 flex items-center gap-2">
                <Label size="sm" icon={FolderGit2} color={repo.color} truncate title={repo.name}>
                  {repo.name}
                </Label>
                <Text size="xs" tone="secondary" className="flex-shrink-0 opacity-40">
                  {String(repo.cards.length)}
                </Text>
              </div>
              <CardGrid cards={repo.cards} />
            </div>
          ))}
        </>
      )}
    </div>
  )
}

function CardGrid({ cards }: { cards: SkillsOverviewCard[] }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {cards.map(({ key, ...card }) => <SkillCard key={key} {...card} />)}
    </div>
  )
}
