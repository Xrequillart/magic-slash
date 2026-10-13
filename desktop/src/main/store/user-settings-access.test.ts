import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import type { Config } from '../../types'
import { EDITABLE_SETTING_COLUMNS, SENSITIVE_SETTING_COLUMNS, SETTINGS_ACCESS } from './user-settings-access'
import { configToSettingsRow, USER_SETTINGS_COLUMN_NAMES } from './user-settings-mapper'

/**
 * Every column of public.user_settings must be classified, editable or sensitive, before
 * the iPhone can be trusted with the table. TypeScript already refuses an unclassified key
 * of UserSettingsRow; what it cannot see is a column added by a MIGRATION and never
 * declared on the desktop. So the column list is read three ways — the classification,
 * the mapper, and the schema the migrations actually build — and they must agree.
 */

const MIGRATIONS_DIR = join(__dirname, '../../../../supabase/migrations')

/** Bookkeeping columns, not settings. */
const NOT_SETTINGS = new Set(['user_id', 'created_at', 'updated_at'])

/**
 * Columns still in the table that no build reads any more, so neither the mapper nor the
 * phone ever sees them. code_theme was replaced by code_syntax (20260928110000) and left
 * in place for older builds. Dropping one in a migration is the way off this list.
 */
const RETIRED = new Set(['code_theme'])

const HINT =
  'Classify the column in SETTINGS_ACCESS (desktop/src/main/store/user-settings-access.ts), ' +
  'map it in user-settings-mapper.ts, and add it to EVERY_FIELD ' +
  'in webapp/lib/settingsCatalog.test.ts.'

/** Split on the commas that are not inside parentheses. */
function topLevelItems(body: string): string[] {
  const items: string[] = []
  let depth = 0
  let current = ''
  for (const char of body) {
    if (char === '(') depth++
    if (char === ')') depth--
    if (char === ',' && depth === 0) {
      items.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  if (current.trim()) items.push(current.trim())
  return items
}

/** Replays every migration, in filename order, and returns user_settings' columns. */
function columnsFromMigrations(): Set<string> {
  const columns = new Set<string>()
  const files = readdirSync(MIGRATIONS_DIR).filter((name) => name.endsWith('.sql')).sort()
  for (const file of files) {
    const sql = readFileSync(join(MIGRATIONS_DIR, file), 'utf8')
      .replace(/--[^\n]*/g, '')
      // Function bodies: their semicolons are not statement ends, and nothing in them
      // changes a table's shape.
      .replace(/\$(\w*)\$[\s\S]*?\$\1\$/g, '')
      // String literals (comments on columns, CHECK lists) can hold commas and parentheses.
      .replace(/'(?:[^']|'')*'/g, "''")
    for (const raw of sql.split(';')) {
      const statement = raw.replace(/\s+/g, ' ').trim().toLowerCase()

      const created = /^create table (?:if not exists )?(?:public\.)?user_settings \((.*)\)$/.exec(statement)
      if (created) {
        for (const item of topLevelItems(created[1])) {
          const name = item.split(' ')[0]
          if (['constraint', 'primary', 'unique', 'check', 'foreign', 'exclude'].includes(name)) continue
          columns.add(name)
        }
        continue
      }

      const altered = /^alter table (?:if exists )?(?:only )?(?:public\.)?user_settings (.*)$/.exec(statement)
      if (!altered) continue
      for (const clause of topLevelItems(altered[1])) {
        const added = /^add column (?:if not exists )?(\w+)/.exec(clause)
        if (added) columns.add(added[1])
        const dropped = /^drop column (?:if exists )?(\w+)/.exec(clause)
        if (dropped) columns.delete(dropped[1])
        const renamed = /^rename column (\w+) to (\w+)/.exec(clause)
        if (renamed) {
          columns.delete(renamed[1])
          columns.add(renamed[2])
        }
      }
    }
  }
  return columns
}

const sorted = (names: Iterable<string>): string[] => [...names].sort()

describe('user_settings column classification', () => {
  const classified = sorted(Object.keys(SETTINGS_ACCESS))

  it('classifies exactly the columns the mapper reads and writes', () => {
    expect(sorted(USER_SETTINGS_COLUMN_NAMES), HINT).toEqual(classified)
    const emptyConfig = { version: 'test', repositories: {} } as Config
    expect(sorted(Object.keys(configToSettingsRow(emptyConfig))), HINT).toEqual(classified)
  })

  it('classifies exactly the columns the migrations create', () => {
    const fromMigrations = [...columnsFromMigrations()].filter((name) => !NOT_SETTINGS.has(name) && !RETIRED.has(name))
    expect(sorted(fromMigrations), HINT).toEqual(classified)
  })

  it('reads the migrations rather than finding nothing', () => {
    // A parser that silently matched no statement would make the test above compare
    // two empty lists the day the mapper is emptied too.
    const columns = columnsFromMigrations()
    expect(columns.has('theme')).toBe(true)
    expect(columns.has('history_enabled')).toBe(false)
    expect(columns.has('chat_compact_composer')).toBe(false)
  })

  it('keeps what makes the Mac run something, or is the Mac’s own, read-only on the phone', () => {
    const sensitive = [
      'launch_mode',
      'quick_launch_repo',
      'quick_launch_background',
      'quick_launch_launch_mode',
      'pr_reviews_auto_launch_skills',
      'workflow_confirm_chain',
      'workflow_chain_limit',
      'workflow_missing_skill',
      'workflow_run_actions',
      'default_model',
      'default_agent_type',
      'auto_start_at_login',
      'spotlight_shortcut',
      'usage_logs_enabled',
      'plan_sync_enabled',
      'split_active',
      'split_enabled',
      'tasks_repo',
      'plans_repo',
    ] as const
    for (const column of sensitive) expect(SETTINGS_ACCESS[column], column).toBe('sensitive')
    // Every family by prefix too, so a new quick_launch_* or workflow_* column cannot
    // slip in as editable.
    for (const column of classified) {
      if (/^(quick_launch_|workflow_)/.test(column)) expect(SETTINGS_ACCESS[column as keyof typeof SETTINGS_ACCESS], column).toBe('sensitive')
    }
  })

  it('derives two disjoint lists that cover every column', () => {
    expect(EDITABLE_SETTING_COLUMNS.filter((column) => SENSITIVE_SETTING_COLUMNS.includes(column))).toEqual([])
    expect(sorted([...EDITABLE_SETTING_COLUMNS, ...SENSITIVE_SETTING_COLUMNS])).toEqual(classified)
  })
})
