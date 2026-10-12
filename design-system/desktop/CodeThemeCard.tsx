import { Card } from './Card'
import { CodeSample } from './CodeSample'
import { Select, type SelectProps } from './Select'
import { SettingRow, type SettingRowProps } from './SettingRow'
import { Text } from './Text'

/**
 * HOW CODE WILL LOOK, SET AND SHOWN ON ONE PLATE: the settings rows on top, and under
 * them a sample diff drawn in what those rows say, with its language picked in its corner.
 *
 * Settings → Code & reviews. The rows are `SettingRow` data, like `SettingsCard`'s, and
 * are separated the same way (a hairline above every row but the first). What this adds
 * is the preview, which is not a row: it has no value of its own, it shows the value of
 * the rows above it.
 *
 * THE PREVIEW IS DATA TOO. `CodeSample` is imported here rather than handed in as a node,
 * so the frame, the corner picker and the loading height are this component's and no
 * call site redraws them.
 */
export interface CodeThemeCardRow extends SettingRowProps {
  /** Stable across renders, as on `SettingsCardRow`. */
  id: string
}

export interface CodeThemeCardPreview {
  /** `loading` holds the sample's height; `failed` says so in `failedLabel`. */
  state: 'loading' | 'ready' | 'failed'
  html: string | null
  content: string
  appearance: 'light' | 'dark'
  fontSize: number
  blend?: boolean
  /** Translated. */
  failedLabel: string
  /** The sample's language, drawn in the preview's top-right corner. */
  language: Pick<SelectProps, 'value' | 'options' | 'onChange' | 'ariaLabel'>
}

export interface CodeThemeCardProps {
  rows: CodeThemeCardRow[]
  preview: CodeThemeCardPreview
  /** Margins and width. */
  className?: string
}

export function CodeThemeCard({ rows, preview, className = '' }: CodeThemeCardProps) {
  return (
    <Card className={`flex flex-col gap-4 ${className}`.trim()}>
      {rows.map(({ id, ...row }, index) => (
        <div key={id} className={index > 0 ? 'border-t border-line-subtle pt-4' : ''}>
          <SettingRow {...row} />
        </div>
      ))}
      <div className="relative rounded-lg border border-line overflow-hidden">
        <div className="absolute top-2 right-2 z-10">
          <Select {...preview.language} fit />
        </div>
        {preview.state === 'failed' ? (
          <Text size="xs" tone="secondary" className="block px-4 py-3">
            {preview.failedLabel}
          </Text>
        ) : preview.state === 'loading' ? (
          // Roughly the sample's height, so the card does not jump when it lands.
          <div className="h-56" />
        ) : (
          <CodeSample
            html={preview.html}
            content={preview.content}
            appearance={preview.appearance}
            fontSize={preview.fontSize}
            blend={preview.blend}
          />
        )}
      </div>
    </Card>
  )
}
