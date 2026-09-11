import type { Metadata } from 'next'
import { HeroSection } from '@/components/site/home/HeroSection'
import { PillarsSection } from '@/components/site/home/PillarsSection'
import { WorkflowSection } from '@/components/site/home/WorkflowSection'
import { SkillsSection } from '@/components/site/home/SkillsSection'
import { AppSection } from '@/components/site/home/AppSection'
import { BuiltForSection } from '@/components/site/home/BuiltForSection'
import { OrgSection } from '@/components/site/home/OrgSection'
import { SecuritySection } from '@/components/site/home/SecuritySection'
import { FaqSection } from '@/components/site/home/FaqSection'
import { FinalCtaSection } from '@/components/site/home/FinalCtaSection'

/**
 * magic-slash.io — the landing page.
 *
 * TEN SECTIONS: the promise, what the product IS, what working with it is actually like,
 * what you type to do it, what its window looks like, who that window is for, where
 * everything that window knows actually lives, what it does with your code, what is still
 * holding the reader back, then the ask. It was rebuilt as six and cut band by
 * band by the product owner — "on the product you already have", then "the eight commands", then the feature
 * grid, and then "how it works" as well — which at its thinnest left the headline that
 * names the cycle and the one button at the end of it, with nothing between them. The
 * middle bands were then built back, eight of them now, for eight different jobs:
 *
 *   • `PillarsSection` answers WHAT IT IS in two cards, one per half of the product — the
 *     eight skills, and the app that drives them — closing on the line that names the
 *     reader. A visitor who has only read the hero knows the outcome and not the thing.
 *   • `WorkflowSection` answers WHAT A DAY WITH IT LOOKS LIKE: the loop as five steps,
 *     one coloured card each, a drawing apiece, and one button out to `/workflow`.
 *   • `SkillsSection` answers WHAT YOU ACTUALLY TYPE, and it is the FIRST of the page's
 *     two bands built on `SplitFeature` — a heading, a paragraph and three claims beside a Claude
 *     Code session running seven of the eight commands one after the other. It follows
 *     the workflow band because a reader who has been shown the five moments of a day can
 *     read a transcript of them; the same panel above that band would be a list of
 *     commands with nothing to hang on. It carries the page body's one DIRECT link to the
 *     command inventory (`/features#workflow`), where the workflow band's button reaches
 *     the same anchor one hop later, via `/workflow`.
 *   • `AppSection` then says the app exists and shows it: a heading, a paragraph and a
 *     button beside the app's own window, drawn faithfully at two-fifths size. It is the
 *     page's SECOND `SplitFeature` and its last, and it faces the other way — artwork
 *     right, where the skills band puts it left — because two adjacent splits on one
 *     side read as a template. It carries the page body's one link to `/desktop`, which is where that
 *     window used to be shown at length: see below.
 *   • `BuiltForSection` answers WHO THAT WINDOW IS FOR, in five coloured cards: the
 *     backlog inside it, the keyboard, the Mac, the switches and the global shortcut. It
 *     is the page body's one DIRECT link to `/features` (the workflow band's button goes
 *     via `/workflow`), and it still sits immediately under a picture of the window —
 *     smaller than the one it used to follow, and the reason it follows it is unchanged:
 *     five claims about living somewhere only land next to a picture of the place. Its headline is
 *     the owner's brief: "build pour le developer mais pas que".
 *   • `OrgSection` answers WHO ELSE IS IN THIS, in four coloured cards: the configuration
 *     a repository shares, the organisation that holds it, plans that circulate, and the
 *     backlog everyone draws from. It is the first band on the page whose subject is
 *     plural, and it now follows `BuiltForSection` directly. It has NO BUTTON — the only
 *     middle band without one — because there is no page to send anyone to, and by this
 *     point the page has already spent both of its links out.
 *
 *     A THIRD `SplitFeature` STOOD BETWEEN THE TWO AND IS GONE. `CloudSection` answered
 *     WHERE ALL OF THAT LIVES — a browser drawn as a loading skeleton on a green plate,
 *     a button out to `/cloud` — and it was deleted with that page when the owner stopped
 *     selling the cloud side ("on va arrêter cette partie"). What it cost this band is
 *     the premise it used to be handed: the cloud band's headline was "your configuration
 *     does not live on one machine", and these four cards were four answers to the WHOSE
 *     MACHINES that leaves behind. They make the argument cold now, which is where they
 *     stood the first time the owner placed them — under `SkillsSection` — before the
 *     cloud band gave them a better seam. Worth knowing if this band ever reads abrupt:
 *     the fix is a line of its own, not a band restored.
 *   • `FaqSection` answers WHAT IS STILL HOLDING THE READER BACK: the five questions
 *     asked before anyone installs it, as disclosure rows beside a heading and a button
 *     out to `/faq`. It is the last band before the ask because that is the only place
 *     it does any work — a reader who has read five bands and not pressed the button is
 *     held up by one of those five things.
 *
 * THE ORDER OF THE FIRST THREE CHANGED ONCE, and the reasoning changed with it rather
 * than being retrofitted. The workflow band shipped BELOW the window, on the argument that
 * a sequence of five steps lands better for a reader who has already seen the thing that
 * runs them. The product owner moved it above — "tu peux mettre cette partie juste avant
 * Magic-slash et le mockup de l'application ?" — and the page reads better for it, because
 * the three bands now go from the most abstract to the most concrete without a step back:
 * what it is, what you do with it, and then the window where all of that happens. The
 * window is the PAYOFF of the five steps instead of their preface, and a reader arrives at
 * it already knowing what the panels in it are for.
 *
 * What follows from the move: the `follow` padding rung stays on `PillarsSection`, which
 * is still the band directly under the hero, and the app band keeps the default `band`
 * rung it took when it stopped being that one.
 *
 * THE MIDDLE BAND IS NOT "HOW IT WORKS" COMING BACK, and the difference is worth being
 * exact about because the cut below is documented at length. That band described the
 * MECHANISM in the abstract — you describe, it builds, you approve — which is the part the
 * owner judged a landing page does not owe a reader. `WorkflowSection`'s five are
 * COMMANDS, in the order you type them, each drawn as the artefact it produces: a spec
 * becoming tickets, a ticket becoming an agent, commits becoming a pull request, a thread
 * being answered, a branch being cleaned up. `site.how.*` stays retired; nothing reads it.
 * `lib/workflow.ts` holds the five, and `/workflow` renders the same list in depth.
 *
 * THE APP BAND IS WHAT #270 PUT BACK, and it is not one of the cut bands returning. The
 * page had gone from naming a promise straight to asking for the download without ever
 * showing the thing that keeps it; the window — titlebar, agent list, terminal, info
 * panel, reproduced from `desktop/src/renderer/` at the app's own pixel values and then
 * scaled — is what shows it. `AppWindowMockup.tsx` says which source file each band of
 * that window was read out of.
 *
 * IT SHIPPED AS A FULL BAND AND IS NOW A SPLIT, which is the one change to this page's
 * shape since. `DesktopSection` was the window at up to 0.85 scale, centred under a
 * headline of its own, with four highlights closing it — about 1,100px of page for one
 * drawing, in a stack whose other bands make one claim each and move on. The product
 * owner moved that composition onto `/desktop` (`components/site/desktop/
 * DesktopContent.tsx`, unchanged but for its heading level and its padding) and asked
 * for "un block titre + description et une illustration sur la droite" in its place.
 * `AppSection` is that block: the claim in a paragraph, the window as evidence beside it,
 * and a button for the reader who wants the subject rather than the claim. The aura went
 * with the window.
 *
 * IT REPLACED, RATHER THAN JOINED, THE OLD MOCKUP. `AppMockup.tsx`, `mockupAnimation.ts`
 * and `MkLoader.tsx` were kept on disk for #270 — unrendered, with a note on each saying
 * so — on the plan that this story would convert them from time-driven to scroll-driven.
 * It did not: those ~455 lines reference ~81 `mk-*` class names defined only in
 * `app/(marketing)/marketing.css`, which the `(marketing)` layout deliberately no longer
 * imports (acceptance criterion 3 of #268, guarded by `lib/homepageStylesheet.test.ts`),
 * so every one of them would have had to be ported to Tailwind anyway. Porting a
 * six-phase JS timeline to reach a static window nobody asked to animate is more work for
 * less, so the three files are DELETED and the window is written in tokens. The `.mk-*`
 * rules they were the only consumer of are still in `marketing.css`, now stranded: the
 * file stays because `(docs)` still imports it and `lib/marketingCss.test.ts` still reads
 * it, and pruning the ~1,260-line "App illustrations" block out of it — 174 lines of it carrying
 * one of 86 distinct `.mk-*` selectors, and its `.pj-*` / `.rs-*` / `.ap-*` neighbours
 * unreferenced along with them — is a follow-up of its own.
 *
 * THE "HOW IT WORKS" BAND IS THE LATEST CUT, and it took the page's only same-page
 * anchor with it. `#how` was linked from the header bar and the footer's Product column;
 * both rows are gone rather than left pointing at an id nothing renders. Its copy
 * (`site.how.*`) stays in the catalogues, and so does `site.hero.howCta`, the hero's
 * retired third button that used to scroll to it.
 *
 * WHAT THE CUT COSTS, and it is a real cost rather than a tidy-up: the band carried the
 * three moments — you describe, it builds, you approve — which were this page's only
 * step-by-step account of the mechanism, and NOTHING here replaces them step by step.
 * The headline names the two ENDS of that sequence instead ("From idea to merged PR."),
 * on the argument that a landing page owes a reader the shape of the promise and not its
 * procedure; the procedure is what `/features` and the documentation are for, and both
 * are one click from the bar. The hero's subtitle briefly carried the sequence between
 * the two passes and no longer does — it went to the parallelism, which is the claim
 * only this product can make and which the cut band never stated at all.
 *
 * ONE OF THOSE CUTS COSTS AN ACCEPTANCE CRITERION, and it is written here rather than
 * left for someone to rediscover. Criterion 2 of issue #268 reads "homepage features are
 * presented as clickable cards leading to the features page; a card with no detail page
 * leads to the matching section rather than a 404" — and there is no longer a card grid
 * on this page for it to be true of. The decision was explicit and it is the product
 * owner's to make; what follows from it is that #268 cannot claim that criterion.
 *
 * WHAT #269 DID ABOUT IT: `/features` shipped anyway, and the homepage reached it from
 * the END of the "how it works" band rather than from a grid of cards — one link where
 * there would have been nine. That link went with the band, and for one round the page
 * body reached `/features` nowhere at all — only the HEADER's nav row and the footer's
 * Product column, which is why the cut did not orphan the page. The workflow band gives
 * the body a link out again, though not to that page: its button opens `/workflow`, and
 * `/workflow` is what links on to `/features#workflow`. One hop further than the grid
 * would have been, and it lands on the same eight commands. `SkillsSection`, added under
 * it, closes that gap properly — its button IS `/features#workflow`, so the page body now
 * reaches the command inventory in one hop as well as two. The hero's two buttons stay as
 * they are — start free, or download — for the reasons `HeroSection.tsx` sets out.
 *
 * THE CUT BANDS' COMPONENTS ARE GONE, not parked. They were kept on disk for one round —
 * unrendered, so that restoring a band was one import and one line — and the review
 * (Greptile, PR #278) rightly called that what it was: this PR ADDING dead code, which is
 * worse than a PR retaining some. `FeaturesSection.tsx`, `FeatureCard.tsx` and
 * `CommandsSection.tsx` were deleted in the same PR that introduced them, so #269 read
 * them out of this PR's history rather than off the branch — and then wrote a LIST
 * instead of a grid (`components/site/features/`), so the card component never came
 * back.
 *
 * `lib/commands.ts` is the exception and stays: `desktop/src/main/skills-registry.test.ts`
 * reads it as one of the eight duplicated skill lists, and `lib/commands.test.ts` pins its
 * order — it is exercised data, not an unrendered component.
 *
 * The knock-on: `/#features` and `/#commands` were live same-page anchors from the
 * header's Product menu and the footer's Product column. Both bands are gone; the
 * footer's "Features" row now points at the `/features` PAGE, and "The commands" is not
 * back — the eight live there too, under `#workflow`. With `#how` cut as well, this page
 * publishes NO same-page anchor: every nav row that names it now names a route. NONE
 * OF THE BANDS ADDED SINCE BREAKS THAT, and every one of them deliberately takes no `id`: the
 * workflow band's button is a route (`/workflow`), the skills band's is a route with
 * someone ELSE's anchor on it (`/features#workflow`). So there is nothing on this page
 * for a nav row to point into.
 *
 * Every retired band's copy stays in the catalogues (`site.yourProduct.*`,
 * `site.features.*`, `site.how.commandsTitle`, `site.whereItStands.*`, `site.mockup.*`),
 * alongside the other families this rebuild retired — nothing tests for an unused key,
 * and pruning them means editing `i18n.test.ts`'s exact `SAME_IN_BOTH` allow-list in
 * lockstep. Rather less of it is unreferenced now: `/features` reused a dozen of those
 * pairs instead of writing new ones, which is why they were kept.
 *
 * Rebuilt from zero on the design system landed by #267. There is no `marketing.css`
 * behind any of this — the `(marketing)` layout no longer imports it — so every band is
 * Tailwind over the tokens in `tailwind.config.ts` and the primitives in
 * `components/ui.tsx`. What that replaces: eight sections dressed by ~5,000 lines of
 * ported stylesheet, eleven rival button definitions among them.
 *
 * `bg-canvas` IS HERE AND NOT IN THE LAYOUT, on purpose: that layout wraps every public
 * page, and they do not agree on what colour the page is — `/features` and `/faq` are on
 * white. Painting `#F4F7FE` one level up would cover both.
 *
 * The `page-wrapper` / `content-sections` wrappers are gone with the stylesheet that
 * gave them meaning: `page-wrapper` existed for an `overflow: clip` that kept the old
 * hero's decorative overflow from widening the document, and nothing here overflows.
 */

const DESCRIPTION =
  'From idea to merged PR. Eight Claude Code skills write the spec, create the tickets, open and review the PR. All you do is make the calls.'

/**
 * `openGraph` is not deep-merged with the root layout's — a page that sets it
 * replaces the parent's wholesale — so the homepage restates it rather than
 * inheriting a card that would carry the generic site-wide copy.
 */
export const metadata: Metadata = {
  title: 'magic-slash',
  description: DESCRIPTION,
  openGraph: {
    type: 'website',
    siteName: 'Magic Slash',
    url: 'https://magic-slash.io',
    title: 'magic-slash',
    description: DESCRIPTION,
    images: [{ url: '/img/app-icon-desktop.png', width: 256, height: 256, alt: 'Magic Slash' }],
  },
  twitter: {
    card: 'summary',
    title: 'magic-slash',
    description: DESCRIPTION,
    images: ['/img/app-icon-desktop.png'],
  },
}

export default function Home() {
  return (
    <div className="bg-canvas">
      <HeroSection />
      <PillarsSection />
      <WorkflowSection />
      <SkillsSection />
      <AppSection />
      <BuiltForSection />
      <OrgSection />
      <SecuritySection />
      <FaqSection />
      <FinalCtaSection />
    </div>
  )
}
