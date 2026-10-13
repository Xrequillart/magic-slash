import { describe, expect, it } from 'vitest'
import { EDITABLE_SETTING_COLUMNS, SENSITIVE_SETTING_COLUMNS } from '../../desktop/src/main/store/user-settings-access'
import { renderSwiftSettings, swiftCaseName } from './renderSwiftSettings'

/**
 * The iOS app's settings access is a Swift file generated from the desktop's
 * SETTINGS_ACCESS. Same arrangement as the theme: `npm run ios:settings` runs this with
 * `-u` to write the file, and a plain `npm test` fails when the committed file no longer
 * matches — a column classified on the desktop without regenerating the Swift side.
 */
describe('the iOS settings access', () => {
  it('matches the desktop classification (run `npm run ios:settings` after changing it)', async () => {
    await expect(renderSwiftSettings()).toMatchFileSnapshot('../MagicSlash/Settings/SettingsAccess.generated.swift')
  })
})

/** The raw values of one generated enum, read back out of the rendered file. */
function enumColumns(swift: string, name: string): string[] {
  const body = new RegExp(`enum ${name}: String, CaseIterable, Sendable \\{\\n([\\s\\S]*?)\\n\\}`).exec(swift)
  if (!body) throw new Error(`enum ${name} not found`)
  return body[1].split('\n').map((line) => {
    const m = /^ {2}case (\w+)(?: = "(\w+)")?$/.exec(line)
    if (!m) throw new Error(`unexpected line in ${name}: ${line}`)
    return m[2] ?? m[1]
  })
}

describe('editable and sensitive', () => {
  it('are disjoint', () => {
    expect(EDITABLE_SETTING_COLUMNS.filter((column) => SENSITIVE_SETTING_COLUMNS.includes(column))).toEqual([])
  })

  it('EditableSetting names every editable column and no sensitive one', () => {
    const swift = renderSwiftSettings()
    const editable = enumColumns(swift, 'EditableSetting')
    expect(editable).toEqual([...EDITABLE_SETTING_COLUMNS])
    expect(editable.filter((column) => (SENSITIVE_SETTING_COLUMNS as readonly string[]).includes(column))).toEqual([])
    expect(enumColumns(swift, 'SensitiveSetting')).toEqual([...SENSITIVE_SETTING_COLUMNS])
  })

  it('offers choices for editable columns only', () => {
    const swift = renderSwiftSettings()
    const choices = swift.slice(swift.indexOf('enum SettingChoices'))
    for (const column of SENSITIVE_SETTING_COLUMNS) {
      expect(choices).not.toContain(`static let ${swiftCaseName(column)}:`)
    }
  })
})

describe('swiftCaseName', () => {
  it('turns a column into lowerCamelCase', () => {
    expect(swiftCaseName('theme')).toBe('theme')
    expect(swiftCaseName('notification_pr_changes_requested')).toBe('notificationPrChangesRequested')
    expect(swiftCaseName('pr_reviews_poll_interval_ms')).toBe('prReviewsPollIntervalMs')
  })
})
