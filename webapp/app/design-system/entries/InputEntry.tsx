'use client'

import { useState } from 'react'
import { Input, type InputSize, type InputTone, type InputTrailing } from '@ds/desktop'
import type { IconComponent } from '@ds/desktop/types'
import { Search } from '@ds/desktop/icons'
import type { DesktopTheme } from '@/lib/desktopTheme'
import { EntryHeader, EntrySection, PropsTable, Snippet, Specimen, Stage, type PropRow } from '../parts'
import { usesOf } from './ids'

const SIZES: InputSize[] = ['sm', 'md', 'lg', 'xl']

const PROPS: PropRow[] = [
  {
    name: 'value · onChange',
    type: 'string · (value: string) => void',
    required: true,
    description:
      'onChange hands over the VALUE, not the event. Every call site in the app wrote (e) => set(e.target.value); the ones doing something else were doing it to the key, which is what onKeyDown is still for and still gets the event for.',
  },
  {
    name: 'multiline',
    type: 'true',
    description:
      'Draws a textarea instead, with rows and resize. A discriminant, so rows on a single-line field is a type error rather than an ignored attribute — and so the two shapes cannot drift apart, which is what a class string could never prevent.',
  },
  {
    name: 'size',
    type: "'sm' | 'md' | 'lg' | 'xl'",
    fallback: "'md'",
    description:
      '24 / 28 / 32 / 36 — the shared control ladder, so a field and the button beside it are the same height by construction. md is what the constant this replaces measured, so every migrated field kept its height without asking.',
  },
  {
    name: 'tone',
    type: "'default' | 'paper'",
    fallback: "'default'",
    description:
      'default is the theme’s. paper is for a surface that is white whatever the theme is — the sign-in card, glass on the release mesh — where bg-surface is ink at 6% of a ground that is not there and text-ink is white on four themes out of eight. Not a light-theme tone: on the app’s own ground, default already follows the theme.',
  },
  {
    name: 'icon',
    type: 'IconComponent',
    description:
      'A mark inside the box, at the left. The rung decides how far the text is inset for it, which is why it is a prop and not a pl-9 in className: two padding utilities on one element are settled by Tailwind’s emit order.',
  },
  {
    name: 'trailing',
    type: "'none' | 'narrow' | 'wide'",
    fallback: "'none'",
    description:
      'Room kept clear at the right edge for the caller’s own controls — the Tasks search box puts a spinner, a warning and a clear button there. What they are and when they appear is a fact about that board; what the field owes them is a named amount of space.',
  },
  {
    name: 'mono · invalid · disabled · readOnly',
    type: 'boolean',
    description:
      'The content is code; the value is refused (red hairline, at rest and focused); the field is unusable — and disabled dims it from inside the tone, where the constant left that to the caller and four fields out of seven remembered.',
  },
  {
    name: 'rows · resize',
    type: "number · 'none' | 'vertical'",
    description:
      'Multiline only. 3 rows by default — the browser’s own 2 is never what a form wants — and no resize, because a box that grows inside a form pushes everything under it. vertical is for the one field that IS the page, a skill’s content.',
  },
  {
    name: 'className',
    type: 'string',
    fallback: "''",
    description:
      'Width and placement — w-full, flex-1, w-72, a margin — and the component sets none of them. A field is as wide as the form says. It shipped with w-full baked in for one release, which read as a convenience and was a silent override: w-full is emitted after w-72 in Tailwind’s width group, so every caller asking for a narrow field got a full-width one and nothing said so.',
  },
]

