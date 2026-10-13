import { readFileSync, readdirSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * The RLS on `user_settings` lets a user write their whole row, so nothing on the server
 * stops the iPhone from changing a sensitive setting (launch mode, default model,
 * workflows…). The guarantee lives in the app: ONE Swift file writes to the table, and it
 * only takes an `EditableSetting`, the generated enum that has no sensitive column in it.
 * This scan keeps it that way: a second writer, or a writer taking a free column name,
 * fails `npm test`.
 */

const SOURCES = join(__dirname, '..', 'MagicSlash')
const WRITER = 'Settings/SettingsWriter.swift'
const GENERATED = 'Settings/SettingsAccess.generated.swift'

function swiftFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) return swiftFiles(path)
    return entry.name.endsWith('.swift') ? [path] : []
  })
}

/** The code without its comments, so a doc comment naming the table is not a write. */
function code(path: string): string {
  return readFileSync(path, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '')
}

/**
 * Whether the source writes to `user_settings`: a `.from("user_settings")` whose call
 * chain, up to its `.execute(`, holds an upsert, update, insert or delete. Reads
 * (`.select`) and the Realtime subscription (`table: "user_settings"`) are not writes.
 */
function writesUserSettings(source: string): boolean {
  const from = /\.from\(\s*"user_settings"\s*\)/g
  for (const match of source.matchAll(from)) {
    const rest = source.slice(match.index)
    const end = rest.indexOf('.execute(')
    const chain = end === -1 ? rest.slice(0, 600) : rest.slice(0, end)
    if (/\.(upsert|update|insert|delete)\s*\(/.test(chain)) return true
  }
  return false
}

/** The raw values of a generated `enum Name: String`, each case's column. */
function enumColumns(source: string, name: string): string[] {
  const body = new RegExp(`enum ${name}\\b[^{]*\\{([\\s\\S]*?)\\n\\}`).exec(source)?.[1]
  if (!body) throw new Error(`enum ${name} not found in ${GENERATED}`)
  return [...body.matchAll(/^\s*case\s+(\w+)(?:\s*=\s*"([^"]+)")?/gm)].map((m) => m[2] ?? m[1])
}

describe('iOS writes to user_settings', () => {
  const files = swiftFiles(SOURCES)

  it('scans the app sources', () => {
    expect(files.map((f) => relative(SOURCES, f))).toContain(WRITER)
  })

  it('happen in SettingsWriter.swift only', () => {
    const writers = files.filter((f) => writesUserSettings(code(f))).map((f) => relative(SOURCES, f))
    expect(writers).toEqual([WRITER])
  })

  it('take the column as an EditableSetting, never a free name', () => {
    const source = code(join(SOURCES, WRITER))
    expect(source).toMatch(/func\s+write\s*\(\s*_\s+column\s*:\s*EditableSetting\b/)
    // The row is the user id and that column, nothing else.
    expect(source).toMatch(/column\.rawValue\s*:/)
    const literalKeys = [...source.matchAll(/"([\w-]+)"\s*:/g)].map((m) => m[1])
    expect(literalKeys).toEqual(['user_id'])
  })

  it('cannot name a sensitive column: EditableSetting and SensitiveSetting do not overlap', () => {
    const generated = readFileSync(join(SOURCES, GENERATED), 'utf8')
    const editable = enumColumns(generated, 'EditableSetting')
    const sensitive = enumColumns(generated, 'SensitiveSetting')
    expect(editable).toContain('theme')
    expect(editable.filter((column) => sensitive.includes(column))).toEqual([])
    // The ones the ticket names, whatever else is classified sensitive.
    for (const column of ['launch_mode', 'default_model', 'default_agent_type', 'auto_start_at_login', 'workflow_run_actions']) {
      expect(sensitive).toContain(column)
    }
  })
})
