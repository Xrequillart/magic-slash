import type { NewPlanLink, PlanLink, PlanLinksRead } from '../../types'
import { getAuthedClient } from './auth'
import { loadSession } from './session-store'
import { listOrgsRead } from './org'
import { fetchAuthors } from './plans'

/**
 * The external links pinned to a plan: read, add, remove. `plan_links`' policies decide who
 * may do which (20260923110000) — nothing here authorizes anything — and every write answers
 * a boolean, because the renderer's next move is a refetch either way. The shape is
 * `planComments.ts`', one table over.
 */

interface PlanLinkRow {
  id: string
  session_id: string
  author_id: string
  url: string
  kind: string | null
  title: string | null
  created_at: string | null
}

const LINK_COLUMNS = 'id, session_id, author_id, url, kind, title, created_at'

/** Far past anything a plan carries; a ceiling so a runaway table cannot stall the page. */
const LINK_LIMIT = 200

const NOTHING: PlanLinksRead = { links: [], emailByAuthor: {}, failed: false }

function toPlanLink(row: PlanLinkRow): PlanLink {
  return {
    id: row.id,
    sessionId: row.session_id,
    authorId: row.author_id,
    url: row.url,
    kind: row.kind ?? 'other',
    title: row.title ?? undefined,
    createdAt: row.created_at ?? undefined,
  }
}

export async function listPlanLinks(sessionId: string): Promise<PlanLinksRead> {
  const client = await getAuthedClient()
  if (!client) return NOTHING

  const [read, orgs] = await Promise.all([
    client
      .from('plan_links')
      .select(LINK_COLUMNS)
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })
      .limit(LINK_LIMIT),
    listOrgsRead(),
  ])
  if (read.error || !read.data) {
    console.error('[cloud] plan links read refused:', read.error)
    return { ...NOTHING, failed: true }
  }

  const links = (read.data as unknown as PlanLinkRow[]).map(toPlanLink)
  if (links.length === 0) return NOTHING
  const authors = await fetchAuthors(orgs.orgs, new Set(links.map((link) => link.authorId))).catch((error) => {
    console.error('[cloud] plan link authors unresolved:', error)
    return { emailByOwner: {}, avatarByOwner: {} }
  })
  return { links, emailByAuthor: authors.emailByOwner, failed: false }
}

export async function createPlanLink(input: NewPlanLink): Promise<boolean> {
  const client = await getAuthedClient()
  if (!client) return false
  const { data } = await client.auth.getSession()
  const authorId = data.session?.user?.id ?? loadSession()?.user?.id
  if (!authorId) {
    console.error('[cloud] plan link not written: no user id on the session')
    return false
  }
  const { error } = await client.from('plan_links').insert({
    session_id: input.sessionId,
    author_id: authorId,
    url: input.url,
    kind: input.kind,
    title: input.title ?? null,
  })
  if (error) console.error('[cloud] plan link insert refused:', error)
  return !error
}

export async function deletePlanLink(id: string): Promise<boolean> {
  const client = await getAuthedClient()
  if (!client) return false
  const { error } = await client.from('plan_links').delete().eq('id', id)
  if (error) console.error('[cloud] plan link delete refused:', error)
  return !error
}
