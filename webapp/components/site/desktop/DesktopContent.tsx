'use client'

import { DesktopHero } from './DesktopHero'
import { TasksBand } from './TasksBand'
import { AgentsBand } from './AgentsBand'
import { SidebarScrollBand } from './SidebarScrollBand'
import { AroundBand } from './AroundBand'
import { GuardrailsBand } from './GuardrailsBand'

/**
 * magic-slash.io/desktop — the app, in six bands.
 *
 * THIS FILE WAS THE HERO, and the hero is now `DesktopHero.tsx`, unchanged: the pain in
 * a struck-through headline, the grey pile against the app's window, four highlights. It
 * shipped alone for a few rounds, and its own note said what it still owed — what the
 * split view is for, how the app keeps several agents apart, the info sidebar, the checks
 * the first launch makes. The five bands under it are those debts, paid in this order:
 *
 *   • `TasksBand` — WHERE AN AGENT COMES FROM: the backlog window, a ticket one click
 *     from an agent. Copy first, the window full width under it.
 *   • `AgentsBand` — HOW SEVERAL ARE KEPT APART: the agent list magnified, one worktree
 *     and one terminal each. A split, drawing on the left, no legend.
 *   • `SidebarScrollBand` — WHAT THE APP KNOWS ABOUT EACH: the info panel, whole and
 *     sticky on the right, panning and zooming to whichever card the paragraph on the
 *     left is about, the status pill walking from "in progress" to "merged" on the way.
 *   • `AroundBand` — WHAT SITS AROUND THE WINDOW: split view, Spotlight, notifications,
 *     the menu bar. A dark band, an icon and a title per row, no drawings.
 *   • `GuardrailsBand` — WHAT IT CHECKS AND WHAT IT ASKS: the first-launch setup, the
 *     permission modes, the usage limits, the keyboard. A legend, and the one link out
 *     to `/features`.
 *
 * THE SECOND ROUND. The bands shipped once as three splits, a grid of showcase cards and
 * a legend, and the product owner reworked the page on seeing it: no blue eyebrow on any
 * band, the Tasks window under its copy rather than beside it ("trop large"), no legend
 * under the agents, the sidebar band rebuilt entirely around a sticky panel and the
 * reader's scroll, and the "around the window" band on black without its cards. The hero
 * gained its entrance in the same round — the grey windows one by one, then the two
 * questions, then the app's window once the pile is complete (`DesktopHero.tsx`).
 *
 * NOTHING BELOW THE HERO IS DRAWN FOR THIS PAGE. Every card is a `/features` row, read
 * out of `lib/features.ts` by `lib/desktopPage.ts`; the drawings are that page's
 * (`components/site/features/`), and the info panel is the one the homepage's window
 * carries (`features/InfoSidebarMockup.tsx`). The arrangements are the design system's
 * own (`SplitFeature`, `FeaturePoints`, `FeatureLegend`, `HomeHeading`). What this page
 * adds is the argument between them — `site.desktopPage.*` — and the order.
 */
export function DesktopContent() {
  return (
    <>
      <DesktopHero />
      <TasksBand />
      <AgentsBand />
      <SidebarScrollBand />
      <AroundBand />
      <GuardrailsBand />
    </>
  )
}
