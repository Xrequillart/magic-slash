'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { AlertTriangle, ArrowLeft, FolderGit2, Trash2 } from 'lucide-react'
import { useRequireSession } from '@/lib/session'
import { fetchOrgs, type Org } from '@/lib/orgs'
import {
  deleteRepository,
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

  useEffect(() => {
    if (!session || !id) return
    fetchRepository(id).then(setRepo)
    fetchOrgs().then(setOrgs)
  }, [session, id])

  /**
   * Optimistic save: the form reflects the change at once, and a failure both
   * surfaces the error and re-reads the row so the UI can't drift from the truth.
   */
  const patch = useCallback(
    async (p: RepositoryPatch) => {
      if (!id) return
      setRepo((current) => (current ? { ...current, ...p } : current))
      setSaveError(null)
      try {
        await updateRepository(id, p)
      } catch (err) {
        setSaveError(err instanceof Error ? err.message : 'Failed to save.')
        const fresh = await fetchRepository(id)
        setRepo(fresh)
      }
    },
    [id],
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

          <RepositoryForm
            repo={repo}
            orgs={orgs}
            onPatch={patch}
            onDelete={() => {
              setDeleteError(null)
              setConfirmDelete(true)
            }}
            saveError={saveError}
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
