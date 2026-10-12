import type { AnimationEvent } from 'react'
import { Banner } from './Banner'
import { Button } from './Button'
import { Card } from './Card'
import { EmptyState } from './EmptyState'
import { Icon } from './Icon'
import { Input } from './Input'
import { Check, ChevronLeft, ChevronRight, Download, Folder, FolderOpen, Mail } from './icons'
import { Modal } from './Modal'
import { ModalHeader } from './ModalHeader'
import { Status } from './Status'
import { TabStrip } from './TabStrip'
import { Text } from './Text'

/**
 * JOINING AN ORGANIZATION FROM AN INVITATION, in three steps: accept it (and sign up or
 * in on the way), bind the organization's repositories to folders on this machine, done.
 *
 * It was the app's last dialog drawn entirely by hand: its own fixed overlay, its own
 * header and close button, six button styles spelled class by class, and the coloured
 * notes under each repository as bordered boxes. It is `Modal`, `ModalHeader`, `Button`,
 * `Input`, `TabStrip`, `Status` and `Banner` now, and the app keeps only the flow: which
 * step, what each answer does, and what the main process said back.
 *
 * THE STEP DECIDES THE FOOTER, so a caller cannot show "Back" on the first step or
 * "Skip" on the last: back on the repositories step only, skip until done, and one
 * answer per step (accept, continue, done).
 *
 * A REPOSITORY ROW SAYS WHERE IT STANDS: its folder, or the yellow "no folder yet" pill
 * and the address a clone would fetch. A row's notes are alternatives handed in as data,
 * drawn as banners: a folder whose name does not match (a question, with "link anyway"),
 * a warning from the main process, or a failure.
 *
 * ESCAPE AND THE EXIT ANIMATION ARE THE CALLER'S, on `Modal`'s terms.
 *
 * DATA IN, CALLBACKS OUT. Every word arrives translated.
 */

export type InvitationWizardStep = 1 | 2 | 3

