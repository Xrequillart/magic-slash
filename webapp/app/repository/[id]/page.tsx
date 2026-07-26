'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { AlertTriangle, ArrowLeft, FolderGit2, Lock, Trash2 } from 'lucide-react'
import { useRequireSession } from '@/lib/session'
import { fetchOrgs, type Org } from '@/lib/orgs'
import {
  deleteRepository,
  expandPatch,
  fetchRepository,
  updateRepository,
  type Repository,
  type RepositoryPatch,
} from '@/lib/repositories'
import { AppShell } from '@/components/AppShell'
import { Modal } from '@/components/Modal'
import { RepositoryForm } from '@/components/RepositoryForm'
import { Button, Card, FullPageLoader } from '@/components/ui'

/**
 * Repository settings. Every change writes straight to the `repositories` table,
 * which is the desktop app's source of truth for repo config and is published to
 * realtime — so an edit here lands in every running app without a restart.
 */
export default function RepositoryPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const id = params.id
  const { session, pending } = useRequireSession()

  const [repo, setRepo] = useState<Repository | null | undefined>(undefined)
  const [orgs, setOrgs] = useState<Org[]>([])
  const [saveError, setSaveError] = useState<string | null>(null)

  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  /**
   * The freshest known row, updated synchronously — before any await — so two
   * settings changed in quick succession both merge onto the newer value. React
   * state alone can't serve this: it only reflects a change on the next render,
   * so the second change would merge onto a stale snapshot and drop the first.
   */
  const latest = useRef<Repository | null>(null)

  /**
   * Writes run one at a time, chained onto this promise. Concurrent writes would
   * make the ordering below unsound: a read issued by one write could observe the
   * row before a later write committed, and then present — and merge onto — a row
   * missing a change that did persist.
   */
  const queue = useRef<Promise<unknown>>(Promise.resolve())
  const inFlight = useRef(0)
  const resyncNeeded = useRef(false)
  /**
   * Bumped on every change. The rollback read compares it before storing, so a
   * change made while that read was in flight is never overwritten by it.
   */
  const generation = useRef(0)

  /** Sets state and the ref together, so they never disagree. */
  const store = useCallback((next: Repository | null) => {
    latest.current = next
    setRepo(next)
  }, [])

  useEffect(() => {
    if (!session || !id) return
    fetchRepository(id).then(store)
    fetchOrgs().then(setOrgs)
  }, [session, id, store])

  /**
   * Optimistic save of a single changed setting: the form reflects it immediately,
   * while the write itself is queued behind any earlier one.
   *
   * State then follows the row the write returns, so it always shows what is
   * actually stored — a successful write is self-correcting and needs no re-read.
   * Only a *failure* leaves the optimistic value unbacked, and that is what the
   * rollback read repairs.
   */
  const patch = useCallback(
    (p: RepositoryPatch) => {
      const base = latest.current
      if (!id || !base) return

      store({ ...base, ...expandPatch(base, p) })
      setSaveError(null)
      inFlight.current += 1
      generation.current += 1

      queue.current = queue.current
        .then(async () => {
          try {
            // Re-expand against the freshest row: an earlier queued write may have
            // landed, or a rollback may have moved the base, since this was called.
            const saved = await updateRepository(id, expandPatch(latest.current ?? base, p))
            if (saved) {
              // The stored row supersedes any optimistic guess, including one an
              // earlier failure was about to roll back.
              store(saved)
              resyncNeeded.current = false
            }
          } catch (err) {
            setSaveError(err instanceof Error ? err.message : 'Failed to save.')
            resyncNeeded.current = true
          } finally {
            inFlight.current -= 1
          }

          if (inFlight.current !== 0 || !resyncNeeded.current) return

          // Nothing else is queued, so the row read here is the final one.
          const gen = generation.current
          const fresh = await fetchRepository(id)
          // A change made while that read was in flight supersedes it — storing
          // the older row would erase it from the form while its own write went on
          // to succeed. That write will store its own result; leave it alone.
          if (generation.current !== gen || inFlight.current !== 0) return
          resyncNeeded.current = false
          store(fresh)
        })
        // Never leave a rejected promise in the queue: every later write chains
        // onto it, so one unexpected rejection would silently stop all of them.
        .catch(() => {})
    },
    [id, store],
  )

  const remove = async () => {
    if (!id || deleting) return
    setDeleting(true)
    setDeleteError(null)
    try {
      await deleteRepository(id)
      router.replace('/organization')
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete repository.')
      setDeleting(false)
    }
  }

  if (pending || !session) return <FullPageLoader />

  /**
   * A team repo's settings drive what every member's agents do, so only the
   * org's admins — and whoever created it — may change them. Everyone else
   * reads. Personal repos have no such notion: only their owner sees them.
   *
   * RLS on `repositories` enforces the same rule; this only keeps the page from
   * offering an edit the database would refuse. The org list arrives after the
   * repo, so until it does the role is unknown and the form stays locked rather
   * than briefly inviting a change that fails.
   */
  const scopeOrg = repo?.orgId ? orgs.find((o) => o.id === repo.orgId) : null
  const readOnly = !!repo?.orgId && repo.ownerId !== session.user.id && scopeOrg?.role !== 'admin'

  return (
    <AppShell email={session.user.email ?? undefined}>
      <Link
        href="/organization"
        className="mb-6 inline-flex items-center gap-2 text-sm text-muted transition-colors hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to organizations
      </Link>

      {repo === undefined ? (
        <Card className="p-8 text-center text-sm text-muted">Loading…</Card>
      ) : repo === null ? (
        <Card className="p-8 text-center">
          <AlertTriangle className="mx-auto mb-3 h-8 w-8 text-black/15" />
          <p className="text-sm text-muted">This repository doesn&apos;t exist, or you don&apos;t have access.</p>
          <p className="mt-1 text-xs text-muted">
            Team repos are only visible to members of the organization they belong to.
          </p>
        </Card>
      ) : (
        <>
          <div className="mb-10 flex items-center gap-4">
            <span
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl"
              style={
                repo.color
                  ? { backgroundColor: `${repo.color}1f`, color: repo.color }
                  : { backgroundColor: 'rgba(0,0,0,0.04)' }
              }
            >
              <FolderGit2 className={`h-5 w-5 ${repo.color ? '' : 'text-muted'}`} />
            </span>
            <h1 className="min-w-0 break-words font-display text-5xl font-black leading-none tracking-tight text-ink">
              {repo.name}
            </h1>
          </div>

          {readOnly && (
            <Card className="mb-8 flex items-start gap-3 p-5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-black/[0.04]">
                <Lock className="h-4 w-4 text-muted" />
              </span>
              <div>
                <p className="text-sm text-ink">Read-only</p>
                <p className="mt-1 text-xs text-muted">
                  These settings are shared by everyone in {scopeOrg?.name ?? 'the organization'}, so only
                  its admins change them. Your own local folder is set in the desktop app — it stays on your
                  machine and is never shared.
                </p>
              </div>
            </Card>
          )}

          <RepositoryForm
            repo={repo}
            orgs={orgs}
            onPatch={patch}
            onDelete={() => {
              setDeleteError(null)
              setConfirmDelete(true)
            }}
            saveError={saveError}
            readOnly={readOnly}
          />
        </>
      )}

      <Modal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        icon={Trash2}
        title="Delete repository"
        tone="danger"
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmDelete(false)} className="mr-auto">
              Cancel
            </Button>
            <Button variant="danger" onClick={remove} disabled={deleting}>
              {deleting ? 'Deleting…' : 'Delete repository'}
            </Button>
          </>
        }
      >
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red/10">
            <AlertTriangle className="h-4 w-4 text-red" />
          </span>
          <div>
            <p className="text-sm text-ink">
              Delete <strong>{repo?.name ?? 'this repository'}</strong>?
            </p>
            <p className="mt-1 text-xs text-muted">
              {repo?.orgId
                ? 'It disappears for every member of the organization. This cannot be undone.'
                : 'This cannot be undone.'}
            </p>
          </div>
        </div>
        {deleteError && <p className="mt-2 text-xs text-red">{deleteError}</p>}
      </Modal>
    </AppShell>
  )
}
