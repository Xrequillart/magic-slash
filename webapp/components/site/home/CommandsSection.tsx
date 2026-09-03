'use client'

import {
  ArrowRight,
  CheckCircle,
  GitCommit,
  GitPullRequest,
  NotebookPen,
  Play,
  Rocket,
  ScanSearch,
  Wrench,
  type LucideIcon,
} from 'lucide-react'
import { ButtonLink, Card } from '@/components/ui'
import { MAGIC_COMMANDS, type MagicCommandIcon, type MagicCommandId } from '@/lib/commands'
import type { MessageKey } from '@/lib/i18n'
import { useT } from '@/lib/i18n/useLanguage'
import { RichText } from '../RichText'
import { HomeHeading, HomeSection } from './Shell'

/**
 * The eight commands, in cycle order.
 *
 * The list — ids, order, icons — is `lib/commands.ts`, which has ZERO imports so the
 * root test suite can read it (see the note on that file, and `commands.test.ts`). Which
 * is why the icon arrives here as a STRING and is resolved through the map below: typing
 * it as a `LucideIcon` over there would have pulled `lucide-react` into a module a test
 * has to import on the root `node_modules`.
 *
 * The two maps are the price of that, and they are the right place for it — both of them
 * are about RENDERING, and both sit next to the markup that does it.
 *
 * BOTH ARE EXHAUSTIVE, which is what makes the split safe rather than merely tidy: they
 * are keyed by the two string-literal unions `lib/commands.ts` exports, so a ninth
 * command or a renamed icon is a compile error HERE — at the map that forgot the row —
 * instead of a tile that renders an empty paragraph or no glyph. That is also why
 * neither lookup needs a runtime fallback.
 *
 * `id="commands"` is linked from the footer and from the features grid, where the "Eight
 * commands" tile has no detail page of its own and points here instead of at a 404.
 */

/** Lucide name → component, for the strings in `MAGIC_COMMANDS`. */
const ICONS: Record<MagicCommandIcon, LucideIcon> = {
  NotebookPen,
  Rocket,
  Play,
  GitCommit,
  GitPullRequest,
  ScanSearch,
  Wrench,
  CheckCircle,
}

/**
 * Command id → its one-line description. Written out rather than interpolated:
 * `MessageKey` is a typed union, so a template string would need a cast and a missing
 * key would become a blank on screen instead of a `tsc` error.
 */
const DESCRIPTIONS: Record<MagicCommandId, MessageKey> = {
  plan: 'site.commands.plan',
  start: 'site.commands.start',
  continue: 'site.commands.continue',
  commit: 'site.commands.commit',
  pr: 'site.commands.pr',
  review: 'site.commands.review',
  resolve: 'site.commands.resolve',
  done: 'site.commands.done',
}

export function CommandsSection() {
  const { t } = useT()

  return (
    <HomeSection id="commands">
      <HomeHeading eyebrow="/magic:" title={t('site.how.commandsTitle')} />
      <RichText
        k="site.commands.subtitle"
        as="p"
        className="mt-4 max-w-2xl text-base leading-relaxed text-muted"
      />

      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {MAGIC_COMMANDS.map((command) => {
          const Icon = ICONS[command.icon]
          return (
            <Card key={command.id} className="flex flex-col p-5">
              {/* `accent`, not `brand`. The token table reserves `brand` for the primary
                  CTA fill and gives every tint, focus ring and prose colour to `accent` —
                  and an icon plate behind a glyph is decoration, not something you press.
                  Same split as `FeatureCard`'s tile. */}
              <span className="flex h-9 w-9 items-center justify-center rounded-button bg-accent/10">
                <Icon className="h-4 w-4 text-accent" aria-hidden />
              </span>
              <code className="mt-4 font-mono text-xs font-medium text-ink">
                {command.command}
              </code>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                {t(DESCRIPTIONS[command.id])}
              </p>
            </Card>
          )
        })}
      </div>

      <div className="mt-8">
        <ButtonLink href="/documentation#skills" variant="secondary" icon={ArrowRight}>
          {t('site.how.seeDocs')}
        </ButtonLink>
      </div>
    </HomeSection>
  )
}
