'use client'

import { AlertTriangle, Lightbulb } from 'lucide-react'
import { useT } from '@/lib/i18n/useLanguage'

/**
 * The artwork beside the `Skills page` row: the app's Skills page, reduced to its shape —
 * skills grouped under their project, one of them flagged as heavy, one carrying a tip.
 *
 * DELIBERATELY LIGHT, like the Split View drawing beside it: the sentence is about a
 * page that lists and annotates, so the picture only has to show a list with two kinds of
 * annotation on it. Skeleton bars stand for the descriptions — any real sentence here
 * would be read, and there is nothing to read; the point is the grouping, the warning and
 * the tip.
 *
 * TWO GROUPS, headed by their project in the app's own uppercase `text-[10px]` tracking:
 * the group heading is what "sorted by project" looks like. The warning is the app's own
 * pair — an amber triangle and a token figure — and the tip its lightbulb.
 *
 * `bg-tone-mist`, the palest plate: a dark window on it needs the quietest ground.
 *
 * `aria-hidden`: it is a drawing.
 */
export function SkillsPageMockup() {
  const { t } = useT()

  return (
    <div
      aria-hidden
      className="flex h-full min-h-44 items-center overflow-hidden rounded-xl bg-tone-mist px-6 py-6"
    >
      <div className="flex w-full flex-col gap-3 overflow-hidden rounded-2xl bg-ink px-4 py-4 shadow-lift">
        <Group name="magic-pay">
          <Row name="/magic:start" width="w-3/5" />
          <Row name="/magic:review" width="w-2/5">
            <span className="flex items-center gap-1 rounded bg-orange/15 px-1.5 py-0.5 text-[10px] font-medium text-orange">
              <AlertTriangle className="h-3 w-3" />
              {t('site.skillsCard.heavy')}
            </span>
          </Row>
        </Group>
        <Group name="magic-slash">
          <Row name="/deploy" width="w-1/2">
            <span className="flex items-center gap-1 text-[10px] text-appink">
              <Lightbulb className="h-3 w-3 text-yellow" />
              {t('site.skillsCard.tip')}
            </span>
          </Row>
        </Group>
      </div>
    </div>
  )
}

function Group({ name, children }: { name: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-appink/50">{name}</span>
      {children}
    </div>
  )
}

function Row({ name, width, children }: { name: string; width: string; children?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 rounded-lg bg-white/[0.04] px-2.5 py-1.5">
      <span className="shrink-0 font-mono text-[11px] text-white/90">{name}</span>
      <span className={`h-1.5 ${width} rounded-full bg-white/10`} />
      {children ? <span className="ml-auto shrink-0">{children}</span> : null}
    </div>
  )
}
