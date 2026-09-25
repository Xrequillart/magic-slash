'use client'

import { useState } from 'react'
import { Button, BUTTON_TONES, COMPONENT_SIZES, type ButtonSize, type ButtonTone } from '@ds/desktop'
import { ArrowUpRight, Check, ChevronDown, CircleStop, Plus, Trash2 } from '@ds/desktop/icons'
import type { DesktopTheme } from '@/lib/desktopTheme'
import { EntryHeader, EntrySection, PropsTable, Snippet, Stage, type PropRow } from '../parts'
import { usesOf } from './ids'

/**
 * The hue this page lends the two treatments that have none.
 *
 * A PALETTE VALUE and not a hex, which is the distinction `color` exists to carry: a
 * repository's `#F43F5E` is a colour the app picked once, where this has to keep moving
 * when the theme under the stage does.
 */
const LENT = 'rgb(var(--c-red))'

/** What each tone is FOR, in the words the component's own table uses. */
const TONE_NOTES: Record<ButtonTone, string> = {
  accent: 'the one affirmative action of a view — at most one per card',
  neutral: 'available, but not the obvious next step. The default',
  ghost: 'the same button with no plate, for one inside something that already has one',
  danger: 'tinted and not filled: destructive should read as available, never as next',
  ink: 'the highest contrast the theme has, for the second action of a pair that both matter',
  solid: 'the opaque plate, for a button standing on the quick-settings sheet’s frost',
  overlay: 'mixed from the fill’s own ink, for a button sitting on a coloured bar',
  tint: 'a treatment and not a colour — the hue arrives in `color`, at 12%',
  fill: 'the same hue at full strength. The louder of the pair, at most one per group',
}

/** What each rung is for, shortest form. The component's table says it at length. */
const SIZE_NOTES: Record<ButtonSize, string> = {
  '2xs': '20px — below a row',
  xs: '24px — under a row',
  sm: '28px — a list row. The default',
  md: '32px — a row of 14px type',
  lg: '36px — beside a heading',
  xl: '40px — above a heading',
  '2xl': '44px — the button is the subject',
}

const PROPS: PropRow[] = [
  {
    name: 'children',
    type: 'string',
    required: true,
    description:
      'The word. A string, not a node — a button whose label can hold structure grows a second line and stops being a button.',
  },
  { name: 'onClick', type: '() => void', description: 'What pressing it does.' },
  {
    name: 'tone',
    type: "'accent' | 'neutral' | 'ghost' | 'danger' | 'ink' | 'solid' | 'overlay' | 'tint' | 'fill'",
    fallback: "'neutral'",
    description:
      'The ground. Each is a job rather than a colour — accent is the one affirmative action, ghost is for a button inside something already plated, solid is for the frosted sheet, overlay is for one sitting on a coloured bar. tint and fill are treatments with no colour of their own and require the prop below.',
  },
  {
    name: 'color',
    type: 'string',
    description:
      'A hue this folder does not own — a Banner variant’s, a repository’s, any CSS value. Required by tint and fill and rejected by every other tone, which is a union rather than two optional props: tone="tint" with no colour is an undefined variable in every color-mix, and an invalid color-mix is not a slightly wrong colour, it is no background at all.',
  },
  {
    name: 'size',
    type: 'ComponentSize',
    fallback: "'sm'",
    description:
      'One of the folder’s seven rungs. Height and radius are ButtonIcon’s at every rung, so a word button and a mark button on one row agree by construction.',
  },
  {
    name: 'icon',
    type: 'IconComponent',
    description: 'A mark before the word, sized by the rung. It says what the action is.',
  },
  {
    name: 'trailing',
    type: 'IconComponent',
    description:
      'A mark after the word — a chevron on a menu trigger, an arrow on a link out. It says where the action goes. Both at once is legal and almost always one too many.',
  },
  { name: 'disabled', type: 'boolean', fallback: 'false', description: 'Dimmed and unpressable.' },
  {
    name: 'busy',
    type: 'boolean',
    fallback: 'false',
    description:
      'The action is running. The leading mark becomes a spinner and the word stays. Implies disabled — a save that accepts a second press sends a second save — but does not dim, because a dimmed spinner says “unavailable” about a control that is working.',
  },
  {
    name: 'type',
    type: "'button' | 'submit'",
    fallback: "'button'",
    description:
      'submit for the one button in a form that sends it. The default is button, because a bare <button> inside a form submits it.',
  },
  {
    name: 'title',
    type: 'string',
    description:
      'The tooltip, for when the face is not the whole story — a truncated label, a shortcut worth naming, a control disabled for a reason the reader cannot see.',
  },
  {
    name: 'className',
    type: 'string',
    fallback: "''",
    description:
      'Margins, width and placement — w-full, ml-auto, flex-1. Not the ground, the height, the radius or the padding.',
  },
]