export interface InvitationWizardField {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export interface InvitationWizardRepo {
  id: string
  name: string
  /** The folder it is bound to on this machine. Absent: the "no folder" pill instead. */
  path?: string
  /** The "no folder on this machine" pill's words, for a row with no `path`. */
  missingLabel: string
  /** Offered only for a repository that is not on disk and has an address to clone. */
  clone?: { label: string; busyLabel: string; remoteUrl: string; busy?: boolean; onClick: () => void }
  link: { label: string; busy?: boolean; onClick: () => void }
  /** Work in flight on this row: both its buttons stop answering. */
  busy?: boolean
  /** The picked folder's name does not look like the repository's. Asks, never refuses. */
  pending?: { message: string; confirmLabel: string; cancelLabel: string; onConfirm: () => void; onCancel: () => void }
  /** Added, but the main process flagged the folder. */
  warning?: string
  error?: string
}

export interface InvitationWizardProps {
  step: InvitationWizardStep
  title: string
  closeTitle?: string
  /** Step 1: the invitation, and the account it lands in. */
  accept: {
    title: string
    help: string
    token: InvitationWizardField
    account: {
      ariaLabel: string
      isNew: boolean
      onChange: (isNew: boolean) => void
      newLabel: string
      existingLabel: string
    }
    email: InvitationWizardField
    password: InvitationWizardField
  }
  /** Step 2: the organization's repositories, and where clones land. */
  repos: {
    title: string
    help: string
    destination?: { label: string; path: string; changeLabel: string; onChange: () => void }
    empty: string
    rows: InvitationWizardRepo[]
    addOther: { label: string; onClick: () => void; disabled?: boolean }
  }
  /** Step 3. */
  done: { title: string; body: string }
  error?: string
  labels: { back: string; skip: string; accept: string; continue: string; done: string }
  /** The current step's answer is out. */
  busy?: boolean
  onBack: () => void
  onAccept: () => void
  onContinue: () => void
  /** Skip, done, the header's close button, and a press on the dimmed ground. */
  onClose: () => void
  /** The caller's enter and exit animation: see `Modal`, which owns neither. */
  backdropClassName?: string
  className?: string
  onAnimationEnd?: (event: AnimationEvent<HTMLDivElement>) => void
  portalTo?: HTMLElement | null
}

const STEPS: InvitationWizardStep[] = [1, 2, 3]

function RepoRow({ repo }: { repo: InvitationWizardRepo }) {
  return (
    <Card padding="compact" className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <div className="flex min-w-0 flex-1 flex-col items-start gap-1">
          <Text size="sm" weight="medium" className="block w-full truncate">{repo.name}</Text>
          {repo.path ? (
            <Text size="xs" tone="secondary" className="block w-full truncate">{repo.path}</Text>
          ) : (
            <Status label={repo.missingLabel} tone="yellow" icon={FolderOpen} size="2xs" />
          )}
          {repo.clone && (
            // What Clone will fetch, before it does: the address comes from whichever
            // teammate first had the repository on disk.
            <Text size="2xs" tone="secondary" className="block w-full truncate">{repo.clone.remoteUrl}</Text>
          )}
        </div>
        <div className="flex flex-shrink-0 items-center gap-1.5">
          {repo.clone && (
            <Button tone="neutral" size="xs" icon={Download} busy={repo.clone.busy} disabled={repo.busy} onClick={repo.clone.onClick}>
              {repo.clone.busy ? repo.clone.busyLabel : repo.clone.label}
            </Button>
          )}
          <Button tone="neutral" size="xs" icon={FolderOpen} busy={repo.link.busy} disabled={repo.busy} onClick={repo.link.onClick}>
            {repo.link.label}
          </Button>
        </div>
      </div>
      {repo.pending && (
        <Banner
          variant="warning"
          layout="stacked"
          actions={[
            { label: repo.pending.confirmLabel, onClick: repo.pending.onConfirm, primary: true },
            { label: repo.pending.cancelLabel, onClick: repo.pending.onCancel },
          ]}
        >
          {repo.pending.message}
        </Banner>
      )}
      {repo.warning && <Banner variant="warning" layout="stacked">{repo.warning}</Banner>}
      {repo.error && <Banner variant="danger" layout="stacked">{repo.error}</Banner>}
    </Card>
  )
}

export function InvitationWizard({
  step,
  title,
  closeTitle,
  accept,
  repos,
  done,
  error,
  labels,
  busy,
  onBack,
  onAccept,
  onContinue,
  onClose,
  backdropClassName,
  className = '',
  onAnimationEnd,
  portalTo,
}: InvitationWizardProps) {
  return (
    <Modal
      onClose={onClose}
      backdropClassName={backdropClassName}
      onAnimationEnd={onAnimationEnd}
      portalTo={portalTo}
      className={`mx-4 w-full max-w-md ${className}`.trim()}
    >
      <ModalHeader title={title} icon={Mail} onClose={onClose} closeTitle={closeTitle} gutter="wide" />

      {/* Where the flow is: one segment per step, lit up to the current one. */}
      <div className="flex items-center gap-1.5 px-6 pb-4" aria-hidden="true">
        {STEPS.map((s) => (
          <div key={s} className={`h-1 flex-1 rounded-full transition-colors ${s <= step ? 'bg-accent' : 'bg-surface-strong'}`} />
        ))}
      </div>

      <div className="flex min-h-[220px] flex-col gap-3 px-6 pb-6">
        {step === 1 && (
          <>
            <div className="flex flex-col gap-1">
              <Text size="sm" weight="medium">{accept.title}</Text>
              <Text size="xs" tone="secondary">{accept.help}</Text>
            </div>
            <Input value={accept.token.value} onChange={accept.token.onChange} placeholder={accept.token.placeholder} autoFocus mono size="lg" className="w-full" />
            <TabStrip
              ariaLabel={accept.account.ariaLabel}
              items={[
                { key: 'new', label: accept.account.newLabel },
                { key: 'existing', label: accept.account.existingLabel },
              ]}
              activeKey={accept.account.isNew ? 'new' : 'existing'}
              onSelect={(key) => accept.account.onChange(key === 'new')}
            />
            <Input type="email" value={accept.email.value} onChange={accept.email.onChange} placeholder={accept.email.placeholder} size="lg" className="w-full" />
            <Input
              type="password"
              value={accept.password.value}
              onChange={accept.password.onChange}
              placeholder={accept.password.placeholder}
              size="lg"
              onKeyDown={(e) => { if (e.key === 'Enter' && !busy) onAccept() }}
              className="w-full"
            />
          </>
        )}

        {step === 2 && (
          <>
            <div className="flex flex-col gap-1">
              <Text size="sm" weight="medium">{repos.title}</Text>
              <Text size="xs" tone="secondary">{repos.help}</Text>
            </div>

            {/* Where clones land: before the rows, because it applies to all of them. */}
            {repos.destination && (
              <Card padding="compact" className="flex items-center gap-2">
                <Icon glyph={Folder} size="sm" tone="muted" className="flex-shrink-0" />
                <div className="flex min-w-0 flex-1 flex-col">
                  <Text size="2xs" tone="secondary">{repos.destination.label}</Text>
                  <Text size="xs" title={repos.destination.path} className="block truncate">{repos.destination.path}</Text>
                </div>
                <Button tone="neutral" size="xs" onClick={repos.destination.onChange} className="flex-shrink-0">
                  {repos.destination.changeLabel}
                </Button>
              </Card>
            )}

            {/* Scrolls, so an organization with twenty repositories stays usable. */}
            <div className="flex max-h-[40vh] flex-col gap-1.5 overflow-y-auto">
              {repos.rows.length === 0 && <EmptyState>{repos.empty}</EmptyState>}
              {repos.rows.map((repo) => <RepoRow key={repo.id} repo={repo} />)}
            </div>

            <Button tone="ghost" size="lg" icon={Folder} disabled={repos.addOther.disabled} onClick={repos.addOther.onClick} className="w-full justify-center">
              {repos.addOther.label}
            </Button>
          </>
        )}

        {step === 3 && (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 py-8 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-green/10 text-green">
              <Icon glyph={Check} size="lg" tone="inherit" />
            </span>
            <Text size="sm" weight="medium">{done.title}</Text>
            <Text size="xs" tone="secondary">{done.body}</Text>
          </div>
        )}

        {error && <Banner variant="danger" layout="stacked">{error}</Banner>}
      </div>

      <div className="flex items-center justify-between gap-2 px-6 pb-6">
        <div>
          {step === 2 && <Button tone="neutral" size="md" icon={ChevronLeft} onClick={onBack}>{labels.back}</Button>}
        </div>
        <div className="flex items-center gap-2">
          {step < 3 && <Button tone="ghost" size="md" onClick={onClose}>{labels.skip}</Button>}
          {step === 1 && <Button tone="accent" size="md" trailing={ChevronRight} busy={busy} onClick={onAccept}>{labels.accept}</Button>}
          {step === 2 && <Button tone="accent" size="md" trailing={ChevronRight} busy={busy} onClick={onContinue}>{labels.continue}</Button>}
          {step === 3 && <Button tone="accent" size="md" icon={Check} onClick={onClose}>{labels.done}</Button>}
        </div>
      </div>
    </Modal>
  )
}
