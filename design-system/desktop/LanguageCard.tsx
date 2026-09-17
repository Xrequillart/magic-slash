import { Card } from './Card'
import { SettingRow } from './SettingRow'
import { Text } from './Text'

/**
 * WHICH LANGUAGE THE PRODUCT SPEAKS TO YOU IN — the one card that offers the choice.
 *
 * ── WHY THIS IS A COMPONENT AND NOT A ROW IN A CARD ───────────────────────────────
 *
 * Because "choose a language" is a shape with three parts that keep drifting apart, and
 * the app had them in three files: a picker that shows a FLAG beside each name, the names
 * written in the language they name, and a line of small print separating this choice
 * from the other language settings in the product. The last one is the reason the card
 * exists at all — the desktop has language settings PER REPOSITORY, which are the
 * languages Claude WRITES in, and users confuse the two constantly. A card whose
 * arrangement carries that distinction stops it being a paragraph somebody has to
 * remember to paste.
 *
 * ── THE NAMES ARE NOT TRANSLATED, AND THAT IS THE WHOLE TRICK ─────────────────────
 *
 * Every language is named IN ITSELF — English, Français — so the list reads correctly
 * whatever the app is currently showing. A reader who has accidentally set the app to a
 * language they cannot read has exactly one way back, and it is this list: translating it
 * would mean the way out is written in the language they are trying to escape.
 *
 * So the card takes the names as DATA and never through a translator. They are the
 * caller's because WHICH languages the product ships in is the product's, and the flag is
 * the `Flag` component's own code — the same one the quick-settings tiles wear.
 *
 * ── THE ROW IS `SettingRow` ───────────────────────────────────────────────────────
 *
 * Deliberately, and it is what keeps this card from being its own dialect: the interface
 * language is a setting like any other, drawn at the same rung as the launch mode and the
 * sidebar panels, and only the small print underneath is particular to it.
 */

/** One language on offer: what it is worth, what it calls itself, and its flag. */
export interface LanguageCardOption {
  /** The code the app stores — `en`, `fr`. What `onChange` hands back. */
  value: string
  /**
   * The language's name IN ITSELF. Never translated — see the header.
   */
  label: string
  /** The flag's code, `Flag`'s own. Absent draws a name with no mark. */
  flag?: string
}

export interface LanguageCardProps {
  /** What the setting is called, in the language currently showing. Translated. */
  label: string
  /** What it changes, quieter, under the name. Translated. */
  hint?: string
  /**
   * The small print under the row: what this setting is NOT.
   *
   * Optional in the type and all but required in practice — see the header. A product
   * with only one kind of language setting can leave it out.
   */
  note?: string
  /** The code in force. A value matching nothing shows the picker's placeholder. */
  value: string
  options: LanguageCardOption[]
  onChange: (value: string) => void
  /** The picker's width. The settings column's, which the caller owns. */
  width?: number
  /** Nothing can be chosen — a read-only page, a write in flight. */
  disabled?: boolean
  /** Margins and width. Not the ground, the padding or the radius. */
  className?: string
}

export function LanguageCard({
  label,
  hint,
  note,
  value,
  options,
  onChange,
  width,
  disabled = false,
  className = '',
}: LanguageCardProps) {
  return (
    <Card className={`flex flex-col gap-4 ${className}`.trim()}>
      <SettingRow
        label={label}
        hint={hint}
        disabled={disabled}
        control={{
          kind: 'select',
          value,
          options: options.map((option) => ({
            value: option.value,
            label: option.label,
            flag: option.flag,
          })),
          onChange,
          ariaLabel: label,
          width,
          disabled,
        }}
      />
      {/* NOT `SettingRow`'s own `note`, which sits tight under the row and says what the
          current VALUE means. This one is about the setting's place in the product and
          holds true whichever language is picked, so it stands apart from the row at the
          card's own gap. */}
      {note && (
        <Text size="xs" tone="secondary" className="block leading-relaxed opacity-50">
          {note}
        </Text>
      )}
    </Card>
  )
}
