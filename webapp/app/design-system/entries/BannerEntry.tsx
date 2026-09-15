'use client'

import { BotMessageSquare, EyeOff, TicketPlus, Unlink, X } from 'lucide-react'
import { Banner, BANNER_VARIANTS, type BannerVariant } from '@ds/desktop'
import type { DesktopTheme } from '@/lib/desktopTheme'
import { EntryHeader, EntrySection, PropsTable, Snippet, Specimen, Stage, type PropRow } from '../parts'
import { usesOf } from './ids'

/**
 * The Banner entry — the real component from `design-system/desktop/Banner.tsx`,
 * imported and rendered, not a drawing of it. Change the component and this page
 * changes with it; there is no copy here to fall out of date.
 */

const COPY: Record<BannerVariant, string> = {
  info: 'This repository has no development branch configured yet.',
  success: 'An agent is already working on this ticket.',
  warning: 'Two agents are running on the same worktree.',
  danger: 'The Jira token expired. Ticket transitions will fail until it is renewed.',
  accent: 'Choose a ticket for Ada.',
}

const PROPS: PropRow[] = [
  {
    name: 'variant',
    type: "'info' | 'success' | 'warning' | 'danger' | 'accent'",
    fallback: "'info'",
    description:
      'Four of them are the reader’s question — “should I worry?” — and not the app’s internal severity. There is deliberately no neutral: a strip with no colour is a card. accent is the fifth and is not a severity at all: it is a mode the reader switched on and can leave, which is the one hue that means “you did this”.',
  },
  {
    name: 'children',
    type: 'string',
    required: true,
    description: (
      <>
        The sentence, already translated. A <em>string</em>, and it was a{' '}
        <code>ReactNode</code>: a banner says one thing, everything actionable goes in{' '}
        <code>actions</code>, and anything needing structure is not a banner. Typed as text it
        goes through <code>Text</code>, which is what ended the two copies of this component
        spelling <code>text-sm text-ink</code> and <code>text-xs text-ink</code> by hand.
      </>
    ),
  },
  {
    name: 'icon',
    type: 'IconComponent',
    fallback: 'the variant’s own',
    description: (
      <>
        Overrides the variant’s mark, for a banner that names a <em>thing</em> rather than a
        severity — the ticket page passes <code>BotMessageSquare</code> because its subject is an
        agent. Takes any component accepting a <code>className</code>, so a call site hands over one
        of its own Lucide icons directly.
      </>
    ),
  },
  {
    name: 'action',
    type: '{ label, onClick, busy?, title? }',
    description:
      'The one thing to do about it, as data — the banner draws the button itself, in the variant’s own colour. That is the whole reason it can be data here where actions below could not: there is no tier to choose, so the call site has nothing to decide and therefore nothing to spell. A single action and not a list, because two buttons on a strip this size is a dialog that forgot to be one.',
  },
  {
    name: 'actions',
    type: 'ReactNode',
    description:
      'The way out, and on its way out. Right edge on a row, under the sentence when stacked, styled at the call site. It stays for the two banners that draw a PAIR and rank them — a filled button and an outlined one — which needs an emphasis this folder has no button tier to express yet. Ignored when action is set.',
  },
  {
    name: 'hint',
    type: 'string',
    description:
      'A second, quieter line under the sentence, and the only structure a banner has. It is for what is different while the strip is on screen — “clicking a card attaches it instead of opening it” — which does not belong in the same sentence as the fact itself. Not a place for a second fact: two facts are two banners, or a card.',
  },
  {
    name: 'layout',
    type: "'row' | 'stacked' | 'band' | 'inset'",
    fallback: "'row'",
    description:
      'Arrangement and type scale together, not two props. A banner stacks exactly when its column is too narrow for a sentence beside a button, and at that width it wants the smaller size anyway. band is the pinned drawing: opaque, square-cornered, full-bleed, a hairline underneath and a fixed 53px — BANNER_BAND_HEIGHT, which the bars pinning below it offset themselves by. inset is that shape at a card’s scale rather than a window’s: square and full-bleed too, but tinted like every other layout, since nothing scrolls under a band that is part of a card’s flow.',
  },
  {
    name: 'bordered',
    type: 'boolean',
    fallback: 'false',
    description:
      'An outline in the variant’s colour. Off by default — on a tinted ground it is a second edge on a shape that already has one. The setup wizards’ error strips still want it. Ignored by the band, which carries a hairline as part of being a band.',
  },
  {
    name: 'className',
    type: 'string',
    fallback: "''",
    description:
      'Margins and widths only. The banner owns its ground, padding and radius; respelling those at a call site is the duplication this component ended. A band’s pinning is the exception — sticky top-0 z-30 is a fact about the page around it, which this folder cannot know.',
  },
]

