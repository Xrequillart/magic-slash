'use client'

import { useState } from 'react'
import { AlertTriangle, AtSign, Cloud, KeyRound, LogOut, Trash2 } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Modal } from '@/components/Modal'
import { Button, Card, Input, SectionHeader } from '@/components/ui'
import {
  confirmEmailChange,
  deleteAccount,
  requestEmailChange,
  signOut,
  updatePassword,
} from '@/lib/account'

/**
 * Cloud identity card: who you're signed in as, and the four things you can do
 * about it — sign out, change password, change email, delete the account. Same
 * set and same flows as the desktop app's Account tab, including the 6-digit
 * code exchange for an email change.
 */

type Status = { kind: 'ok' | 'err'; msg: string } | null

function Note({ status }: { status: Status }) {
  if (!status) return null
  return <p className={`mt-2 text-xs ${status.kind === 'ok' ? 'text-green' : 'text-red'}`}>{status.msg}</p>
}

/** Bordered pill action — the card's secondary buttons. */
function CardAction({
  icon: Icon,
  label,
  onClick,
  tone = 'neutral',
  className = '',
}: {
  icon: LucideIcon
  label: string
  onClick: () => void
  tone?: 'neutral' | 'danger'
  className?: string
}) {
  const tones = {
    neutral: 'border-black/10 text-muted hover:bg-black/[0.04] hover:text-ink',
    danger: 'border-red/25 text-red hover:bg-red/[0.06]',
  }
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 rounded-full border px-3.5 py-2 font-display text-xs font-medium transition-colors ${tones[tone]} ${className}`}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" />
      {label}
    </button>
  )
}

export function CloudAccountSection({ email }: { email: string }) {
  const router = useRouter()

  const [showPassword, setShowPassword] = useState(false)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [pwBusy, setPwBusy] = useState(false)
  const [pwStatus, setPwStatus] = useState<Status>(null)

  const [showEmail, setShowEmail] = useState(false)
  const [emailStep, setEmailStep] = useState<'request' | 'confirm'>('request')
  const [newEmail, setNewEmail] = useState('')
  const [code, setCode] = useState('')
  const [emailBusy, setEmailBusy] = useState(false)
  const [emailStatus, setEmailStatus] = useState<Status>(null)

  const [showDelete, setShowDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteStatus, setDeleteStatus] = useState<Status>(null)

  const leave = async () => {
    await signOut()
    router.replace('/')
  }

  const closePassword = () => {
    setShowPassword(false)
    setPassword('')
    setConfirm('')
    setPwStatus(null)
  }

  const submitPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (pwBusy) return
    if (password.length < 8) {
      setPwStatus({ kind: 'err', msg: 'Use at least 8 characters.' })
      return
    }
    if (password !== confirm) {
      setPwStatus({ kind: 'err', msg: 'Passwords do not match.' })
      return
    }
    setPwBusy(true)
    setPwStatus(null)
    try {
      await updatePassword(password)
      closePassword()
    } catch (err) {
      setPwStatus({ kind: 'err', msg: err instanceof Error ? err.message : 'Failed to update password.' })
    } finally {
      setPwBusy(false)
    }
  }

  const closeEmail = () => {
    setShowEmail(false)
    setEmailStep('request')
    setNewEmail('')
    setCode('')
    setEmailStatus(null)
  }

  const submitEmail = async (e: React.FormEvent) => {
    e.preventDefault()
    if (emailBusy) return
    setEmailBusy(true)
    setEmailStatus(null)
    try {
      if (emailStep === 'request') {
        await requestEmailChange(newEmail)
        setEmailStep('confirm')
        setEmailStatus({ kind: 'ok', msg: 'Code sent. Check your new inbox.' })
      } else {
        await confirmEmailChange(newEmail, code)
        closeEmail()
        // The session carries the old address until it is re-read.
        router.refresh()
      }
    } catch (err) {
      setEmailStatus({ kind: 'err', msg: err instanceof Error ? err.message : 'Failed to change email.' })
    } finally {
      setEmailBusy(false)
    }
  }

  const confirmDelete = async () => {
    if (deleting) return
    setDeleting(true)
    setDeleteStatus(null)
    try {
      await deleteAccount()
      router.replace('/')
    } catch (err) {
      setDeleteStatus({ kind: 'err', msg: err instanceof Error ? err.message : 'Failed to delete account.' })
      setDeleting(false)
    }
  }

  return (
    <section>
      <SectionHeader icon={Cloud} title="Cloud account" />

      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="truncate font-display text-sm font-bold text-ink">{email}</p>
            <p className="mt-0.5 text-xs text-muted">Signed in to Magic Slash cloud</p>
          </div>
          <CardAction icon={LogOut} label="Sign out" onClick={leave} />
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-black/5 pt-4">
          <CardAction icon={KeyRound} label="Change password" onClick={() => setShowPassword(true)} />
          <CardAction icon={AtSign} label="Change email" onClick={() => setShowEmail(true)} />
          <CardAction
            icon={Trash2}
            label="Delete my account"
            tone="danger"
            onClick={() => setShowDelete(true)}
            className="sm:ml-auto"
          />
        </div>
      </Card>

      <Modal open={showPassword} onClose={closePassword} icon={KeyRound} title="Change password">
        <form onSubmit={submitPassword} className="space-y-2 pb-1">
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="New password"
            autoFocus
          />
          <Input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Confirm new password"
          />
          <div className="flex items-center gap-2 pt-2">
            <Button variant="ghost" type="button" onClick={closePassword} className="mr-auto">
              Cancel
            </Button>
            <Button type="submit" disabled={pwBusy || !password || !confirm}>
              {pwBusy ? 'Saving…' : 'Update password'}
            </Button>
          </div>
          <Note status={pwStatus} />
        </form>
      </Modal>

      <Modal open={showEmail} onClose={closeEmail} icon={AtSign} title="Change email">
        <form onSubmit={submitEmail} className="space-y-2 pb-1">
          {emailStep === 'request' ? (
            <>
              <p className="text-xs text-muted">
                We&apos;ll email a 6-digit confirmation code to your new address.
              </p>
              <Input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="New email"
                autoFocus
              />
            </>
          ) : (
            <>
              <p className="text-xs text-muted">
                Check <span className="font-medium text-ink">{newEmail}</span> for the confirmation code and enter
                it below.
              </p>
              <Input
                type="text"
                inputMode="numeric"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="6-digit code"
                autoFocus
              />
            </>
          )}
          <div className="flex items-center gap-2 pt-2">
            <Button variant="ghost" type="button" onClick={closeEmail} className="mr-auto">
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={emailBusy || (emailStep === 'request' ? !newEmail.trim() : !code.trim())}
            >
              {emailBusy ? 'Working…' : emailStep === 'request' ? 'Send code' : 'Confirm change'}
            </Button>
          </div>
          <Note status={emailStatus} />
        </form>
      </Modal>

      <Modal
        open={showDelete}
        onClose={() => setShowDelete(false)}
        icon={Trash2}
        title="Delete my account"
        tone="danger"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowDelete(false)} className="mr-auto">
              Cancel
            </Button>
            <Button variant="danger" onClick={confirmDelete} disabled={deleting}>
              {deleting ? 'Deleting…' : 'Delete permanently'}
            </Button>
          </>
        }
      >
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red/10">
            <AlertTriangle className="h-4 w-4 text-red" />
          </span>
          <div>
            <p className="text-sm text-ink">This permanently deletes your account and personal data.</p>
            <p className="mt-1 text-xs text-muted">
              Organizations you created will be removed along with their data. This cannot be undone. Magic Slash
              keeps working locally without an account.
            </p>
          </div>
        </div>
        <Note status={deleteStatus} />
      </Modal>
    </section>
  )
}
