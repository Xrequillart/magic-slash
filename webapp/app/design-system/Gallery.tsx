'use client'

import { useState } from 'react'
import {
  ArrowRight,
  Bell,
  Check,
  GitPullRequest,
  Languages,
  Palette,
  Plus,
  Rocket,
  Settings2,
  Sparkles,
  SquareTerminal,
  Trash2,
  Users,
  X,
} from 'lucide-react'
import { TabStrip } from '@/components/TabStrip'
import {
  Badge,
  Button,
  ButtonLink,
  Card,
  Collapse,
  Eyebrow,
  Input,
  Label,
  LogoPlate,
  PLATE_GROUNDS,
  type PlateFit,
  type PlateGround,
  Section,
  SectionHeader,
  Select,
  ShowcaseCard,
  Textarea,
  type BadgeTone,
  type ButtonVariant,
  CARD_TONES,
  ToneCard,
  type CardTone,
} from '@/components/ui'

/**
 * The workbench. See `page.tsx` for why it is development-only.
 *
 * Organised around the DECISIONS the current scale makes, not around an
 * alphabetical list of components — each block below exists so one specific
 * judgement can be checked with an eye instead of argued about:
 *
 *  - the background switch, because a white-on-white system is entirely a
 *    question of shadow, and a shadow reads differently on white than on the
 *    `canvas` blue every product page actually uses;
 *  - the five rungs side by side, because the ladder is the design and any two of
 *    them collapsing into each other is the failure mode;
 *  - a row of buttons that swap variant on click, because a variant without a
 *    border is a smaller box and the layout used to jump on every press;
 *  - the same buttons inside a disabled `<fieldset>`, because `globals.css`
 *    multiplies every control in one by 0.5 and that is what set the disabled
 *    recipe;
 *  - a long list of `Card`s, because `shadow-card` lands on ~35 surfaces and a
 *    rung that looks right on one card can look like corduroy on twenty.
 *
 * `TabStrip` is shown here too, in both of its modes. It is NOT part of this
 * scale's rework and nothing about it was restyled — it is on the page because a
 * design system page that omits the one control with a measured, animated part is
 * hiding the piece most likely to break when the tokens around it move.
 */

const BUTTON_VARIANTS: ButtonVariant[] = ['primary', 'secondary', 'ghost', 'link', 'danger']
const BADGE_TONES: BadgeTone[] = ['neutral', 'accent', 'green', 'yellow', 'red', 'purple']

/** The rungs declared in `tailwind.config.ts`, plus the absence of one. */
const SHADOW_RUNGS = [
  { name: 'shadow-none', note: 'no elevation — what disabled falls back to' },
  { name: 'shadow-card', note: 'default for Card and Section, ~35 surfaces' },
  { name: 'shadow-button', note: 'the primary button at rest' },
  { name: 'shadow-button-hover', note: 'the same button, risen' },
  { name: 'shadow-lift', note: 'the one dramatic rung — the tilted illustration' },
]

/** What a corner can be here. Left in so the 12px decision stays checkable. */
const RADII = [
  { name: 'rounded-button', note: '0.75rem — the new button, matches an Input' },
  { name: 'rounded-full', note: 'the old button; still badges, pills, avatars' },
  { name: 'rounded-xl', note: 'form fields, small tiles' },
  { name: 'rounded-2xl', note: 'surfaces — Card, Section, Modal' },
]

/** The three edge weights in play, so `hairline` can be compared to what it replaced. */
const EDGES = [
  { name: 'border-hairline', note: 'ink at 8% — the button and every field' },
  { name: 'border-black/5', note: 'surfaces (SURFACE)' },
  { name: 'border-black/10', note: 'the hand-written weight hairline replaced' },
]

/**
 * Blue that is NOT the button. `brand` is the primary CTA now, so the risk has
 * inverted: it is no longer "does this decoration look clickable?" but "does this
 * decoration look like the CTA?". Anything below that reads as the primary button
 * is competing with it and wants a different token — `accent` for state, a tint
 * for decoration.
 */
const REMAINING_BLUE = [
  { label: 'Badge, accent tone', className: 'bg-accent/10 text-accent', kind: 'status' },
  { label: 'Field focus border', className: 'border-2 border-accent bg-white', kind: 'focus ring' },
  { label: 'Selected state', className: 'border border-accent bg-accent/[0.06] text-accent', kind: 'state' },
  { label: 'Icon tile', className: 'bg-brand/10 text-brand', kind: 'decoration' },
  { label: 'Toggle, checked', className: 'bg-brand', kind: 'value' },
  { label: 'Progress fill', className: 'bg-brand', kind: 'indicator' },
  { label: 'Eyebrow / prose link', className: 'text-brand', kind: 'typography' },
]

/** A view-state strip: no href, so each item renders as a button. */
const VIEW_TABS = [
  { key: 'general', label: 'General', icon: Settings2 },
  { key: 'team', label: 'Team', icon: Users },
  { key: 'skills', label: 'Skills', icon: Sparkles },
]

/**
 * A navigation strip, pointing at the real Application routes so the shape is the
 * genuine one. Anchors rather than those routes would misrepresent it — but note
 * that clicking one here does navigate away.
 */
const ROUTE_TABS = [
  { key: '/application/features', href: '/application/features', label: 'Features', icon: Sparkles },
  { key: '/application/claude-code', href: '/application/claude-code', label: 'Claude Code', icon: SquareTerminal },
  { key: '/application/notifications', href: '/application/notifications', label: 'Notifications', icon: Bell },
  { key: '/application/appearance', href: '/application/appearance', label: 'Appearance', icon: Palette },
  { key: '/application/language', href: '/application/language', label: 'Language', icon: Languages },
]

function Block({ title, why, children }: { title: string; why: string; children: React.ReactNode }) {
  return (
    <section className="mt-14 first:mt-0">
      <h2 className="font-display text-xl font-bold text-ink">{title}</h2>
      <p className="mt-1 max-w-2xl text-sm text-muted">{why}</p>
      <div className="mt-5">{children}</div>
    </section>
  )
}

/** A labelled cell, so every specimen carries the class name that produced it. */
function Spec({ name, note, children }: { name: string; note?: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex min-h-24 items-center justify-center rounded-xl bg-black/[0.02] p-5">{children}</div>
      <code className="mt-2 block font-mono text-[11px] text-ink">{name}</code>
      {note && <p className="font-mono text-[11px] text-muted">{note}</p>}
    </div>
  )
}

