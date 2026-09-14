'use client'

import { useState } from 'react'
import { Switch, type SwitchSize } from '@ds/desktop'
import type { DesktopTheme } from '@/lib/desktopTheme'
import { EntryHeader, EntrySection, PropsTable, Snippet, Stage, type PropRow } from '../parts'

const SIZES: { size: SwitchSize; note: string }[] = [
  { size: 'sm', note: '40×24, knob 20×16 — the settings rows, and the default' },
  { size: 'md', note: '48×28, knob 28×20' },
  { size: 'lg', note: '56×32, knob 32×24' },
]

const PROPS: PropRow[] = [
  {
    name: 'checked',
    type: 'boolean',
    required: true,
    description:
      'Which end the knob is at. Controlled with no internal state of its own — a switch that remembered its own position could disagree with the setting it is drawing, which is the one thing it must never do.',
  },
  {
    name: 'onChange',
    type: '(next: boolean) => void',
    required: true,
    description:
      'Handed the value it is moving TO, not the click. Every call site writes immediately: there is no save button behind any of these, and the shape promises that.',
  },
  {
    name: 'label',
    type: 'string',
    required: true,
    description:
      'The same words as the visible label in the row beside it, for assistive tech. Required rather than optional because the visible one is never inside the control — a switch on its own is a lever with no sign on it.',
  },
  {
    name: 'size',
    type: "'sm' | 'md' | 'lg'",
    fallback: "'sm'",
    description:
      'Label, Status and ButtonIcon’s ladder — 24, 28, 32 — because a switch lines up in a row with those. No xs: ButtonIcon’s exists for a button nested in a chip, and a switch is never nested in anything.',
  },
  {
    name: 'variant',
    type: "'pill' | 'liquid'",
    fallback: "'pill'",
    description:
      'Which drawing. pill is the flat track above; liquid is jh3y’s cross-browser liquid toggle on the same ladder — same track, same knob, same travel, with the knob turned into a lens on press. Opt-in rather than default: each liquid instance mounts two SVG filters and composites five layers, which is the cost the desktop’s Tailwind config turns backdrop-filter off over.',
  },
  {
    name: 'disabled',
    type: 'boolean',
    fallback: 'false',
    description:
      'Stops the interaction and nothing else. The greying is index.css’s fieldset:disabled button rule, which is exactly why this is a <button> and not a hidden checkbox — see below.',
  },
]

