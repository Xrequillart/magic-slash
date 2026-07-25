'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabase } from '@/lib/supabase'
import { useSession } from '@/lib/session'
import { AppShell } from '@/components/AppShell'
import { Button, Eyebrow, Input, Label, Section, Select, Textarea } from '@/components/ui'
import { DevicesSection } from '@/components/DevicesSection'
import {
  fetchProfile,
  saveProfile,
  EMPTY_PROFILE,
  ROLE_LABELS,
  LEVEL_LABELS,
  STYLE_LABELS,
  type UserProfile,
  type ProfileRole,
  type ProfileLevel,
  type ProfileStyle,
} from '@/lib/profile'

const LANGUAGE_OPTIONS = ['English', 'Français']

type Status = { kind: 'ok' | 'err'; msg: string } | null

function Note({ status }: { status: Status }) {
  if (!status) return null
  return (
    <p className={`mt-2 text-xs ${status.kind === 'ok' ? 'text-green' : 'text-red'}`}>{status.msg}</p>
  )
}

export default function Settings() {
  const router = useRouter()
  const { session, loading } = useSession()

  const [email, setEmail] = useState('')
  const [emailStatus, setEmailStatus] = useState<Status>(null)
  const [emailBusy, setEmailBusy] = useState(false)

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [pwStatus, setPwStatus] = useState<Status>(null)
  const [pwBusy, setPwBusy] = useState(false)

  const [profile, setProfile] = useState<UserProfile>(EMPTY_PROFILE)
  const [profileLoaded, setProfileLoaded] = useState(false)
  const [profileStatus, setProfileStatus] = useState<Status>(null)
  const [profileBusy, setProfileBusy] = useState(false)

  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [deleteBusy, setDeleteBusy] = useState(false)
  const [deleteStatus, setDeleteStatus] = useState<Status>(null)

  useEffect(() => {
    if (!loading && !session) router.replace('/')
  }, [loading, session, router])

  useEffect(() => {
    if (session?.user.email) setEmail(session.user.email)
  }, [session])

  useEffect(() => {
    if (!session) return
    fetchProfile().then((p) => {
      if (p) setProfile(p)
      setProfileLoaded(true)
    })
  }, [session])

  const saveProfileForm = async (e: React.FormEvent) => {
    e.preventDefault()
    if (profileBusy) return
    if (!profile.name.trim()) {
      setProfileStatus({ kind: 'err', msg: 'Please enter your name.' })
      return
    }
    setProfileBusy(true)
    setProfileStatus(null)
    try {
      await saveProfile(profile)
      setProfileStatus({ kind: 'ok', msg: 'Profile saved.' })
    } catch (err) {
      setProfileStatus({ kind: 'err', msg: err instanceof Error ? err.message : 'Failed to save profile.' })
    } finally {
      setProfileBusy(false)
    }
  }

  const toggleLanguage = (lang: string) => {
    setProfile((p) => ({
      ...p,
      languages: p.languages.includes(lang) ? p.languages.filter((l) => l !== lang) : [...p.languages, lang],
    }))
  }

  if (loading || !session) {
    return <div className="flex min-h-screen items-center justify-center bg-canvas text-muted">Loading…</div>
  }

  const currentEmail = session.user.email ?? ''

  const saveEmail = async (e: React.FormEvent) => {
    e.preventDefault()
    if (emailBusy || email.trim() === currentEmail) return
    setEmailBusy(true)
    setEmailStatus(null)
    const { error } = await getSupabase().auth.updateUser({ email: email.trim() })
    setEmailStatus(error ? { kind: 'err', msg: error.message } : { kind: 'ok', msg: 'Email updated.' })
    setEmailBusy(false)
  }

  const savePassword = async (e: React.FormEvent) => {
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
    const { error } = await getSupabase().auth.updateUser({ password })
    if (error) {
      setPwStatus({ kind: 'err', msg: error.message })
    } else {
      setPwStatus({ kind: 'ok', msg: 'Password updated.' })
      setPassword('')
      setConfirm('')
    }
    setPwBusy(false)
  }

  const deleteAccount = async () => {
    setDeleteBusy(true)
    setDeleteStatus(null)
    const { error } = await getSupabase().rpc('delete_account')
    if (error) {
      setDeleteStatus({ kind: 'err', msg: error.message })
      setDeleteBusy(false)
      return
    }
    await getSupabase().auth.signOut()
    router.replace('/')
  }

  return (
    <AppShell email={currentEmail}>
      <Eyebrow>/settings</Eyebrow>
      <h1 className="font-display text-5xl font-black leading-none tracking-tight text-ink">Settings</h1>
      <p className="mt-4 text-muted">Manage your profile, your devices and your account.</p>

      <div className="mt-10 space-y-5">
        <Section title="Profile" description="Helps Magic Slash tailor its tone and depth to you, across the app and the /magic:* skills.">
          {!profileLoaded ? (
            <p className="text-sm text-muted">Loading…</p>
          ) : (
            <form onSubmit={saveProfileForm} className="space-y-4">
              <div>
                <Label>Name</Label>
                <Input
                  type="text"
                  value={profile.name}
                  onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                  placeholder="How should we call you?"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label>Role</Label>
                  <Select
                    value={profile.role}
                    onChange={(e) => setProfile({ ...profile, role: e.target.value as ProfileRole })}
                  >
                    {(Object.keys(ROLE_LABELS) as ProfileRole[]).map((r) => (
                      <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                    ))}
                  </Select>
                </div>
                <div>
                  <Label>Technical level</Label>
                  <Select
                    value={profile.technicalLevel}
                    onChange={(e) => setProfile({ ...profile, technicalLevel: e.target.value as ProfileLevel })}
                  >
                    {(Object.keys(LEVEL_LABELS) as ProfileLevel[]).map((l) => (
                      <option key={l} value={l}>{LEVEL_LABELS[l]}</option>
                    ))}
                  </Select>
                </div>
              </div>

              <div>
                <Label>Communication style</Label>
                <Select
                  value={profile.communicationStyle ?? ''}
                  onChange={(e) =>
                    setProfile({ ...profile, communicationStyle: (e.target.value || null) as ProfileStyle | null })
                  }
                >
                  <option value="">No preference</option>
                  {(Object.keys(STYLE_LABELS) as ProfileStyle[]).map((s) => (
                    <option key={s} value={s}>{STYLE_LABELS[s]}</option>
                  ))}
                </Select>
              </div>

              <div>
                <Label>Languages</Label>
                <div className="flex flex-wrap gap-2">
                  {LANGUAGE_OPTIONS.map((lang) => {
                    const on = profile.languages.includes(lang)
                    return (
                      <button
                        key={lang}
                        type="button"
                        onClick={() => toggleLanguage(lang)}
                        className={`rounded-full border px-3.5 py-1.5 text-sm transition-colors ${
                          on ? 'border-accent bg-accent/10 text-accent' : 'border-black/10 text-muted hover:text-ink'
                        }`}
                      >
                        {lang}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div>
                <Label>Anything else</Label>
                <Textarea
                  value={profile.freeText}
                  onChange={(e) => setProfile({ ...profile, freeText: e.target.value })}
                  rows={3}
                  placeholder="Preferences, context, how you like to work…"
                  className="resize-y"
                />
              </div>

              <Button type="submit" disabled={profileBusy}>
                {profileBusy ? 'Saving…' : 'Save profile'}
              </Button>
              <Note status={profileStatus} />
            </form>
          )}
        </Section>

        <DevicesSection />

        <Section title="Email" description="The address you sign in with.">
          <form onSubmit={saveEmail} className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <Button type="submit" disabled={emailBusy || email.trim() === currentEmail}>
              {emailBusy ? 'Saving…' : 'Update email'}
            </Button>
          </form>
          <Note status={emailStatus} />
        </Section>

        <Section title="Password" description="Choose a new password for your account.">
          <form onSubmit={savePassword} className="space-y-3">
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="New password"
            />
            <Input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Confirm new password"
            />
            <Button type="submit" disabled={pwBusy || !password || !confirm}>
              {pwBusy ? 'Saving…' : 'Update password'}
            </Button>
          </form>
          <Note status={pwStatus} />
        </Section>

        <section className="rounded-2xl border border-red/20 bg-red/[0.03] p-6">
          <h2 className="font-display text-lg font-bold text-red">Delete account</h2>
          <p className="mt-1 text-sm text-muted">
            Permanently delete your account and remove you from every organization. This cannot be undone.
          </p>
          <div className="mt-5">
            {!confirmingDelete ? (
              <button
                onClick={() => setConfirmingDelete(true)}
                className="rounded-full border border-red/30 px-5 py-2.5 font-display text-sm font-medium text-red transition-colors hover:bg-red/10"
              >
                Delete my account
              </button>
            ) : (
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-sm font-medium text-ink">Are you sure? This is permanent.</span>
                <Button variant="danger" onClick={deleteAccount} disabled={deleteBusy}>
                  {deleteBusy ? 'Deleting…' : 'Yes, delete everything'}
                </Button>
                <button
                  onClick={() => setConfirmingDelete(false)}
                  disabled={deleteBusy}
                  className="text-sm text-muted transition-colors hover:text-ink"
                >
                  Cancel
                </button>
              </div>
            )}
            <Note status={deleteStatus} />
          </div>
        </section>
      </div>
    </AppShell>
  )
}
