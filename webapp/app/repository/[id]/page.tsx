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
  setRepositoryRemoteUrl,
  updateRepository,
  type Repository,
  type RepositoryPatch,
} from '@/lib/repositories'
import { useT } from '@/lib/i18n/useLanguage'
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
  const { t, lang } = useT()

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
            const saved = await updateRepository(id, expandPatch(latest.current ?? base, p), lang)
            if (saved) {
              // The stored row supersedes any optimistic guess, including one an
              // earlier failure was about to roll back.
              store(saved)
              resyncNeeded.current = false
            }
          } catch (err) {
            setSaveError(err instanceof Error ? err.message : t('common.saveFailed'))
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
    [id, store, lang, t],
  )

  /**
   * The remote goes through its own RPC, not through `patch`: the column has one
   * writer by design (see setRepositoryRemoteUrl), and a member who may fill a blank
   * one is not necessarily allowed to change one already set. So this is awaited and
   * answers — false means the backend refused on permissions, which the form shows
   * next to the field rather than as a failed save.
   *
   * On success the row is re-read instead of guessed at: `set_repository_remote_url`
   * can lose a fill race with another member, in which case the stored address is
   * theirs and not the one just typed.
   */
  const saveRemoteUrl = useCallback(
    async (url: string): Promise<boolean> => {
      if (!id) return false
      const accepted = await setRepositoryRemoteUrl(id, url)
      if (accepted) store(await fetchRepository(id))
      return accepted
    },
    [id, store],
  )

  const remove = async () => {
    if (!id || deleting) return
    setDeleting(true)
    setDeleteError(null)
    try {
      await deleteRepository(id, lang)
      router.replace('/organization')
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : t('repo.delete.failed'))
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
        {t('repo.back')}
      </Link>

      {repo === undefined ? (
        <Card className="p-8 text-center text-sm text-muted">{t('common.loading')}</Card>
      ) : repo === null ? (
        <Card className="p-8 text-center">
          <AlertTriangle className="mx-auto mb-3 h-8 w-8 text-black/15" />
          <p className="text-sm text-muted">{t('repo.notFound')}</p>
          <p className="mt-1 text-xs text-muted">{t('repo.notFoundHint')}</p>
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
                <p className="text-sm text-ink">{t('repo.readOnly.title')}</p>
                <p className="mt-1 text-xs text-muted">
                  {t('repo.readOnly.body', {
                    org: scopeOrg?.name ?? t('repo.readOnly.theOrganization'),
                  })}
                </p>
              </div>
            </Card>
          )}

          <RepositoryForm
            repo={repo}
            orgs={orgs}
            onPatch={patch}
            onSaveRemoteUrl={saveRemoteUrl}
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
        title={t('repo.delete.title')}
        tone="danger"
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmDelete(false)} className="mr-auto">
              {t('common.cancel')}
            </Button>
            <Button variant="danger" onClick={remove} disabled={deleting}>
              {deleting ? t('common.deleting') : t('repo.delete.title')}
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
              {t('repo.delete.confirmBefore')}{' '}
              <strong>{repo?.name ?? t('repo.delete.thisRepository')}</strong>
              {t('repo.delete.confirmAfter')}
            </p>
            <p className="mt-1 text-xs text-muted">
              {repo?.orgId ? t('repo.delete.teamBody') : t('repo.delete.personalBody')}
            </p>
          </div>
        </div>
        {deleteError && <p className="mt-2 text-xs text-red">{deleteError}</p>}
      </Modal>
    </AppShell>
  )
}