export function SwitchEntry({ theme }: { theme: DesktopTheme }) {
  const [demo, setDemo] = useState(true)
  const [off, setOff] = useState(false)
  const [liquid, setLiquid] = useState(true)
  const [liquidOff, setLiquidOff] = useState(false)

  return (
    <article className="flex flex-col divide-y divide-hairline">
      <EntryHeader title="Switch">
        A setting that is on or off and takes effect the moment you say so. Sixteen of them
        across the two settings pages, and not one has a save button behind it — that is the
        contract the shape promises. Anything needing confirmation is a checkbox and should
        look like one.
      </EntryHeader>

      <EntrySection
        title="The two positions"
        note="Click either, and hold the pointer down for a moment before releasing. The knob is a pill rather than a circle at every rung — a dot in a track reads as something that slid, a pill as something that was pushed — and it stretches 4px while you press, then settles at the far end."
      >
        <Stage theme={theme} className="flex items-center gap-10">
          <label className="flex items-center gap-3 text-[13px] text-text-secondary">
            <Switch checked={demo} onChange={setDemo} label="Demo switch" />
            <span>{demo ? 'On' : 'Off'}</span>
          </label>
          <label className="flex items-center gap-3 text-[13px] text-text-secondary">
            <Switch checked={off} onChange={setOff} label="Second demo switch" />
            <span>{off ? 'On' : 'Off'}</span>
          </label>
        </Stage>
      </EntrySection>

      <EntrySection
        title="The liquid variant"
        note="Press and HOLD one of these, then let go. At rest it is the same control as above — flat track, white knob — because the glass only exists while the switch is open. Press, and the white cover lifts off a lens: the knob stops being a thing sitting on the track and becomes a window looking through it, with the fill bulging to 1.65 and welding itself back to the track by way of an SVG goo filter."
      >
        <Stage theme={theme} className="flex flex-col gap-6">
          <div className="flex items-center gap-10">
            <label className="flex items-center gap-3 text-[13px] text-text-secondary">
              <Switch
                variant="liquid"
                checked={liquid}
                onChange={setLiquid}
                label="Liquid demo switch"
              />
              <span>{liquid ? 'On' : 'Off'}</span>
            </label>
            <label className="flex items-center gap-3 text-[13px] text-text-secondary">
              <Switch
                variant="liquid"
                checked={liquidOff}
                onChange={setLiquidOff}
                label="Second liquid demo switch"
              />
              <span>{liquidOff ? 'On' : 'Off'}</span>
            </label>
          </div>
          <div className="flex flex-col gap-5">
            {SIZES.map(({ size }) => (
              <div key={size} className="flex items-center gap-4">
                <span className="w-8 flex-shrink-0 font-mono text-[10px] text-text-secondary">
                  {size}
                </span>
                <Switch variant="liquid" checked onChange={() => {}} label={`${size}, on`} size={size} />
                <Switch
                  variant="liquid"
                  checked={false}
                  onChange={() => {}}
                  label={`${size}, off`}
                  size={size}
                />
              </div>
            ))}
          </div>
        </Stage>
        <p className="max-w-2xl text-xs leading-relaxed text-muted">
          It is{' '}
          <a
            href="https://codepen.io/jh3y/pen/bNVWoBW"
            target="_blank"
            rel="noreferrer"
            className="text-accent hover:underline"
          >
            jh3y’s cross-browser liquid toggle
          </a>{' '}
          on this component’s ladder rather than its own 140×60. Two things could not come
          across: the pen tracks a pointer with GSAP and Draggable, which a switch that is
          tapped and never dragged does not need — <code>--complete</code> is a registered
          custom property and CSS transitions it unaided — and the pen ramps its colour off an
          HSL hue, which the app’s accent does not have, so the ramp is a{' '}
          <code>color-mix</code> that picks the ON end up as <code>currentColor</code>. Point{' '}
          <code>text-accent</code> somewhere else and the liquid follows.
        </p>
        <p className="max-w-2xl text-xs leading-relaxed text-muted">
          It is not the default, and the reason is the same one that turns{' '}
          <code>backdrop-filter</code> off across the desktop app: each instance mounts two SVG
          filters and composites five layers. One on a page is a flourish, and sixteen down a
          settings page is the cost that config already refused.
        </p>
      </EntrySection>

      <EntrySection
        title="The squash"
        note="Press and hold any switch above. The knob gains 4px of width while the pointer is down, and gives back the same 4px of travel when it is already at the far end so that it grows inward instead of pushing through the padding. Four pixels at every rung rather than a proportion: the squash is a gesture and not a measurement, and it has to read the same on a 20px pill as on a 32px one."
      >
        <p className="max-w-2xl text-xs leading-relaxed text-muted">
          It animates <code>width</code> and not <code>scale-x</code>, which is the obvious way
          to stretch a thing and the wrong one here: a scaled pill scales its corners too, so at
          1.25 the radius goes elliptical and the ends stop being semicircles — visible on the
          very shape this component exists to be. The real width leaves{' '}
          <code>rounded-full</code> to recompute honestly at every frame.
        </p>
        <p className="max-w-2xl text-xs leading-relaxed text-muted">
          Nothing here opts out of it for reduced motion, because{' '}
          <code>index.css</code> already collapses every transition duration in the app under{' '}
          <code>prefers-reduced-motion: reduce</code>. A second guard in the component would be a
          second place to keep in step.
        </p>
      </EntrySection>

      <EntrySection
        title="Three rungs, and they are not this component’s"
        note="24, 28 and 32 — the same ladder Label, Status and ButtonIcon already stand on. A switch sits in a row beside those, and one that measured itself against nothing could only ever line up with the row by accident. An sm switch and an sm label agree at 24px because they read the same table, not because someone matched them by eye."
      >
        <Stage theme={theme} className="flex flex-col gap-5">
          {SIZES.map(({ size, note }) => (
            <div key={size} className="flex items-center gap-4">
              <span className="w-8 flex-shrink-0 font-mono text-[10px] text-text-secondary">
                {size}
              </span>
              <Switch checked onChange={() => {}} label={`${size}, on`} size={size} />
              <Switch checked={false} onChange={() => {}} label={`${size}, off`} size={size} />
              <span className="font-mono text-[10px] text-text-secondary">{note}</span>
            </div>
          ))}
        </Stage>
        <p className="max-w-2xl text-xs leading-relaxed text-muted">
          There is no <code>xs</code>, though <code>ButtonIcon</code> has one. That rung exists
          there for a button nested <em>inside</em> a chip, measured against the chip rather
          than the row; a switch is never nested in anything, and a 20px switch is a target too
          small for a control whose whole job is being hit.
        </p>
      </EntrySection>

      <EntrySection
        title="Against the row it answers"
        note="The length came back down after a first draft that set it to show the new knob off. Sixteen of these run down two settings pages, in rows whose text is 13px: a switch is the answer to its row, not the subject of it. The tracks are about 1.7 times their height now, against 2.2 in that draft."
      >
        <Stage theme={theme} className="flex flex-col gap-4">
          {['Split view', 'Launch at login', 'Watch pull requests'].map((name, i) => (
            <div
              key={name}
              className="flex items-center justify-between gap-6 border-b border-line-subtle py-3 last:border-b-0"
            >
              <span className="text-[13px] text-ink">{name}</span>
              <Switch checked={i !== 1} onChange={() => {}} label={name} />
            </div>
          ))}
        </Stage>
      </EntrySection>

      <EntrySection
        title="Disabled is the page’s job"
        note="A disabled switch here still looks live, on purpose. The repository page goes read-only for a member who may not edit a team repo, and the greying comes from index.css’s fieldset:disabled button rule that already covers every input, select and textarea around it."
      >
        <Stage theme={theme}>
          <fieldset disabled className="flex items-center gap-10">
            <label className="flex items-center gap-3 text-[13px] text-text-secondary">
              <Switch checked onChange={() => {}} label="Locked, on" disabled />
              <span>Locked, on</span>
            </label>
            <label className="flex items-center gap-3 text-[13px] text-text-secondary">
              <Switch checked={false} onChange={() => {}} label="Locked, off" disabled />
              <span>Locked, off</span>
            </label>
          </fieldset>
        </Stage>
        <p className="max-w-2xl text-xs leading-relaxed text-muted">
          That rule is also why this is a <code>{'<button role="switch">'}</code> and not a
          checkbox. The checkbox version had to be hidden with <code>sr-only</code> and
          repainted with sibling divs, which put the visible part out of reach of a selector
          ending in <code>button</code> — so it needed a CSS rule of its own just to grey in
          step with the fields beside it.
        </p>
      </EntrySection>

      <EntrySection title="Props">
        <PropsTable rows={PROPS} />
        <Snippet>{`import { Switch } from '@ds/desktop'

<div className="flex items-center justify-between gap-6 py-4">
  <span className="text-[13px] text-ink">{t('settings.application.split.label')}</span>
  <Switch
    checked={splitEnabled}
    onChange={setSplitEnabled}
    label={t('settings.application.split.label')}
  />
</div>`}</Snippet>
        <p className="max-w-2xl text-xs leading-relaxed text-muted">
          The label is written twice and that is not a redundancy to factor out. The visible
          one belongs to the ROW — it sits in the layout, wears the row’s type scale and
          sometimes carries a second line under it — while <code>label</code> belongs to the
          control. A component that drew both would be a settings row, and the app has three
          different ones.
        </p>
      </EntrySection>
    </article>
  )
}
