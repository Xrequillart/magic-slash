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
 *  - the four rungs side by side, because the ladder is the design and any two of
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

const BUTTON_VARIANTS: ButtonVariant[] = ['primary', 'secondary', 'ghost', 'danger']
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
          title="The ladder — four rungs of commitment"
          why="primary commits, secondary is the safe alternative beside it, ghost dismisses, danger destroys. The ranking is the point, not any one recipe: these sit side by side in every modal footer and settings row, and if you cannot tell which one commits, the ladder has collapsed."
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
          title="The coloured card — five tones, and the ink comes with them"
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
                  description="Two light grounds take the page's own ink; the two dark ones take white and the declared white-on-dark body alpha."
                  className="w-full"
                />
              </Spec>
            ))}
          </div>
          <p className="mt-5 max-w-2xl text-sm text-muted">
            FOUR of them cycle and the fifth does not, and that split is the idea. A tone is normally a
            SURFACE in a family rather than an identity, so{' '}
            <code className="font-mono text-ink">CARD_TONE_CYCLE</code> runs four across the eight skills on{' '}
            <code className="font-mono text-ink">/features</code> — two light then two dark, so a four-column
            row lands one of each and no two neighbours carry the same weight, and a ninth skill costs no new
            colour. <code className="font-mono text-ink">mint</code> is out of that cycle because it MEANS
            something: it dresses the card for <code className="font-mono text-ink">/magic:done</code>, and
            green is already how this product says finished. A tone that means something is asked for by
            name, so it survives a reorder.
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
