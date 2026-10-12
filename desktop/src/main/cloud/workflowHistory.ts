import { EMPTY_WORKFLOW_HISTORY, type WorkflowHistoryEvent, type WorkflowHistoryRead } from '../../types'
import { getAuthedClient } from './auth'
import { listOrgsRead } from './org'
import { fetchAuthors } from './plans'

/**
 * A repository's workflow history: every save of its flow (`repository_workflows`) and
 * every change of its /magic:start settings (`repositories.start`), read off
 * `settings_events`.
 *
 * NOTHING HERE WRITES IT, nor anything in the app: the audit trigger `log_settings_change`
 * does, in the statement of the save it records, with `auth.uid()` as the actor. What a
 * reader sees is the policy's answer: an org member sees the team's history of a shared
 * repository, and a personal repository's history is its author's alone.
 *
 * THE ROWS, AS THE TRIGGER WRITES THEM:
 *  - the flow's first save is a `created` event carrying the whole row, its last one (back
 *    to the default flow deletes the row) a `deleted` one, and every save between an
 *    `updated` event on `definition`, old and new overlay side by side;
 *  - a start change is an `updated` event on `repositories`, setting `start`. The row's
 *    creation and deletion are the repository's, not its settings', and are left out.
 */

interface SettingsEventRow {
  id: string
  scope: string
  action: string
  setting: string | null
  old_value: unknown
  new_value: unknown
  user_id: string | null
  occurred_at: string
}

const COLUMNS = 'id, scope, action, setting, old_value, new_value, user_id, occurred_at'

/** How many one opening brings back, newest first, asked for one more to know there are more. */
const LIMIT = 200

/** The `definition` of a whole `repository_workflows` row, or null when there was none. */
function definitionOf(row: unknown): unknown {
  return row && typeof row === 'object' ? (row as { definition?: unknown }).definition ?? null : null
}

/** A row as the history's event, or null when it is not one the history draws. */
export function toWorkflowHistoryEvent(row: SettingsEventRow): WorkflowHistoryEvent | null {
  const base = { id: row.id, actorId: row.user_id ?? undefined, occurredAt: row.occurred_at }
  if (row.scope === 'repositories') {
    if (row.action !== 'updated' || row.setting !== 'start') return null
    return { ...base, scope: 'start', before: row.old_value ?? null, after: row.new_value ?? null }
  }
  if (row.scope !== 'repository_workflows') return null
  if (row.action === 'created') return { ...base, scope: 'workflow', before: null, after: definitionOf(row.new_value) }
  if (row.action === 'deleted') return { ...base, scope: 'workflow', before: definitionOf(row.old_value), after: null }
  if (row.action === 'updated' && row.setting === 'definition') {
    return { ...base, scope: 'workflow', before: row.old_value ?? null, after: row.new_value ?? null }
  }
  return null
}

export async function listWorkflowHistory(repoId: string): Promise<WorkflowHistoryRead> {
  const client = await getAuthedClient()
  if (!client) return EMPTY_WORKFLOW_HISTORY

  const [read, orgs] = await Promise.all([
    client
      .from('settings_events')
      .select(COLUMNS)
      .eq('target_id', repoId)
      .or('scope.eq.repository_workflows,and(scope.eq.repositories,setting.eq.start)')
      .order('occurred_at', { ascending: false })
      .limit(LIMIT + 1),
    listOrgsRead(),
  ])
  if (read.error || !read.data) {
    console.error('[cloud] workflow history read refused:', read.error)
    return { ...EMPTY_WORKFLOW_HISTORY, failed: true }
  }

  const rows = read.data as unknown as SettingsEventRow[]
  const truncated = rows.length > LIMIT
  const events = rows.slice(0, LIMIT).map(toWorkflowHistoryEvent).filter((event): event is WorkflowHistoryEvent => event !== null)
  if (events.length === 0) return { ...EMPTY_WORKFLOW_HISTORY, truncated }

  const people = new Set(events.flatMap((event) => (event.actorId ? [event.actorId] : [])))
  const authors = await fetchAuthors(orgs.orgs, people).catch((error) => {
    console.error('[cloud] workflow history authors unresolved:', error)
    return { emailByOwner: {}, avatarByOwner: {} }
  })
  return { events, emailByAuthor: authors.emailByOwner, avatarByAuthor: authors.avatarByOwner, truncated, failed: false }
}
