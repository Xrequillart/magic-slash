import { Icon } from './Icon'
import { FileText, Image as ImageGlyph, Lock } from './icons'
import { Label } from './Label'
import { Text } from './Text'

/**
 * WHAT A SKILL IS, read rather than edited: its picture, its name, where it came from,
 * what it does, what it may touch, and the file it lives in.
 *
 * IT IS THE FRONTMATTER AS A CARD. A built-in skill and one that lives in a repository
 * cannot be changed from here, and the page used to say so by showing the editor with
 * every field disabled — which announced "you may not touch this" far louder than it
 * said what the skill was for, with the instructions themselves greyed out in a
 * monospace textarea. A document has a masthead; a form has fields you cannot fill.
 *
 * `SkillCard` IS THE SAME SUBJECT AT A DIFFERENT DISTANCE — a tile in a grid you are
 * scanning, three facts and an arrow. This is the one you arrived at.
 *
 * NO OUTLINE, the folder's standing call: the plate is the edge. It wore
 * `rounded-2xl bg-surface-subtle border border-line-field`, and the radius was off the
 * ladder too — `rounded-xl` is what every panel in the app wears.
 */

export interface SkillHeaderProps {
  name: string
  /** The picture, a `data:` URL. Absent draws the empty plate and its glyph. */
  imageUrl?: string | null
  /**
   * Where it came from — "Built-in", "magic-slash". `color` is a CSS value,
   * `Label.color`'s contract: what a hue means belongs to the caller.
   */
  source?: { label: string; color?: string }
  /**
   * The words for "read-only", translated. Present draws the padlock chip; absent draws
   * nothing, which is what an editable skill wants.
   *
   * A STRING AND NOT A BOOLEAN, because the chip is a WORD and this folder cannot look
   * one up. The presence of the word is the flag.
   */
  readOnlyLabel?: string
  /** What the skill does. Wraps — it is the one thing here anybody reads in full. */
  description?: string
  /** The label for `argumentHint`, translated — the value alone would be a bare string. */
  argumentLabel?: string
  /** What the skill expects after its name, drawn as the code it is. */
  argumentHint?: string
  /** The label over the tool chips, translated. */
  toolsLabel?: string
  /** `Bash(*)`, `Read`, `Edit` — one chip each, already split by the caller. */
  tools?: string[]
  /** Where the file is, drawn as the path it is. Truncates. */
  sourcePath?: string
  /** Margins and width. Not the plate, the padding or the radius. */
  className?: string
}

export function SkillHeader({
  name,
  imageUrl,
  source,
  readOnlyLabel,
  description,
  argumentLabel,
  argumentHint,
  toolsLabel,
  tools = [],
  sourcePath,
  className = '',
}: SkillHeaderProps) {
  return (
    <div className={`rounded-xl bg-surface-subtle px-5 py-4 ${className}`.trim()}>
      <div className="flex items-start gap-3.5">
        {/* 48px — `SkillCard`'s plate, so the thing you scanned and the thing you opened
            wear their picture at one size. */}
        <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg bg-surface">
          {imageUrl ? (
            <img src={imageUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <Icon glyph={ImageGlyph} size="md" tone="muted" />
          )}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Text size="xl" weight="bold" className="capitalize">
              {name}
            </Text>
            {source && (
              <Label size="2xs" color={source.color}>
                {source.label}
              </Label>
            )}
            {/* NEUTRAL AND NOT A COLOUR. Read-only is not a warning and not a failure —
                it is the ordinary state of most of these — so the chip wears the grey
                plate `Label` gives anything with no hue of its own. */}
            {readOnlyLabel && (
              <Label size="2xs" icon={Lock}>
                {readOnlyLabel}
              </Label>
            )}
          </div>

          {description && (
            <Text size="sm" tone="secondary" className="mt-2 block leading-relaxed">
              {description}
            </Text>
          )}

          {argumentHint && (
            <span className="mt-2 flex flex-wrap items-baseline gap-1.5">
              {argumentLabel && (
                <Text size="xs" tone="secondary" weight="bold" className="opacity-60">
                  {argumentLabel}
                </Text>
              )}
              <Text size="xs" tone="secondary" className="font-mono">
                {argumentHint}
              </Text>
            </span>
          )}
        </div>
      </div>

      {tools.length > 0 && (
        // The one hairline this card keeps, and it is not an outline: it divides the
        // masthead from the permissions under it, which are a different KIND of fact.
        <div className="mt-3.5 flex flex-wrap items-center gap-2 border-t border-line-subtle pt-3.5">
          {toolsLabel && (
            <Text size="xs" tone="secondary" className="mr-1 opacity-60">
              {toolsLabel}
            </Text>
          )}
          {tools.map((tool) => (
            // `font-mono` on the label, which the `Text` inside it inherits: a tool
            // pattern is code, and `Bash(*)` set in the UI face reads as prose.
            <Label key={tool} size="2xs" className="font-mono">
              {tool}
            </Label>
          ))}
        </div>
      )}

      {sourcePath && (
        <div className="mt-2.5 flex min-w-0 items-center gap-1.5 text-icon-muted">
          <Icon glyph={FileText} size="xs" tone="inherit" className="flex-shrink-0" />
          <Text size="xs" tone="inherit" className="truncate font-mono" title={sourcePath}>
            {sourcePath}
          </Text>
        </div>
      )}
    </div>
  )
}