export function InputEntry({ theme, onOpen }: { theme: DesktopTheme; onOpen?: (id: string) => void }) {
  return (
    <article className="flex flex-col divide-y divide-hairline">
      <EntryHeader title="Input" uses={usesOf('input')} onOpen={onOpen}>
        A box you type in — one line or several. It replaced <code>INPUT</code> in the app’s
        <code> theme/controls.ts</code>: one class string, twenty-four fields, ten files, and a
        different set of hand-appended utilities at almost every call site.
      </EntryHeader>

      <EntrySection
        title="One line or several, and it is one component"
        note="Six of those twenty-four fields were textareas wearing the same string plus a resize class. A field is a field whether it holds a name or a paragraph — and a textarea taking its padding from one place and its resize rule from another was a box that only looked like the ones above it."
      >
        <Stage theme={theme} className="flex flex-col gap-4">
          <Specimen label="single line">
            <Playground placeholder="acme-checkout-api"  className="w-full"/>
          </Specimen>
          <Specimen label="multiline — three rows, no resize">
            <Playground multiline placeholder="What this skill is for…"  className="w-full"/>
          </Specimen>
        </Stage>
      </EntrySection>

      <EntrySection
        title="Four rungs off the shared ladder"
        note="24 / 28 / 32 / 36 — the same pixels Button, ButtonIcon, Label and Status stand on, so a field and a button on one row are the same height by construction rather than by eye. Four and not seven: nothing smaller than 24 holds a caret and a word, and a 40px field is a search bar rather than a form field."
      >
        <Stage theme={theme} className="flex flex-col gap-3">
          {SIZES.map((size) => (
            <Specimen key={size} label={size}>
              <Playground size={size} placeholder="acme-checkout-api" className="w-72" />
            </Specimen>
          ))}
        </Stage>
      </EntrySection>

      <EntrySection
        title="A mark inside, and room kept at the other edge"
        note="The Tasks search box is what both were written for: a glyph at the left, and up to two status controls at the right that belong to the board rather than to the field. The field owns the mark and owes the rest space — a named amount of it, because a pr-14 in className would race the rung’s own padding."
      >
        <Stage theme={theme} className="flex flex-col gap-3">
          <Specimen label="icon">
            <Playground icon={Search} placeholder="Search the backlog" className="w-72" />
          </Specimen>
          <Specimen label="icon + trailing=&quot;wide&quot;">
            <Playground icon={Search} trailing="wide" placeholder="Search the backlog" className="w-72" />
          </Specimen>
        </Stage>
      </EntrySection>

      <EntrySection
        title="The states"
        note="disabled dims from inside the tone, where the constant left it to the caller and four of the app’s seven disableable fields remembered to say so. invalid paints the hairline red at rest and focused — one override, both tones. mono is the one typographic choice a field gets, and it is here because the app already made it twice by appending font-mono."
      >
        <Stage theme={theme} className="flex flex-col gap-3">
          <Specimen label="disabled">
            <Playground disabled placeholder="my-skill" className="w-72" />
          </Specimen>
          <Specimen label="invalid">
            <Playground invalid placeholder="https://company.atlassian.net/browse/" className="w-72" />
          </Specimen>
          <Specimen label="mono">
            <Playground mono placeholder="Bash(*), Read, Edit, Write" className="w-72" />
          </Specimen>
        </Stage>
      </EntrySection>

      <EntrySection
        title="The paper tone"
        note="For a surface that is white whatever the theme is, and the app has one: the sign-in card, glass on the release mesh. Every ground above is mixed from the theme’s own surface and ink, which on a fixed white card is a plate at 6% of a ground that is not there and type that is white on four themes out of eight. ButtonIcon grew a tone of the same name for the same screen. Switch the theme above — this pair does not move."
      >
        <Stage theme={theme}>
          <div className="rounded-3xl bg-release-mesh p-8">
            <div
              style={{ backdropFilter: 'blur(14px) saturate(140%)' }}
              className="flex flex-col gap-2 rounded-2xl border border-release-paper/50 bg-release-paper/35 p-5 shadow-glass"
            >
              <Playground tone="paper" size="xl" type="email" placeholder="you@acme.dev"  className="w-full"/>
              <Playground tone="paper" size="xl" type="password" placeholder="Password"  className="w-full"/>
            </div>
          </div>
        </Stage>
      </EntrySection>

      <EntrySection
        title="A password is spaced"
        note="The browser replaces every character with a bullet, and bullets set at the tracking of a normal sentence run together into a grey bar: there is no word shape to read, so the only thing left telling you a keystroke registered is that the bar got marginally longer. 0.25em and not tracking-widest’s 0.1em — that ladder is tuned for letters, which have shapes of their own; a column of identical circles needs a quarter of an em to read as separate marks."
      >
        <Stage theme={theme} className="flex flex-col gap-2">
          <Specimen label="type in it — the placeholder is untouched, the bullets are not">
            <Playground type="password" placeholder="Password" className="w-full" />
          </Specimen>
        </Stage>
        <p className="max-w-2xl text-xs leading-relaxed text-muted">
          The spacing applies only while there is something to space. “Confirm new
          password” stretched to a quarter of an em reads as a title rather than a
          prompt, and it is the one string in the field that is words and not bullets —
          hence the <code>:not(:placeholder-shown)</code> guard. A field with no
          placeholder matches it at all times, which is the right answer there too:
          nothing to distort.
        </p>
      </EntrySection>

      <EntrySection title="Props">
        <PropsTable rows={PROPS} />
        <Snippet>{`import { Input } from '@ds/desktop'

<Input value={name} onChange={setName} placeholder="my-skill" />

<Input
  multiline
  value={body}
  onChange={setBody}
  rows={16}
  mono
  resize="vertical"
/>`}</Snippet>
      </EntrySection>
    </article>
  )
}

/**
 * Every specimen holds its own text, because a field that cannot be typed into is a
 * picture of a field — and the one thing worth checking here is what the caret, the
 * placeholder and the focus hairline do under each theme.
 *
 * THE TWO SHAPES ARE SPELLED APART rather than spread from one optional-`multiline`
 * object, and that is the discriminated union working as intended: `multiline?: boolean`
 * satisfies neither branch, because `true | undefined` is not `true`. Anything that has
 * to hand props through to this component has to decide which kind of field it is
 * describing — which is the whole reason the union is there.
 */
type CommonProps = {
  placeholder?: string
  size?: InputSize
  tone?: InputTone
  className?: string
  disabled?: boolean
  invalid?: boolean
  mono?: boolean
}

function Playground({
  multiline,
  icon,
  trailing,
  type,
  ...common
}: CommonProps & {
  multiline?: boolean
  icon?: IconComponent
  trailing?: InputTrailing
  type?: 'text' | 'email' | 'password'
}) {
  const [value, setValue] = useState('')
  if (multiline) return <Input multiline {...common} value={value} onChange={setValue} />
  return <Input {...common} type={type} icon={icon} trailing={trailing} value={value} onChange={setValue} />
}