/** The busy state, which only reads as itself when it actually runs. */
function Saving() {
  const [busy, setBusy] = useState(false)
  return (
    <Button
      tone="accent"
      size="md"
      icon={Check}
      busy={busy}
      onClick={() => {
        setBusy(true)
        window.setTimeout(() => setBusy(false), 2200)
      }}
    >
      {busy ? 'Saving' : 'Save changes'}
    </Button>
  )
}

export function ButtonEntry({
  theme,
  onOpen,
}: {
  theme: DesktopTheme
  onOpen?: (id: string) => void
}) {
  return (
    <article className="flex flex-col divide-y divide-hairline">
      <EntryHeader title="Button" uses={usesOf('button')} onOpen={onOpen}>
        A control that is a word, and optionally a mark beside it — <code>ButtonIcon</code>’s
        other half. That one is a square with a tooltip, for a row where the names would not
        fit; this is the one that says what it does on its face.
      </EntryHeader>

      <EntrySection
        title="No border, anywhere"
        note="A decision rather than an omission. Four of the seven constants this replaces carried one, and a bordered control is a hairline drawn around a plate that is already a different colour from the ground — the same thing said twice. What separates a button from what is behind it is its ground, and every tone has one or deliberately has none."
      >
        <Stage theme={theme} className="flex flex-wrap items-center gap-3">
          <Button tone="accent" size="md" icon={Plus}>
            New agent
          </Button>
          <Button tone="neutral" size="md">
            Cancel
          </Button>
          <Button tone="ghost" size="md">
            Skip
          </Button>
          <Button tone="danger" size="md" icon={Trash2}>
            Delete
          </Button>
        </Stage>
      </EntrySection>

      <EntrySection
        title="The tones"
        note="Each is a job, not a colour. Only accent announces itself before being touched — that is what makes it findable, and a second one on the same card is two primaries, which is none."
      >
        <Stage theme={theme} className="flex flex-col gap-4">
          {BUTTON_TONES.map((tone) => (
            <div key={tone} className="flex items-center gap-4">
              {/* `overlay` IS DRAWN ON A FILL and the others are not, because that is the
                  only ground it works on. Mixed from `on-brand` rather than from `ink`, it
                  is a plate at 15% of a colour chosen to read against something else — on
                  this page's own surface it would be either invisible or a hole, and a
                  gallery that showed it there would be documenting a bug. */}
              <div
                className={`flex w-48 flex-shrink-0 ${
                  tone === 'overlay' ? 'rounded-lg bg-purple p-2' : ''
                }`}
              >
                {/* `tint` and `fill` are the two with no colour of their own, so the
                    gallery has to lend them one — the app's red, as a palette value
                    rather than a hex, which is the form that keeps moving when the
                    theme does. */}
                {tone === 'tint' || tone === 'fill' ? (
                  <Button tone={tone} color={LENT} size="md" icon={Check}>
                    {tone}
                  </Button>
                ) : (
                  <Button tone={tone} size="md" icon={Check}>
                    {tone}
                  </Button>
                )}
              </div>
              <span className="font-mono text-[10px] leading-relaxed text-text-secondary">
                {TONE_NOTES[tone]}
              </span>
            </div>
          ))}
        </Stage>
      </EntrySection>

      <EntrySection
        title="The shadow is on the filled tones only, and it does not move"
        note="A shadow under a translucent plate is a shadow under a hole: bg-ink/5 lets the ground through, so the dark it casts and the dark it shows are the same dark. accent and ink are opaque, so they can cast one — tinted with the plate's own colour rather than black, which is the difference between a button that glows and one that has been cut out and dropped on the page. It belongs to the button at rest and stays put: the hover is one rule for all seven tones, a step of ground. accent has a token for it, ink is mixed a step towards the background because it has none, and the translucent tones step their own opacity."
      >
        <Stage theme={theme} className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-4">
            <Button tone="accent" size="lg">
              Hover me
            </Button>
            <Button tone="ink" size="lg">
              And me
            </Button>
            <Button tone="neutral" size="lg">
              No shadow here
            </Button>
          </div>
          <span className="font-mono text-[10px] leading-relaxed text-text-secondary">
            the ground steps on all three · the shadow under the first two does not
          </span>
        </Stage>
      </EntrySection>

      <EntrySection
        title="Two treatments that carry no colour"
        note="tint and fill are the only tones with no hue of their own: the colour arrives in `color` and both require it, which the type enforces rather than documents. They exist because a component can legitimately own a colour this folder does not — a Banner has five variants and its button must be the variant's, a repository has one of sixteen the app assigns at runtime. Two ranks and not one, because the callers that need their own colour are exactly the ones that need to rank a pair: do the thing, or go somewhere else about it."
      >
        <Stage theme={theme} className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <Button tone="fill" color="rgb(var(--c-green))" size="md">
              Approve
            </Button>
            <Button tone="tint" color="rgb(var(--c-green))" size="md">
              Read it first
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button tone="fill" color="rgb(var(--c-orange))" size="md">
              Retry
            </Button>
            <Button tone="tint" color="rgb(var(--c-orange))" size="md">
              Open the log
            </Button>
          </div>
          <span className="font-mono text-[10px] leading-relaxed text-text-secondary">
            the hue is posted as a CSS variable and every ground is mixed from it in a
            class — the only way a hover can be spelled at all, since no inline style has
            one. The focus ring takes the colour too: a red pair with an indigo ring is two
            colours arguing about which of them is the state.
          </span>
        </Stage>
      </EntrySection>

      <EntrySection
        title="On a filled bar"
        note="ScriptCard's stop control is what asked for the overlay tone. Every other tone is mixed from ink — the colour that reads against the app's ground, not against a saturated fill — so ink at 5% on purple is purple and ink at full is black on a card whose whole point is that it is loud. overlay is mixed from on-brand instead, the colour already carrying the text beside it, so the chip is on the bar rather than a second colour next to it. Its focus ring drops the offset for the same reason: a band of app-background across the fill reads as a hole punched around the control."
      >
        <Stage theme={theme} className="flex flex-col gap-3">
          <div className="flex w-full max-w-sm items-center gap-2 rounded-lg bg-purple px-2 py-1.5 text-on-brand">
            <span className="min-w-0 flex-1 truncate text-xs">desktop/dev</span>
            <Button tone="overlay" size="sm" icon={CircleStop}>
              Stop
            </Button>
          </div>
          <div className="flex w-full max-w-sm items-center gap-2 rounded-lg bg-red px-2 py-1.5 text-on-brand">
            <span className="min-w-0 flex-1 truncate text-xs">webapp/build</span>
            <Button tone="overlay" size="sm" icon={CircleStop}>
              Stop
            </Button>
          </div>
          <span className="font-mono text-[10px] text-text-secondary">
            one tone, two fills — it does not know which, which is what makes it reusable and
            also what bounds it
          </span>
        </Stage>
      </EntrySection>

      <EntrySection
        title="It comes up to meet the pointer"
        note="4% out on hover, 3% in on press — an object that rises under the cursor and gives when it is pushed. Four and not ten is a measurement: a row of buttons is spaced by gap-2, a scale grows a box from its centre, and at 1.10 the account card's five-button row starts touching. Both are held back when the button cannot be pressed — a disabled control that grew would be inviting a press it will refuse. Hover the row below, then hold one down."
      >
        <Stage theme={theme} className="flex flex-wrap items-center gap-2">
          <Button tone="accent" icon={Plus} size="md" onClick={() => undefined}>
            Add repository
          </Button>
          <Button size="md" onClick={() => undefined}>
            Change password
          </Button>
          <Button tone="danger" size="md" onClick={() => undefined}>
            Delete account
          </Button>
          <Button size="md" disabled onClick={() => undefined}>
            Disabled — nothing moves
          </Button>
        </Stage>
      </EntrySection>

      <EntrySection
        title="The seven rungs"
        note="20/24/28/32/36/40/44 — one 4px step above the boxes ButtonIcon, Label and Status stand on, and that is the ladder working rather than broken: componentSizes says in as many words that the rungs are a name and an order, never one table of boxes. Text resolves them to 10/12/14/16/18/20/24 and Avatar to something else again. A button is not the same drawing as a badge — it is a target, and on a control with no border the air is the whole of what says so, on both axes. What it costs: a button no longer lines up with an icon button of the SAME rung, so a row holding both wants the button one rung down."
      >
        <Stage theme={theme} className="flex flex-col gap-4">
          {COMPONENT_SIZES.map((size) => (
            <div key={size} className="flex items-center gap-4">
              <div className="w-44 flex-shrink-0">
                <Button tone="accent" size={size} icon={Plus}>
                  {size}
                </Button>
              </div>
              <span className="font-mono text-[10px] text-text-secondary">{SIZE_NOTES[size]}</span>
            </div>
          ))}
        </Stage>
      </EntrySection>

      <EntrySection
        title="A mark before the word, a mark after it"
        note="Two different jobs. A leading mark says what the action is; a trailing one says where it goes. Both at once is legal and almost always one too many."
      >
        <Stage theme={theme} className="flex flex-wrap items-center gap-3">
          <Button tone="neutral" size="md" icon={Plus}>
            Add a repository
          </Button>
          <Button tone="neutral" size="md" trailing={ChevronDown}>
            Sort by
          </Button>
          <Button tone="ghost" size="md" trailing={ArrowUpRight}>
            Open on GitHub
          </Button>
        </Stage>
      </EntrySection>

      <EntrySection
        title="Pressed, busy, unavailable"
        note="Press any of them: 3% is the whole of the travel — far enough to be felt, near enough that a row of them does not ripple. Busy keeps the word and swaps the mark for a spinner, and it implies disabled without dimming: a dimmed spinner says “unavailable” about a control that is in fact working. Tab to one for the focus ring."
      >
        <Stage theme={theme} className="flex flex-wrap items-center gap-3">
          <Saving />
          <Button tone="neutral" size="md" disabled title="Nothing to commit">
            Commit
          </Button>
          <Button tone="danger" size="md" icon={Trash2} disabled>
            Delete
          </Button>
        </Stage>
      </EntrySection>

      <EntrySection title="Props">
        <PropsTable rows={PROPS} />
        <Snippet>{`import { Button } from '@ds/desktop'
import { Plus } from '@ds/desktop/icons'

<Button tone="accent" size="md" icon={Plus} onClick={addRepository}>
  {t('settings.repos.add')}
</Button>`}</Snippet>
        <p className="max-w-2xl text-xs leading-relaxed text-muted">
          It replaces the app’s <code>theme/controls.ts</code> — <code>BTN</code>,{' '}
          <code>BTN_PRIMARY</code>, <code>BTN_DANGER</code>, <code>BTN_GHOST</code>,{' '}
          <code>BTN_COMPACT</code> and the two stacked tiers. Seven constants with one gabarit
          between them, and a header explaining that appending a padding to one of them does not
          work because Tailwind settles two utilities of the same group by emit order. That
          header is the argument for this component: a module of class strings cannot offer a{' '}
          <em>size</em>, so the app grew a constant every time a button had to be a different
          one.
        </p>
        <p className="max-w-2xl text-xs leading-relaxed text-muted">
          Width is <em>not</em> a prop. <code>w-full</code> goes in <code>className</code>, where
          layout belongs — a constant that decided width could not be reused by the next caller,
          which is the rule <code>controls.ts</code> already wrote down for itself.
        </p>
      </EntrySection>
    </article>
  )
}