/**
 * One mark per plate, for the specimens above, each with the fit its artwork wants.
 * Here rather than inline so the block stays a loop: the point of the row is that five
 * different logos take the same treatment, which is hard to see if each is written out
 * by hand — and the two that bleed are what make `fit` visible rather than described.
 */
const PLATE_MARKS: Record<PlateGround, { src: string; fit: PlateFit }> = {
  jira: { src: '/img/jira-logo.png', fit: 'bleed' },
  github: { src: '/img/github-logo.png', fit: 'inset' },
  vscode: { src: '/img/vscode-logo.png', fit: 'inset' },
  claude: { src: '/img/claudecode-color.png', fit: 'inset' },
  magic: { src: '/img/app-icon-desktop.png', fit: 'bleed' },
}

export function Gallery() {
  const [onCanvas, setOnCanvas] = useState(true)
  const [rows, setRows] = useState(6)
  const [swap, setSwap] = useState<ButtonVariant>('primary')
  const [viewTab, setViewTab] = useState('general')
  // The accordion specimen below. `null` is "all closed", which is the state `/faq`
  // never enters — it is here so the one-at-a-time mode can be judged from a cold start.
  const [openRow, setOpenRow] = useState<string | null>('grid')

  return (
    <div className={onCanvas ? 'min-h-screen bg-canvas' : 'min-h-screen bg-white'}>
      <div className="mx-auto max-w-5xl px-6 py-12">
        <Eyebrow>/magic:start #267</Eyebrow>
        <h1 className="font-display text-3xl font-bold text-ink">Design system</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Every variant of every primitive in <code className="font-mono text-ink">components/ui.tsx</code>, rendered
          against the real Tailwind config. Development only.
        </p>

        {/* The single most useful control on the page: the whole system is white
            on white, so the shadow IS the design, and it reads differently on the
            canvas blue than on paper white. Product pages are on canvas; a modal
            and the login card are on white. */}
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Button size="md" onClick={() => setOnCanvas((v) => !v)}>
            Background: {onCanvas ? 'canvas #F4F7FE' : 'white #FFFFFF'}
          </Button>
          <span className="text-xs text-muted">
            Shadows are tinted indigo, not black — switch the ground to judge them.
          </span>
        </div>

        <Block
          title="The ladder — five rungs of commitment"
          why="primary commits, secondary is the safe alternative beside it, ghost dismisses, link merely goes somewhere, danger destroys. The ranking is the point, not any one recipe: these sit side by side in every modal footer and settings row, and if you cannot tell which one commits, the ladder has collapsed. `link` is the newest rung and the one to watch here — it is a ghost carrying the brand blue, so it must read as louder than ghost and still lose to a filled primary beside it."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Card className="p-6">
              <p className="mb-4 font-mono text-[11px] text-muted">primary + ghost — the usual footer</p>
              <div className="flex items-center justify-end gap-2">
                <Button variant="ghost">Cancel</Button>
                <Button variant="primary">Save changes</Button>
              </div>
            </Card>
            <Card className="p-6">
              <p className="mb-4 font-mono text-[11px] text-muted">primary + secondary — two real choices</p>
              <div className="flex items-center justify-end gap-2">
                <Button variant="secondary">Save draft</Button>
                <Button variant="primary">Publish</Button>
              </div>
            </Card>
            <Card className="p-6">
              <p className="mb-4 font-mono text-[11px] text-muted">all four, md</p>
              <div className="flex flex-wrap items-center gap-2">
                {BUTTON_VARIANTS.map((variant) => (
                  <Button key={variant} variant={variant}>
                    {variant}
                  </Button>
                ))}
              </div>
            </Card>
            <Card className="p-6">
              <p className="mb-4 font-mono text-[11px] text-muted">lg — sign-in, accept an invite</p>
              <div className="flex items-center justify-end gap-2">
                <Button variant="ghost" size="lg">
                  Cancel
                </Button>
                <Button variant="primary" size="lg">
                  Sign in
                </Button>
              </div>
            </Card>
          </div>

          {/* The reason `border` sits in BUTTON_BASE and only its COLOUR is a
              variant's business. A button without a border is a 2px smaller box,
              so a control that swaps variant on state used to jump on every
              click. Every rung reserves the 1px; two of them just spend it on
              `border-transparent`. */}
          <Card className="mt-4 p-6">
            <p className="mb-4 font-mono text-[11px] text-muted">
              swap variants — nothing may shift, every rung reserves the same 1px border
            </p>
            <div className="flex flex-wrap items-center gap-2">
              {BUTTON_VARIANTS.map((variant) => (
                <Button
                  key={variant}
                  variant={variant === swap ? 'primary' : 'ghost'}
                  onClick={() => setSwap(variant)}
                >
                  {variant}
                </Button>
              ))}
            </div>
          </Card>
        </Block>

        <Block
          title="Icon"
          why="An icon goes on the LEFT of the label and nowhere else, so a column of buttons keeps its glyphs on one axis. Pass the icon with no label and the padding squares up on its own — that one needs an aria-label, since the glyph is aria-hidden and there is no text left to name the button."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Card className="p-6">
              <p className="mb-4 font-mono text-[11px] text-muted">icon + label, every rung</p>
              <div className="flex flex-wrap items-center gap-2">
                <Button icon={Plus}>New repository</Button>
                <Button variant="secondary" icon={GitPullRequest}>
                  Open PR
                </Button>
                <Button variant="ghost" icon={Check}>
                  Mark done
                </Button>
                <Button variant="danger" icon={Trash2}>
                  Delete
                </Button>
              </div>
            </Card>
            <Card className="p-6">
              <p className="mb-4 font-mono text-[11px] text-muted">icon only — square padding, aria-label required</p>
              <div className="flex flex-wrap items-center gap-2">
                <Button icon={Plus} aria-label="Add" />
                <Button variant="secondary" icon={Settings2} aria-label="Settings" />
                <Button variant="ghost" icon={X} aria-label="Close" />
                <Button variant="danger" icon={Trash2} aria-label="Delete" />
              </div>
              <p className="mt-4 font-mono text-[11px] text-muted">lg</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Button size="lg" icon={Plus} aria-label="Add" />
                <Button size="lg" variant="secondary" icon={Settings2} aria-label="Settings" />
              </div>
            </Card>
            <Card className="p-6">
              <p className="mb-4 font-mono text-[11px] text-muted">
                as ButtonLink, and full width — the glyph never squashes
              </p>
              <div className="space-y-2">
                <ButtonLink icon={ArrowRight} href="#icon">
                  Continue
                </ButtonLink>
                <Button icon={GitPullRequest} className="w-full">
                  Open pull request
                </Button>
              </div>
            </Card>
            <Card className="p-6">
              <p className="mb-4 font-mono text-[11px] text-muted">disabled, with an icon</p>
              <div className="flex flex-wrap items-center gap-2">
                <Button icon={Plus} disabled>
                  New repository
                </Button>
                <Button variant="secondary" icon={Settings2} disabled aria-label="Settings" />
              </div>
            </Card>
          </div>
        </Block>

        <Block
          title="Button — every variant, every size, every state"
          why="Hover the primary to see the shadow rise (it is the only affordance a white face has left). Tab through them for the focus ring: it is ink, not blue, because a blue ring on the primary CTA would put back the colour the CTAs were just cleared of."
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[36rem] border-separate border-spacing-y-3 text-left">
              <thead>
                <tr className="font-mono text-[11px] text-muted">
                  <th className="w-28 font-normal">variant</th>
                  <th className="font-normal">md</th>
                  <th className="font-normal">lg</th>
                  <th className="font-normal">disabled</th>
                  <th className="font-normal">as ButtonLink</th>
                </tr>
              </thead>
              <tbody>
                {BUTTON_VARIANTS.map((variant) => (
                  <tr key={variant}>
                    <td>
                      <code className="font-mono text-[11px] text-ink">{variant}</code>
                    </td>
                    <td className="pr-3">
                      <Button variant={variant}>Action</Button>
                    </td>
                    <td className="pr-3">
                      <Button variant={variant} size="lg">
                        Action
                      </Button>
                    </td>
                    <td className="pr-3">
                      <Button variant={variant} disabled>
                        Action
                      </Button>
                    </td>
                    <td>
                      <ButtonLink variant={variant} href="#buttons">
                        Action
                      </ButtonLink>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <Card className="p-6">
              <p className="mb-4 font-mono text-[11px] text-muted">full width — className=&quot;w-full&quot;</p>
              <Button size="lg" className="w-full">
                Sign in
              </Button>
            </Card>
            {/* The case that set the disabled recipe. `globals.css` fades every
                control inside a disabled fieldset to 0.5, and that MULTIPLIES
                whatever the variant says — which is why disabled text stays at
                `muted` rather than something fainter. This is the read-only
                repository page. */}
            <Card className="p-6">
              <p className="mb-4 font-mono text-[11px] text-muted">
                inside &lt;fieldset disabled&gt; — globals.css also fades this by 0.5
              </p>
              <fieldset disabled>
                <div className="flex flex-wrap gap-2">
                  {BUTTON_VARIANTS.map((variant) => (
                    <Button key={variant} variant={variant}>
                      Action
                    </Button>
                  ))}
                </div>
              </fieldset>
            </Card>
          </div>
        </Block>

        <Block
          title="A label never wraps"
          why="whitespace-nowrap and shrink-0 in the base: a button that breaks its label over two lines grows taller than the controls beside it, and one double-height button in a row reads as a layout bug rather than as a set of choices. The label is the control's name, not prose."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Card className="p-6">
              <p className="mb-4 font-mono text-[11px] text-muted">
                a tight flex row — shrink-0 keeps each button as wide as its own text
              </p>
              <div className="flex w-56 gap-2">
                <Button variant="secondary">Save draft</Button>
                <Button>Publish now</Button>
              </div>
            </Card>
            <Card className="p-6">
              <p className="mb-4 font-mono text-[11px] text-muted">
                a fixed width narrower than the label — the button stays 100% wide
              </p>
              <div className="w-48 space-y-2">
                <Button icon={GitPullRequest} className="w-full">
                  Open pull request
                </Button>
                <Button icon={GitPullRequest} truncate className="w-full">
                  A deliberately long label that has to give way somewhere
                </Button>
                <Button truncate className="w-full">
                  And the same again with no icon at all, still ending in three dots
                </Button>
              </div>
              <p className="mt-3 max-w-xs font-mono text-[11px] text-muted">
                the last two add the truncate PROP — the button keeps its 100% width, only the label gives way, and it
                gives way with an ellipsis
              </p>
            </Card>
          </div>
        </Block>

        <Block
          title="TabStrip"
          why="The pill rail, shared by the Application settings and the dashboard scopes. The background is MEASURED, not styled — offsets, a ResizeObserver, and a rule that suppresses the animation on first paint, so the pill answers a click without sliding in from the left edge on every page load. Shown as it is; nothing about it was restyled."
        >
          <div className="space-y-5">
            <Card className="p-6">
              <p className="mb-4 font-mono text-[11px] text-muted">
                view state — items with onSelect, the caller holds activeKey. Click through it.
              </p>
              <TabStrip
                ariaLabel="Repository settings, demo"
                items={VIEW_TABS}
                activeKey={viewTab}
                onSelect={setViewTab}
              />
              <p className="mt-4 text-sm text-muted">
                Active key: <code className="font-mono text-ink">{viewTab}</code>
              </p>
            </Card>

            <Card className="p-6">
              <p className="mb-4 font-mono text-[11px] text-muted">without icons</p>
              <TabStrip
                ariaLabel="Scopes, demo"
                items={VIEW_TABS.map(({ key, label }) => ({ key, label }))}
                activeKey={viewTab}
                onSelect={setViewTab}
              />
            </Card>

            <Card className="p-6">
              <p className="mb-4 font-mono text-[11px] text-muted">
                navigation — items carry href, so each tab is a Link and the pathname decides
              </p>
              <TabStrip ariaLabel="Application settings, demo" items={ROUTE_TABS} activeKey={undefined} />
              <p className="mt-4 max-w-xl text-sm text-muted">
                The pill sits on the first tab because no href matches this page&apos;s pathname — the documented
                fallback for an unmatched key, rather than a strip with no active tab. On{' '}
                <code className="font-mono text-ink">/application</code> the real one lands on the route you are on.
              </p>
            </Card>

            <Card className="p-6">
              <p className="mb-4 font-mono text-[11px] text-muted">
                more tabs than fit — the rail scrolls horizontally rather than wrapping
              </p>
              <TabStrip
                ariaLabel="Overflow, demo"
                items={Array.from({ length: 12 }, (_, i) => ({
                  key: `tab-${i}`,
                  label: `Section ${i + 1}`,
                }))}
                activeKey={`tab-0`}
              />
            </Card>
          </div>
        </Block>

        <Block
          title="Elevation scale"
          why="Four rungs and no more: a white-on-white interface separates things by space and a whisper of shadow, and a seven-step ramp only invites two neighbouring surfaces to differ by an amount nobody can see. Every one is a token — an arbitrary inline shadow at a call site fails the guard test."
        >
          <div className="grid gap-5 sm:grid-cols-3 lg:grid-cols-5">
            {SHADOW_RUNGS.map(({ name, note }) => (
              <Spec key={name} name={name} note={note}>
                <div className={`h-16 w-full rounded-2xl border border-black/5 bg-white ${name}`} />
              </Spec>
            ))}
          </div>
        </Block>

        <Block
          title="Card — and the twenty-row problem"
          why="shadow-card is the quietest rung on purpose: it lands on ~35 surfaces and has to stay under the button standing on it. One card always looks fine. Push the row count up and decide whether a list still reads as a list."
        >
          <div className="mb-5 flex flex-wrap items-center gap-2">
            {[1, 6, 12, 20].map((n) => (
              <Button key={n} variant={n === rows ? 'primary' : 'ghost'} onClick={() => setRows(n)}>
                {n} row{n > 1 ? 's' : ''}
              </Button>
            ))}
            <span className="text-xs text-muted">Cards use the default rung.</span>
          </div>
          <div className="space-y-3">
            {Array.from({ length: rows }, (_, i) => (
              <Card key={i} className="flex items-center gap-4 p-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand">
                  <Rocket className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="truncate font-display text-sm font-bold text-ink">magic-slash #{267 + i}</p>
                  <p className="truncate text-xs text-muted">feat(webapp): one design system</p>
                </div>
                <Badge tone={i % 2 ? 'green' : 'accent'} className="ml-auto shrink-0">
                  {i % 2 ? 'merged' : 'in progress'}
                </Badge>
              </Card>
            ))}
          </div>

          <p className="mt-6 font-mono text-[11px] text-muted">
            The shadow is a SLOT, not a className — a caller replaces the rung instead of racing it.
          </p>
          <div className="mt-3 grid gap-5 sm:grid-cols-3">
            <Spec name='<Card />' note="default — shadow-card">
              <Card className="h-16 w-full" />
            </Spec>
            <Spec name='<Card shadow="shadow-lift" />' note="the tilted illustration">
              <Card shadow="shadow-lift" className="h-16 w-full" />
            </Spec>
            <Spec name='<Card shadow="shadow-none" />' note="flat, for a nested surface">
              <Card shadow="shadow-none" className="h-16 w-full" />
            </Spec>
          </div>
        </Block>

        <Block
          title="Radius"
          why="The button moved off rounded-full — the app's old signature — to 0.75rem, which is finally the same corner as the Input beside it. A drop shadow under a full pill reads as a lozenge rather than a lifted surface. Badges, pills and avatars keep the pill."
        >
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {RADII.map(({ name, note }) => (
              <Spec key={name} name={name} note={note}>
                <div className={`h-16 w-full border border-hairline bg-white shadow-button ${name}`} />
              </Spec>
            ))}
          </div>
          <div className="mt-5 flex flex-wrap items-end gap-3">
            <Button>rounded-button (now)</Button>
            <button className="inline-flex items-center justify-center gap-2 rounded-full border border-hairline bg-white px-5 py-2.5 font-display text-sm font-medium text-ink shadow-button">
              rounded-full (before)
            </button>
            <Input className="max-w-48" placeholder="the Input it now matches" />
          </div>
        </Block>

        <Block
          title="Edges"
          why="border-hairline is ink at 8%, between the 5% that outlined surfaces and the 10% that was hand-written on every field. It is what gives the white button a silhouette on a white card."
        >
          <div className="grid gap-5 sm:grid-cols-3">
            {EDGES.map(({ name, note }) => (
              <Spec key={name} name={name} note={note}>
                <div className={`h-16 w-full rounded-xl bg-white ${name.replace('border-', 'border border-')}`} />
              </Spec>
            ))}
          </div>
        </Block>

        <Block
          title="Form controls"
          why="Every field shares one recipe, and its focus border is still accent — a focus ring is a state, not a call to action, which is the line the palette note in tailwind.config.ts draws."
        >
          <Card className="max-w-xl space-y-4 p-6">
            <div>
              <Label htmlFor="ds-input">Input</Label>
              <Input id="ds-input" placeholder="Focus me — the border turns accent" />
            </div>
            <div>
              <Label htmlFor="ds-select">Select</Label>
              <Select id="ds-select" defaultValue="a">
                <option value="a">Option A</option>
                <option value="b">Option B</option>
              </Select>
            </div>
            <div>
              <Label htmlFor="ds-textarea">Textarea</Label>
              <Textarea id="ds-textarea" rows={3} placeholder="Same recipe, more rows" />
            </div>
            <div>
              <Label htmlFor="ds-disabled">Disabled</Label>
              <Input id="ds-disabled" disabled placeholder="Disabled" />
            </div>
          </Card>
        </Block>

        <Block
          title="Badge"
          why="A badge is a shape, not a button: it keeps rounded-full while the button moves away, and its accent tone keeps its blue because nothing here is clickable."
        >
          <div className="flex flex-wrap items-center gap-2">
            {BADGE_TONES.map((tone) => (
              <Badge key={tone} tone={tone}>
                {tone}
              </Badge>
            ))}
          </div>
        </Block>

        <Block
          title="Section, SectionHeader, Eyebrow"
          why="The composed surfaces, so the shared SURFACE recipe can be compared against a Card standing next to it."
        >
          <div className="space-y-5">
            <Section title="Section" description="A titled surface — the same recipe as Card, plus a heading and p-6.">
              <Button variant="ghost">A control inside it</Button>
            </Section>
            <div>
              <SectionHeader
                icon={Settings2}
                title="SectionHeader"
                action={<Button variant="ghost">Action</Button>}
              />
              <Card className="p-6">
                <p className="text-sm text-muted">The header sits above the Card, not inside it.</p>
              </Card>
            </div>
            <Card className="p-6">
              <Eyebrow>/magic:commit</Eyebrow>
              <p className="text-sm text-muted">Eyebrow is typography, never a control — which is why it keeps brand.</p>
            </Card>
          </div>
        </Block>

        <Block
          title="The coloured card — eight tones, and the ink comes with them"
          why="Card is the product's surface: white, a hairline, one shadow rung, ~35 screens where the CONTENT is what should be read. ToneCard is the marketing pages' counterpart — the ground carries the colour, so the copy has to change ink with it. That pairing is why tone is a slot and not a className: a text-ink title on midnight is invisible, renders fine, and passes every check. Naming the tone names the ink. The gradients are declared in the Tailwind config, so an inline linear-gradient at a call site is the same unfindable value an arbitrary shadow is."
        >
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {(Object.keys(CARD_TONES) as CardTone[]).map((tone) => (
              <Spec key={tone} name={`tone="${tone}"`} note={CARD_TONES[tone].surface}>
                {/* `w-full` so the specimen fills its cell — additive layout, which is
                    all `className` is ever for on a `ui.tsx` component. */}
                <ToneCard
                  tone={tone}
                  title="Every command"
                  description="Six light grounds take the page's own ink; the two dark ones take white and the declared white-on-dark body alpha."
                  className="w-full"
                />
              </Spec>
            ))}
          </div>
          <p className="mt-5 max-w-2xl text-sm text-muted">
            FOUR of them CYCLE and four are NAMED, and that split is the whole idea. A tone is normally a
            surface in a family rather than an identity, so{' '}
            <code className="font-mono text-ink">CARD_TONE_CYCLE</code> runs{' '}
            <code className="font-mono text-ink">mist</code> → <code className="font-mono text-ink">sky</code>{' '}
            → <code className="font-mono text-ink">indigo</code> →{' '}
            <code className="font-mono text-ink">midnight</code> across the eight skills on{' '}
            <code className="font-mono text-ink">/features</code> — two light then two dark, so a four-column
            row lands one of each, no two neighbours carry the same weight, and a ninth skill costs no new
            colour. Widening that cycle to five would break the alternation, which is why the four below sit
            beside it rather than in it.
          </p>
          <p className="mt-3 max-w-2xl text-sm text-muted">
            <code className="font-mono text-ink">mint</code> and{' '}
            <code className="font-mono text-ink">amber</code> are named because they MEAN something, and they
            are the loop&apos;s two BOOKENDS: amber dresses{' '}
            <code className="font-mono text-ink">/magic:start</code>, where work enters, and mint dresses{' '}
            <code className="font-mono text-ink">/magic:done</code>, where it leaves — green being already how
            this product says finished. So the skills grid opens warm and closes green, which says the shape of
            the thing before a word of the copy is read. Named and not cycled means it survives a reorder of
            the eight.
          </p>
          <p className="mt-3 max-w-2xl text-sm text-muted">
            <code className="font-mono text-ink">rose</code> and{' '}
            <code className="font-mono text-ink">lemon</code> have a THIRD standing, and it is worth being
            straight about rather than dressing up: they are declared and no page names them yet. That is not
            the same as unused. The thing this table exists to prevent is a{' '}
            <code className="font-mono text-ink">bg-[linear-gradient(...)]</code> pasted into a page — a colour
            nobody can find again and nobody dares retune — so a ground waiting here is what the next page
            reaches for instead of inventing one. What is deliberately NOT widened is{' '}
            <code className="font-mono text-ink">FeatureTone</code> in{' '}
            <code className="font-mono text-ink">lib/features.ts</code>, which still admits two:{' '}
            <code className="font-mono text-ink">features.test.ts</code> pins the skills grid to exactly those
            named grounds, because a third in a grid of eight is where a rhythm turns into a key the reader has
            to learn.
          </p>
          <p className="mt-3 max-w-2xl text-sm text-muted">
            EVERY TONE IS TUNED BY ITS TRAVEL, and the number is the L* range of the RENDERED wash rather
            than the gap between its two stops — the honest way to compare grounds of different hue, since
            HSL lightness says two colours match at brightnesses an eye reads as nothing alike.{' '}
            <code className="font-mono text-ink">sky</code> anchors the scale at 30 points because it is the
            traced reference; the rest were rendered and measured against it.{' '}
            <code className="font-mono text-ink">indigo</code> and{' '}
            <code className="font-mono text-ink">midnight</code> sit together at ~17, the two dark grounds
            carrying the same weight so a row that lands both shows neither as flat.{' '}
            <code className="font-mono text-ink">mint</code> and{' '}
            <code className="font-mono text-ink">amber</code> sit together at ~15, which is the two bookends
            of the loop at one volume rather than two values chosen apart.{' '}
            <code className="font-mono text-ink">lemon</code> is 13,{' '}
            <code className="font-mono text-ink">rose</code> and{' '}
            <code className="font-mono text-ink">mist</code> are 11 — mist being the quietest on purpose,
            because it is what the mockups are photographed against and a ground that competes with the
            drawing has stopped being a ground. All of those are measured on the TRACED composition, before
            the dice: the jitter below moves each bloom&apos;s peak alpha by up to five points, so what a
            tone actually renders sits a point or two either side of its number. Tuning the stops against one
            fixed composition is what makes two tones comparable at all.
          </p>
          <p className="mt-3 max-w-2xl text-sm text-muted">
            THREE OF THEM WERE RETUNED WHEN THE WASH LANDED, all in the same direction and for the same
            reason: their stops were close enough together to work only while there was an ink shadow faking
            the depth.{' '}
            <code className="font-mono text-ink">mist</code> was three points and read as pure white,{' '}
            <code className="font-mono text-ink">mint</code> six and read as an unfinished tint, and{' '}
            <code className="font-mono text-ink">indigo</code> — running{' '}
            <code className="font-mono text-ink">accent</code> into{' '}
            <code className="font-mono text-ink">brand</code>, five points apart — was the flattest of the
            eight. Mist keeps its near-white field and gains a real light blue, in{' '}
            <code className="font-mono text-ink">sky</code>&apos;s hue so the two blue grounds pool in the
            same blue; mint keeps its field and gets its green back; indigo keeps{' '}
            <code className="font-mono text-ink">accent</code> as the field and takes a brand blue driven to
            45% lightness, which makes the brand hue a LADDER — brand at 61%,{' '}
            <code className="font-mono text-ink">INDIGO_DEEP</code> at 45%,{' '}
            <code className="font-mono text-ink">BRAND_DEEP</code> at 26% — rather than three separate blues.
          </p>
          <p className="mt-3 max-w-2xl text-sm text-muted">
            None of the warm tones is a status token — not{' '}
            <code className="font-mono text-ink">yellow</code>, not{' '}
            <code className="font-mono text-ink">red</code>, and mint&apos;s deeper green is deliberately not{' '}
            <code className="font-mono text-ink">green</code> either — since a status spent on decoration is a
            status that stops meaning anything; and amber is kept clear of Claude&apos;s coral in the plates
            below, which would make the card read as &ldquo;the Claude one&rdquo;.
          </p>
          <p className="mt-3 max-w-2xl text-sm text-muted">
            NONE OF THE EIGHT IS A STRAIGHT SWEEP, and the recipe is TRACED rather than composed:{' '}
            <code className="font-mono text-ink">mesh()</code> in{' '}
            <code className="font-mono text-ink">tailwind.config.ts</code> takes a tone&apos;s two stops and
            builds one DIFFUSE WASH out of them — a flat pale field holding the top of the card, where the
            title and the description sit, and six soft blooms gathering the colour into the lower half. The
            six come from FITTING a reference image the product owner supplied, and they land within 2.5/255
            of it, so <code className="font-mono text-ink">sky</code> — whose two stops are that picture&apos;s
            own — is the reference rather than a reading of it. A 135° gradient arrives at an even rate the
            whole way across, which is what made a coloured card read as FILLED rather than as lit.
          </p>
          <p className="mt-3 max-w-2xl text-sm text-muted">
            THE FIELD IS FLAT AND IT IS THE LAST LAYER, which is what makes the top-left corner readable by
            construction: CSS paints the first background layer nearest the viewer, so the solid{' '}
            <code className="font-mono text-ink">top</code> sits under everything, and nothing in the
            composition reaches the corner the copy occupies. Not approximately, and not until somebody nudges
            a bloom — that corner IS the quiet stop, which is also why{' '}
            <code className="font-mono text-ink">midnight</code> and{' '}
            <code className="font-mono text-ink">indigo</code> stay safe under{' '}
            <code className="font-mono text-ink">text-white</code>. Put the field first instead and it paints
            over all six blooms on ~30 surfaces at once, with the whole wash still in the stylesheet;{' '}
            <code className="font-mono text-ink">designTokens.test.ts</code> holds the order for that reason.
          </p>
          <p className="mt-3 max-w-2xl text-sm text-muted">
            A TONE HAS A THIRD COLOUR NOW, and it is derived rather than declared. Measure the reference&apos;s
            hue along its bottom edge and it runs 223 on the left and 210 on the right: not one light at two
            strengths but TWO LIGHTS of slightly different colour, which is the whole difference between the
            picture and every earlier attempt at it. So{' '}
            <code className="font-mono text-ink">cooled()</code> swings the deep stop −13° of hue and lifts it
            five points — the far lamp being the lighter one — and a tone stays two colours. Declaring a third
            literal per tone would be eight more values to keep in tune with the two they sit between, and a
            table where the relationship that MAKES the effect is invisible. The same swing runs on the warm
            tones, where −13° is a step toward coral rather than toward cyan; what survives the translation is
            the thing that matters, which is that the two pools are adjacent instead of identical.
          </p>
          <p className="mt-3 max-w-2xl text-sm text-muted">
            THE FALLOFF IS THE HALF NOBODY EXPECTS TO MATTER. A two-stop radial fades LINEARLY, so its alpha
            has a corner at each end: a peak at the centre, which shows as a bright dot, and a kink at the
            last stop, which shows the bloom&apos;s own ellipse as a faint ring. Both are plainly visible on a
            card 400px wide and both are what makes a hand-rolled mesh gradient look hand-rolled. The
            reference has neither, because it was never gradients — it is blurred discs, and a Gaussian is flat
            at the top and flat at the tail. So every bloom carries five stops sampled off{' '}
            <code className="font-mono text-ink">0.5(1 + cos πu)</code>, and the last one is the same colour at
            zero alpha rather than <code className="font-mono text-ink">transparent</code>, which is
            rgba(0,0,0,0) and drags the fade through grey.
          </p>
          <p className="mt-3 max-w-2xl text-sm text-muted">
            THERE IS NO SHADOW, which is the one thing the old wash had and this one does not. Every previous
            version darkened the bottom corners with <code className="font-mono text-ink">ink</code> at a
            named alpha, on the reasoning that a ground turning away from the light is what makes a card read
            as lit; the reference does not — its darkest point is 71% luminance and it is the periwinkle
            itself, not black under the periwinkle. Side by side, the ink layer is what made the old cards
            look dusty. The depth here is entirely the near pool being deeper than the field.
          </p>
          <p className="mt-3 max-w-2xl text-sm text-muted">
            NO TWO TONES ARE THE SAME ARRANGEMENT, and that is the part to see rather than read. One
            composition across eight grounds is one gradient STAMPED eight times — eight cards lit by the same
            six lamps — and the eye reads the repeated shape before it reads either colour, most obviously
            where two cards sit side by side. So seven of the eight pass their own NAME to{' '}
            <code className="font-mono text-ink">mesh()</code>, and the dice it seeds decide whether the whole
            set MIRRORS and where each bloom lands inside its budget: picking a different tone for a card
            moves its blooms instead of only recolouring them. Seeded and not{' '}
            <code className="font-mono text-ink">Math.random()</code> because this runs when Tailwind loads
            its config — a live random deals a different composition into the stylesheet on every build, and a
            card that looked right when it was reviewed ships as something else. Seeded on the NAME and not on
            the stops, because the name is the tone&apos;s identity and the stops are what we expect to tune;
            retuning <code className="font-mono text-ink">AMBER_DEEP</code> by two points should not reshuffle
            every bloom on thirty surfaces.
          </p>
          <p className="mt-3 max-w-2xl text-sm text-muted">
            THE BUDGETS ARE PER BLOOM AND NOT PER TABLE, which is the part worth not undoing. One global ±10%
            gives every bloom the same licence, and two of the six cannot take it: the row that carries the
            hue transition is 68% TALL, so a few points of extra height and a nudge upward turns it into a
            column running the full card and the colour stops pooling at the bottom at all — which is what a
            uniform budget produced on <code className="font-mono text-ink">rose</code> and{' '}
            <code className="font-mono text-ink">amber</code>, and it is a different picture rather than the
            same one rearranged. What the budgets protect was checked by rendering all eight and measuring,
            not by eye: the colour&apos;s centroid stays at y ≈ 75% on every tone, its deepest point stays
            below y = 83%, and the top-left 62%×34% — where <code className="font-mono text-ink">ToneCard</code>{' '}
            puts the title and the description — never drifts further from the field than the reference&apos;s
            own corner does. And <code className="font-mono text-ink">sky</code> passes no name at all: it IS
            the traced picture, so the anchor does not move.
          </p>
          <p className="mt-3 max-w-2xl text-sm text-muted">
            THESE ARE ALSO EVERY ILLUSTRATION&apos;S GROUND, which is the part that is easy to miss from this
            page: <code className="font-mono text-ink">bg-tone-*</code> is the plate behind every mockup on{' '}
            <code className="font-mono text-ink">/features</code> and on the homepage —{' '}
            <code className="font-mono text-ink">mist</code> under the drawings that are mostly dark window,{' '}
            <code className="font-mono text-ink">sky</code> and{' '}
            <code className="font-mono text-ink">indigo</code> under the rest. So the wash is what a drawing of
            the app is photographed against, and retuning{' '}
            <code className="font-mono text-ink">mesh()</code> moves ~30 surfaces at once.
          </p>
          <div className="mt-8">
            <Spec name={'layout="beside"'} note="stacks below md">
              {/* A full-row card. The `beside` slot turns it into a row and caps the copy
                  at a readable measure; `stacked` — the default, shown in the four
                  specimens above — puts the visual under the copy at full width. */}
              <ToneCard
                tone="mist"
                layout="beside"
                title="A card wide enough for both"
                description="A full-row card whose copy is two lines leaves a band of empty ground under it, and a visual pushed to the bottom edge reads as an afterthought rather than as the point."
                className="w-full"
              >
                <div className="-mr-14 py-7 pl-7">
                  <div className="min-w-96 rounded-xl bg-white p-4 text-xs text-muted shadow-lift">
                    Where the visual sits is the CARD&apos;s business, not the visual&apos;s. A visual that
                    placed itself with mt-auto had to know the card was a flex column, and it stopped
                    working silently the day the card became a row.
                  </div>
                </div>
              </ToneCard>
            </Spec>
          </div>
          <p className="mt-3 max-w-2xl text-sm text-muted">
            No shadow, and <code className="font-mono text-ink">rounded-2xl</code> rather than a radius of its
            own. <code className="font-mono text-ink">shadow-card</code> under a saturated gradient reads as dirt
            rather than as lift, and the config says outright that there is no{' '}
            <code className="font-mono text-ink">borderRadius.card</code> because{' '}
            <code className="font-mono text-ink">rounded-2xl</code> is already the surface convention
            everywhere. <code className="font-mono text-ink">children</code> is left UNPADDED on purpose: that is
            the difference between an icon sitting in the card and a screenshot bleeding out of it.
          </p>
        </Block>

        <Block
          title="The showcase card — a white ground, and one panel allowed to be loud"
          why="The third card shape, and the gap it fills is a specific one: a row about SOMEBODY ELSE'S product. Card keeps everything white and readable. ToneCard puts the colour under the copy, which means the page has to wear the colour. This puts the colour on one panel instead — so a plate can be Atlassian blue or GitHub near-black without the page becoming Atlassian or GitHub. The white tile under every mark is what makes that safe: logos arrive in whatever colour their owner drew them in, and no single ground holds VS Code blue, GitHub black and Jira's own pale square at once. On a tile, all three do."
        >
          <div className="space-y-5">
            <ShowcaseCard
              title="Open in VS Code"
              description="The copy takes a little more than half the row and the artwork takes the rest — a share rather than a max-width, so a wide page does not leave a band of empty white."
              art={<LogoPlate ground="vscode" src="/img/vscode-logo.png" className="h-full" />}
            />
            <ShowcaseCard
              title="A card with no artwork"
              description="art is a slot and an optional one. Without it the card is copy on a plain surface, which is what makes this the arrangement rather than a picture frame."
            />
          </div>
          <p className="mt-5 max-w-2xl text-sm text-muted">
            The five grounds are declared as{' '}
            <code className="font-mono text-ink">PLATES</code> in{' '}
            <code className="font-mono text-ink">tailwind.config.ts</code>, in their own namespace
            beside <code className="font-mono text-ink">TONES</code> and deliberately NOT merged with
            them. A tone is a surface in a family and cycles because it means nothing; a plate is a
            product&apos;s own hue and is always asked for by name. One table, and{' '}
            <code className="font-mono text-ink">CARD_TONE_CYCLE</code> could deal a skill card the
            GitHub grey.
          </p>
          <div className="mt-6 grid gap-5 sm:grid-cols-3 xl:grid-cols-5">
            {(Object.keys(PLATE_GROUNDS) as PlateGround[]).map((ground) => (
              <Spec
                key={ground}
                name={`ground="${ground}"`}
                note={`${PLATE_GROUNDS[ground]} · ${PLATE_MARKS[ground].fit}`}
              >
                <LogoPlate
                  ground={ground}
                  src={PLATE_MARKS[ground].src}
                  fit={PLATE_MARKS[ground].fit}
                  className="w-full"
                />
              </Spec>
            ))}
          </div>
          <p className="mt-5 max-w-2xl text-sm text-muted">
            <code className="font-mono text-ink">fit</code> is the one thing a call site has to get
            right, and it describes the ARTWORK rather than the plate. A bare glyph on transparency is{' '}
            <code className="font-mono text-ink">inset</code> — 64px in the 96px tile, and the white
            margin is what makes the tile read as a tile. A finished app icon that brings its own
            square ground is <code className="font-mono text-ink">bleed</code>: inset, it would draw a
            coloured box inside a white box; filling the tile, the artwork simply becomes the tile and
            takes its corner. Jira&apos;s mark and ours are the two that bleed — which is why they are
            the two specimens above that have no white margin.
          </p>
        </Block>

        <Block
          title="Collapse — the row that opens"
          why="A rounded plate that lights up under the pointer and stays lit while open, measured off cleanshot.com/faq — their radius, their 5% ink wash for both states, their 18px title, their 20px chevron turning 180° over 300ms, their 24px of air above the answer. It is also the one control on this page with an animated, content-measured part, and its failure modes are things you have to PRESS to see: a stutter, a long answer cut short, a keyboard tab landing inside something invisible. Hence live specimens rather than two static states."
        >
          <div className="grid gap-5 lg:grid-cols-2">
            <Card className="p-6">
              <p className="mb-4 font-mono text-[11px] text-muted">
                uncontrolled — rows open independently, which is what /faq renders
              </p>
              {/* `flex flex-col gap-1` and NOTHING ELSE. No border, no dividers: the
                  reference puts 5px between tiles and draws no lines at all, and the row
                  carries no margin of its own so a lone `Collapse` ships with no space
                  under it. This is the shape every caller is expected to build. */}
              <div className="flex flex-col gap-1">
                <Collapse title="Two open at once, on purpose" defaultOpen>
                  Press the row under this one without closing this one. Two answers side by
                  side is the case a one-at-a-time accordion makes impossible, and on a FAQ
                  it is the common one — see the note in <code className="font-mono">FaqContent.tsx</code>.
                </Collapse>
                <Collapse title="An answer long enough to catch a height bug">
                  The height is animated with <code className="font-mono">grid-template-rows</code>,
                  0fr to 1fr, which opens to the CONTENT rather than to a guessed number. The
                  reference animates <code className="font-mono">max-height</code> instead, and
                  this paragraph is what that costs: a transition towards a height the content
                  never reaches finishes early and snaps, and anything longer than the cap is
                  simply cut off at it. Watch the bottom edge, not the chevron.
                </Collapse>
                <Collapse title="Anything focusable inside a closed row">
                  The content stays in the DOM while closed, which is what makes the animation
                  possible and what lets find-on-page reach an answer nobody opened. The cost is
                  that a closed row is invisible but still laid out — so{' '}
                  <code className="font-mono">inert</code> takes it out of the tab order.{' '}
                  <button type="button" className="font-medium text-brand underline underline-offset-2">
                    Close this row and tab through the page
                  </button>{' '}
                  — the keyboard must skip this link entirely.
                </Collapse>
              </div>
            </Card>

            <Card className="p-6">
              <p className="mb-4 font-mono text-[11px] text-muted">
                controlled — one at a time, for a panel tall enough to lose your place
              </p>
              <div className="flex flex-col gap-1">
                {[
                  { id: 'grid', title: 'Driven by the caller' },
                  { id: 'inert', title: 'Opening one closes the others' },
                  { id: 'reduce', title: 'Under reduced motion' },
                ].map((row) => (
                  <Collapse
                    key={row.id}
                    title={row.title}
                    open={openRow === row.id}
                    onToggle={(next) => setOpenRow(next ? row.id : null)}
                  >
                    {row.id === 'reduce' ? (
                      <>
                        Every transition here is{' '}
                        <code className="font-mono">motion-reduce:transition-none</code> — the wash,
                        the track and the chevron. Turn the OS setting on and the rows still open,
                        they just arrive rather than travel, which is the whole contract.
                      </>
                    ) : (
                      <>
                        Pass <code className="font-mono">open</code> and{' '}
                        <code className="font-mono">onToggle</code> and the row stops keeping its own
                        state. Note that <code className="font-mono">onToggle</code> fires in both
                        modes: a caller that passes it alone, to log the press, does not lose the
                        toggle.
                      </>
                    )}
                  </Collapse>
                ))}
              </div>
              <p className="mt-4 text-sm text-muted">
                Pressing the open row closes it — <code className="font-mono text-ink">onToggle(false)</code>{' '}
                sets the group back to none open, which is the state the wash is worth checking in:
                nothing lit, and a hover still lights one. A group that cannot be fully closed is the
                other reasonable design, and it is the caller&apos;s call rather than the primitive&apos;s.
              </p>
            </Card>
          </div>

          <p className="mt-5 max-w-2xl text-sm text-muted">
            Two things the reference does that this does not, both of them bugs rather than design:
            it animates <code className="font-mono text-ink">max-height</code> (see the second
            specimen), and its trigger is a bare{' '}
            <code className="font-mono text-ink">div</code> — no role, no{' '}
            <code className="font-mono text-ink">aria-expanded</code>, no keyboard. Here it is a real{' '}
            <code className="font-mono text-ink">button</code> inside an{' '}
            <code className="font-mono text-ink">h3</code>, so a screen reader gets a list of
            headings to navigate rather than eleven unnamed rows. Not{' '}
            <code className="font-mono text-ink">&lt;details&gt;</code> either: a native disclosure
            snaps open, and the ways round that are supported in some of the browsers reading the
            site and not the rest.
          </p>
        </Block>

        <Block
          title="Blue that is not the button"
          why="brand is the primary CTA now, so the question inverted: not whether these look clickable, but whether any of them looks like THE button. The two that share the fill exactly — a checked toggle and a progress bar — are the ones to look at hardest: one is a value you set, the other a measurement, and neither is an action you fire."
        >
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {REMAINING_BLUE.map(({ label, className, kind }) => (
              <Spec key={label} name={label} note={kind}>
                <div className={`flex h-12 w-full items-center justify-center rounded-xl text-xs ${className}`}>
                  {kind}
                </div>
              </Spec>
            ))}
          </div>
          <p className="mt-5 max-w-2xl text-sm text-muted">
            The armed confirm in the <code className="font-mono text-ink">/admin</code> console stays solid{' '}
            <code className="font-mono text-ink">ink</code> rather than following the primary button back to blue: it
            is a confirm STEP, not the page&apos;s primary action. It is not shown here either way — it belongs to{' '}
            <code className="font-mono text-ink">components/regie/primitives.tsx</code>, which has its own scale and
            never imported this one.
          </p>
        </Block>
      </div>
    </div>
  )
}