export function BannerEntry({
  theme,
  onOpen,
}: {
  theme: DesktopTheme
  onOpen?: (id: string) => void
}) {
  return (
    <article className="flex flex-col divide-y divide-hairline">
      <EntryHeader
        title="Banner"
        uses={usesOf('banner')}
        onOpen={onOpen}
      >
        A tinted strip that states a fact about the surface it sits on. Not a notification and not a
        toast: a toast is raised over the app and gone on a timer, a banner is part of the page and
        stays as long as the fact does. A badge labels a thing; a banner addresses the reader.
      </EntryHeader>

      <EntrySection
        title="Display"
        note="Full width, one line: an icon, a sentence, and the actions pushed to the right edge. This is the ticket page’s own banner, the component’s first call site."
      >
        <Stage theme={theme}>
          <Banner
            variant="success"
            icon={BotMessageSquare}
            actions={
              <>
                <button className="inline-flex items-center gap-1.5 rounded-lg border border-green/40 px-3 py-1.5 text-xs font-medium text-green transition-colors hover:bg-green/10">
                  <Unlink className="h-3.5 w-3.5" />
                  <span>Detach</span>
                </button>
                <button className="inline-flex items-center gap-1.5 rounded-lg bg-green px-3 py-1.5 text-xs font-medium text-bg transition-all hover:bg-green/90">
                  <BotMessageSquare className="h-3.5 w-3.5" />
                  <span>View agent</span>
                </button>
              </>
            }
          >
            An agent is already working on this ticket.
          </Banner>
        </Stage>

        <Snippet>{`<Banner variant="success" icon={BotMessageSquare} actions={<ViewAgentButton />}>
  {t('tasks.hasAgentHint')}
</Banner>`}</Snippet>
      </EntrySection>

      <EntrySection
        title="Variants"
        note="Five, and each one carries its own mark and its own tone — nothing below passes an icon. Every mark goes through Icon at the layout's rung, so a banner's glyph is the same size as the one in the row above it by construction rather than by memory."
      >
        <Stage theme={theme} className="flex flex-col gap-3">
          {BANNER_VARIANTS.map((variant) => (
            <Banner key={variant} variant={variant}>
              {COPY[variant]}
            </Banner>
          ))}
        </Stage>
      </EntrySection>

      <EntrySection
        title="Layouts"
        note="Row is the default. Stacked exists for a narrow column — the ticket page pins a 256px rail where the sentence and its buttons cannot sit side by side."
      >
        {/* 304px = the rail's own 256 plus the stage's 24px of padding either side.
            Anything narrower clips the specimen, which on a page whose subject is a
            256px layout would be the one measurement a reader is here to check. */}
        <div className="grid gap-4 md:grid-cols-[1fr_304px]">
          <Specimen label="row — full width">
            <Stage theme={theme} className="h-full">
              <Banner variant="info">
                This repository has no development branch configured yet.
              </Banner>
            </Stage>
          </Specimen>
          <Specimen label="stacked — a 256px rail">
            <Stage theme={theme}>
              <div className="w-64">
                <Banner
                  variant="success"
                  icon={BotMessageSquare}
                  layout="stacked"
                  actions={
                    <button className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-green px-3 py-1.5 text-xs font-medium text-bg">
                      <BotMessageSquare className="h-3.5 w-3.5" />
                      <span>View agent</span>
                    </button>
                  }
                >
                  An agent is already working on this ticket.
                </Banner>
              </div>
            </Stage>
          </Specimen>
        </div>
      </EntrySection>

      <EntrySection
        title="The band"
        note="The third layout, and the one a strip takes when it is PINNED rather than sitting in a page’s flow: opaque, square-cornered, edge to edge, with a hairline under it. The Tasks board pins this one while a ticket is being chosen for an agent."
      >
        {/* No `sticky` here — there is nothing to scroll under it on this page. What the
            specimen has to show is the drawing: the opaque ground, the square corners,
            the mark on its plate and the two lines of type. */}
        {/* `-m-6` rather than a `p-0` on the Stage: both are padding utilities and which
            one wins is decided by the order Tailwind emitted them in, not by the order
            they are spelled here. A negative margin cancels the stage's 24px whatever
            that order turns out to be, and `overflow-hidden` keeps the band's square
            corners inside the stage's rounded ones. */}
        <Stage theme={theme} className="overflow-hidden">
          <div className="-m-6">
            <Banner
              variant="accent"
              layout="band"
              icon={TicketPlus}
              hint="Clicking a card attaches it to the agent instead of opening it."
              actions={
                <button className="flex items-center gap-1 rounded-lg border border-line px-2 py-1 text-xs font-medium text-text-secondary transition-colors hover:text-ink">
                  <X className="h-3.5 w-3.5" />
                  Cancel
                </button>
              }
            >
              Choose a ticket for Ada.
            </Banner>
          </div>
        </Stage>

        <p className="max-w-2xl text-xs leading-relaxed text-muted">
          <em>Opaque is the whole point.</em> Every other layout is a 10% tint, which is right on
          a page and wrong the moment the strip is <code>sticky</code>: the rows scroll{' '}
          <em>under</em> it, and a translucent bar shows them sliding about behind the words. The
          variant’s colour moves to the mark’s plate instead. Square corners for the same reason —
          a radius on a full-bleed band is a gap with the content showing through it.
        </p>

        <Snippet>{`<Banner
  variant="accent"
  layout="band"
  icon={TicketPlus}
  className="sticky top-0 z-30"
  hint={t('tasks.pick.hint')}
  actions={<CancelButton />}
>
  {t('tasks.pick.title', { name: agentName })}
</Banner>`}</Snippet>
      </EntrySection>

      <EntrySection
        title="The inset"
        note="The band’s shape at a CARD’s scale rather than a window’s: square and full-bleed for the same reason, since a card’s band spans the card edge to edge. What it does not take from the band is the opacity and the plate — nothing scrolls under a strip that is part of a card’s flow, so the variant’s tint stays where it is on every other layout. The agent sidebar’s pull request card stacks these between its checklist rows."
      >
        {/* The real arrangement: `PullRequestCard` draws a hairline over every child it
            is given, so the bands and the rows below them read as one list interrupted
            rather than as a strip dropped on top of a card. */}
        <Stage theme={theme} className="flex flex-col gap-3">
          <Specimen label="danger — the fact, and the fix under it">
            <div className="max-w-[300px] overflow-hidden rounded-lg bg-ink/5">
              <Banner variant="danger" layout="inset" hint="Add one in Settings → Integrations.">
                No GitHub token
              </Banner>
            </div>
          </Specimen>
          <Specimen label="accent with an action — a mode, and the way out of it">
            <div className="max-w-[300px] overflow-hidden rounded-lg bg-ink/5">
              <Banner
                variant="accent"
                layout="inset"
                icon={EyeOff}
                hint="What is below was last read an hour ago."
                action={{ label: 'Turn on', onClick: () => {} }}
              >
                PR watching is off
              </Banner>
            </div>
          </Specimen>
        </Stage>

        <p className="max-w-2xl text-xs leading-relaxed text-muted">
          It is the one layout that <em>wraps</em>. A band pinned across a window can truncate
          — there is always more width to be had by making the window wider, and what it names
          is usually a thing the reader chose — where an inset band has no such width to find:
          it is as wide as the card it is a band of, which is 248px inside a sidebar at its
          minimum. What it says there is a failure and the <em>fix</em> for it, and a truncated
          fix is a fix nobody can follow. Both lines or neither: truncating the message while
          the fix below it wrapped would cut off the shorter of the two.
        </p>

        <Snippet>{`<Banner
  variant="accent"
  layout="inset"
  icon={EyeOff}
  hint={t('agentInfo.pr.watcherOffStale')}
  action={{
    label: t('agentInfo.pr.enableWatcher'),
    onClick: () => void enableWatcher(),
    busy: enabling,
  }}
>
  {t('agentInfo.pr.watcherOff')}
</Banner>`}</Snippet>
      </EntrySection>

      <EntrySection
        title="Bordered"
        note="Off by default. The ticket page dropped its outline and read better for it; the setup wizards’ error strips are the reason the prop survives at all."
      >
        <Stage theme={theme} className="grid gap-3 md:grid-cols-2">
          <Banner variant="danger">
            Without an outline — the default.
          </Banner>
          <Banner variant="danger" bordered>
            With one, at twice the fill’s weight.
          </Banner>
        </Stage>
      </EntrySection>

      <EntrySection title="Props">
        <PropsTable rows={PROPS} />
      </EntrySection>
    </article>
  )
}
