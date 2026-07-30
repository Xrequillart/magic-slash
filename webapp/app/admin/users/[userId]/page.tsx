'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Check, X } from 'lucide-react'
import {
  getUser,
  listInstallations,
  listUserAgents,
  listUserOrgs,
  listUserRepositories,
  SETTING_DEFAULTS,
  SETTING_GROUPS,
  type AdminAgent,
  type AdminInstallation,
  type AdminOrg,
  type AdminRepository,
  type AdminUserDetail,
  type AdminUserSettings,
} from '@/lib/admin'
import { formatAbsoluteDate, formatDevicePlatform, formatRelative } from '@/lib/installations'
import { THEME_OPTIONS } from '@/lib/settings'
import { LATEST_DESKTOP_VERSION } from '@/lib/desktopRelease'
import { versionStanding } from '@/lib/versions'
import { PageHead } from '@/components/regie/ConsoleShell'
import { DataTable, Mono, NoValue, type Column } from '@/components/regie/DataTable'
import {
  Collapsible,
  CopyButton,
  Empty,
  Panel,
  Pill,
  SectionLabel,
  SwitchValue,
} from '@/components/regie/primitives'

/**
 * One user's record: identity, their whole `user_settings` row, their devices,
 * orgs, agents and repositories.
 *
 * Read-only, and that is a boundary rather than an omission. The three write RPCs
 * this migration added are all org-scoped; nothing here mutates a person's own
 * account, because changing someone's settings for them is their job in their own
 * app. The lists became TABLES rather than the sentences-joined-by-middots they
 * were, so a user with eleven agents can be read down a column.
 *
 * A user with no `profiles` row and no `user_settings` row still renders: the RPCs
 * are driven off `auth.users`. Their settings show the default the app applies —
 * a switch has to be somewhere, and "unset" is not a position — tagged "par défaut"
 * so the page never claims they chose it.
 *
 * No guard: `app/admin/layout.tsx` owns it. The `cancelled` guard below is still
 * needed — it is about switching from one USER to another within the page, which
 * the layout knows nothing about.
 */

/**
 * What one setting is actually doing, and whether the user ever said so.
 *
 * Resolving the default HERE rather than at each render site is what lets a boolean be
 * drawn as a switch: the switch has to sit somewhere, and "nowhere" is not a position.
 * So `effective` is always the value in force, and `unset` carries the other half of
 * the truth — the difference between "chose off" and "never chose" is the whole point
 * of the nullable columns, and the row prints "par défaut" beside the control to keep
 * it.
 */
function resolveSetting(
  field: keyof AdminUserSettings,
  value: string | number | boolean | null,
): { effective: string | number | boolean; unset: boolean } {
  const unset = value === null || value === undefined
  return { effective: unset ? SETTING_DEFAULTS[field] : value, unset }
}

/**
 * A theme as the desktop paints it, at chip size: the window bar, the sidebar, two
 * lines of text and the accent.
 *
 * The colours come from `THEME_OPTIONS` — the same data the user-space theme picker
 * renders from, so the two cannot drift — but the markup is the console's own and
 * deliberately smaller. Nothing is imported from `components/AppSettings.tsx`: the
 * console shares DATA with the user space and never components.
 *
 * `aria-hidden` because the theme's name sits right beside it; a screen reader
 * gaining "a small dark rectangle" would be told the same thing twice, worse.
 * Returns null for a theme id this webapp does not know, which is what a desktop
 * release shipping a new theme looks like from here — the caller still prints the id.
 */
function ThemeChip({ themeId }: { themeId: string }) {
  const option = THEME_OPTIONS.find((theme) => theme.id === themeId)
  if (!option) return null
  const { swatch } = option

  return (
    <span
      aria-hidden
      title={option.label}
      className="inline-flex h-5 w-8 shrink-0 flex-col overflow-hidden rounded border"
      style={{ backgroundColor: `rgb(${swatch.bgRgb})`, borderColor: swatch.lineStrong }}
    >
      <span className="h-1 w-full shrink-0" style={{ backgroundColor: swatch.surface }} />
      <span className="flex flex-1 items-center gap-[2px] p-[2px]">
        <span className="h-full w-[3px] rounded-sm" style={{ backgroundColor: swatch.surface }} />
        <span className="flex flex-1 flex-col gap-[2px]">
          <span
            className="h-[2px] w-full rounded-full"
            style={{ backgroundColor: `rgb(${swatch.inkRgb})` }}
          />
          <span
            className="h-[2px] w-1/2 rounded-full"
            style={{ backgroundColor: `rgb(${swatch.accentRgb})` }}
          />
        </span>
      </span>
    </span>
  )
}

/**
 * One cell of the identity card: a micro-label over its value, sized to sit in a row
 * with the others.
 *
 * `min-w-0` on a flex child is not optional — without it a long email refuses to
 * shrink below its content and pushes the cells to its right off the card.
 */
function InlineField({
  label,
  className = 'lg:flex-1',
  children,
}: {
  label: string
  /** Flex weight at lg and up, where the card becomes one row. */
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={`min-w-0 px-4 py-3 ${className}`}>
      <dt className="text-[11px] uppercase tracking-[0.08em] text-regie-dim">{label}</dt>
      <dd className="mt-1 flex items-start gap-1.5 break-all font-mono text-[13px] text-ink">
        {children}
      </dd>
    </div>
  )
}

export default function AdminUserRecord() {
  const params = useParams<{ userId: string }>()
  const router = useRouter()
  const userId = params.userId
  // undefined = not fetched yet, null = fetched and there is no such user.
  const [user, setUser] = useState<AdminUserDetail | null | undefined>(undefined)
  const [devices, setDevices] = useState<AdminInstallation[] | null>(null)
  const [orgs, setOrgs] = useState<AdminOrg[] | null>(null)
  const [agents, setAgents] = useState<AdminAgent[] | null>(null)
  const [repos, setRepos] = useState<AdminRepository[] | null>(null)

  useEffect(() => {
    if (!userId) return

    // Five independent reads that resolve in any order, against state that
    // survives a route change: without the two guards below, navigating from one
    // user to another renders TWO people as one. Resetting first clears the
    // previous user's rows instead of leaving them on screen under the new user's
    // name; `cancelled` drops responses for the id we already left, so a slow
    // listUserAgents for A cannot overwrite the fast one for B. Mixed-up identity
    // is exactly the failure a back-office must not have — nothing on the page
    // would say the agents belong to someone else.
    setUser(undefined)
    setDevices(null)
    setOrgs(null)
    setAgents(null)
    setRepos(null)

    let cancelled = false
    const apply =
      <T,>(set: (value: T) => void) =>
      (value: T) => {
        if (!cancelled) set(value)
      }

    getUser(userId).then(apply(setUser))
    listInstallations(userId).then(apply(setDevices))
    listUserOrgs(userId).then(apply(setOrgs))
    listUserAgents(userId).then(apply(setAgents))
    listUserRepositories(userId).then(apply(setRepos))

    return () => {
      cancelled = true
    }
  }, [userId])

  /**
   * The version this account "runs": the one on the device it used most recently.
   *
   * Not the highest of their versions. It matches the Users table's Version column
   * and the choice `admin_list_users` documents, so the same person cannot read as
   * 0.59.2 in the list and 0.54.1 here. A laptop on the current build and a desktop
   * three releases behind is a real state — the Devices table below reports it per
   * machine, and this headline names which machine it came from.
   */
  const runningDevice =
    devices && devices.length > 0
      ? devices.reduce((latest, device) => (device.lastSeenAt > latest.lastSeenAt ? device : latest))
      : null
  const runningVersion = runningDevice?.appVersion ?? null

  /**
   * What the running build is measured against: the version that has SHIPPED, which
   * is a constant in this app (lib/desktopRelease.ts) rather than anything the fleet
   * can tell us. Against the fleet's own maximum this card said "à jour" to everyone
   * for as long as nobody had installed the new release — including, always, an
   * operator looking at their own single machine.
   */
  const standing = versionStanding(runningVersion, LATEST_DESKTOP_VERSION)

  const deviceColumns: Column<AdminInstallation, 'name' | 'platform' | 'version' | 'seen'>[] = [
    {
      key: 'name',
      label: 'Device',
      sortValue: (d) => d.deviceName,
      cell: (d) => <Mono>{d.deviceName ?? 'device inconnu'}</Mono>,
    },
    {
      key: 'platform',
      label: 'Plateforme',
      sortValue: (d) => formatDevicePlatform(d),
      cell: (d) => <Mono dim>{formatDevicePlatform(d)}</Mono>,
    },
    {
      key: 'version',
      label: 'Version',
      sortValue: (d) => d.appVersion,
      // The pill alone. It used to carry "depuis {appVersionUpdatedAt}", which read
      // as "depuis 3 hours ago" — half translated — and answered a question nobody
      // asks of this table: how long a device has been on its build matters when
      // chasing a rollout, which is the Fleet page's job. "Vu" is the column that
      // says whether this machine is still alive.
      cell: (d) => <Pill tone="brand">{d.appVersion}</Pill>,
    },
    {
      key: 'seen',
      label: 'Vu',
      align: 'right',
      defaultDirection: 'desc',
      sortValue: (d) => d.lastSeenAt,
      cell: (d) => <Mono dim>{formatRelative(d.lastSeenAt)}</Mono>,
    },
  ]

  const orgColumns: Column<AdminOrg, 'name' | 'role' | 'since'>[] = [
    {
      key: 'name',
      label: 'Organisation',
      sortValue: (o) => o.name,
      cell: (o) => (
        <span className="inline-flex items-center gap-2">
          <Mono>{o.name}</Mono>
          {o.archivedAt && <Pill tone="red">archivée</Pill>}
        </span>
      ),
    },
    {
      key: 'role',
      label: 'Rôle',
      sortValue: (o) => o.role,
      cell: (o) => <Pill tone={o.role === 'admin' ? 'brand' : 'neutral'}>{o.role}</Pill>,
    },
    {
      key: 'since',
      label: 'Membre depuis',
      align: 'right',
      defaultDirection: 'desc',
      sortValue: (o) => o.createdAt,
      cell: (o) => <Mono dim>{formatAbsoluteDate(o.createdAt)}</Mono>,
    },
  ]

  const agentColumns: Column<AdminAgent, 'name' | 'repos' | 'branch' | 'status' | 'created'>[] = [
    {
      key: 'name',
      label: 'Agent',
      sortValue: (a) => a.ticketId ?? a.name,
      cell: (a) => <Mono>{a.ticketId ? `${a.ticketId} — ${a.name}` : a.name}</Mono>,
    },
    {
      key: 'repos',
      label: 'Repos',
      sortValue: (a) => a.repoNames.join(', '),
      cell: (a) => (a.repoNames.length > 0 ? <Mono dim>{a.repoNames.join(', ')}</Mono> : <NoValue />),
    },
    {
      key: 'branch',
      label: 'Branche',
      sortValue: (a) => a.branchName,
      cell: (a) =>
        a.branchName ? (
          <Mono dim>{a.baseBranch ? `${a.branchName} → ${a.baseBranch}` : a.branchName}</Mono>
        ) : (
          <NoValue />
        ),
    },
    {
      key: 'status',
      label: 'État',
      sortValue: (a) => a.status,
      cell: (a) => (
        <span className="inline-flex items-center gap-1.5">
          {a.status ? <Pill tone="brand">{a.status}</Pill> : <NoValue />}
          {a.shared && <Pill tone="neutral">partagé</Pill>}
          {a.archivedAt && <Pill tone="neutral">archivé</Pill>}
        </span>
      ),
    },
    {
      key: 'created',
      label: 'Créé',
      align: 'right',
      defaultDirection: 'desc',
      sortValue: (a) => a.createdAt,
      cell: (a) => <Mono dim>{formatAbsoluteDate(a.createdAt)}</Mono>,
    },
  ]

  // Three columns, in the page's narrow left column: the repo, where it is attached,
  // and whether this account can actually run it. The keywords column is gone — the
  // widest cell in the table and the least often the question — and the creation date
  // no longer has a column of its own either, riding instead with the "personnel"
  // pill that is the only place it means anything. The RPC still returns keywords, so
  // bringing them back is a column and no migration.
  const repoColumns: Column<AdminRepository, 'name' | 'owner' | 'path'>[] = [
    {
      key: 'name',
      label: 'Repository',
      sortValue: (r) => r.name,
      cell: (r) => <Mono>{r.name}</Mono>,
    },
    {
      key: 'owner',
      label: 'Rattachement',
      sortValue: (r) => r.orgName,
      // The date rides WITH the "personnel" pill rather than getting a column of its
      // own, because it only ever applies to those rows — a fourth column standing
      // empty on every team repo is the noise the keywords column was.
      //
      // Only for personal repos, and that is a statement about whose date it is: a
      // personal repo is in this list because THIS account owns it, so its created_at
      // is when they added it. A team repo is here through a membership and may have
      // been created by a colleague years before they joined — printing that date on
      // their record would read as their doing.
      cell: (r) => (
        <span className="inline-flex items-center gap-2">
          <Pill tone={r.orgId ? 'brand' : 'neutral'}>{r.orgName ?? 'personnel'}</Pill>
          {!r.orgId && r.createdAt && (
            <span className="font-mono text-[11px] text-regie-dim">
              {formatAbsoluteDate(r.createdAt)}
            </span>
          )}
        </span>
      ),
    },
    {
      key: 'path',
      label: 'Path',
      // Whether this account bound the repo to a folder on a machine. A configured
      // repo with no binding exists, shows up in the app and does nothing, which is
      // the shape of "my repo doesn't work" with no other symptom — so it earns a
      // column even in a narrow table.
      // Sorted desc-first so the unbound ones surface: they are the answer, and the
      // bound ones are the uninteresting majority.
      defaultDirection: 'asc',
      sortValue: (r) => r.hasPath,
      // A tick or a cross, not a worded pill: this is the one column read by scanning
      // DOWN it — "which of these is not set up" — and a shape answers that faster
      // than a word. Red rather than dim grey because an unbound repo is a fault to
      // find, not a neutral state.
      // `role="img"` with a label on the wrapper: the icon IS the value, so it cannot
      // be decoration, and there is no text beside it to carry the meaning.
      cell: (r) => (
        <span
          role="img"
          aria-label={r.hasPath ? 'Path lié' : 'aucun path lié'}
          title={r.hasPath ? 'Path lié' : 'Aucun path lié'}
          className="inline-flex"
        >
          {r.hasPath ? (
            <Check className="h-4 w-4 text-green" />
          ) : (
            <X className="h-4 w-4 text-red" />
          )}
        </span>
      ),
    },
  ]

  return (
    <div className="animate-regie-record">
      <Link
        href="/admin/users"
        className="inline-flex items-center gap-1.5 font-display text-[11px] font-bold uppercase tracking-[0.08em] text-regie-dim transition-colors hover:text-ink"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Users
      </Link>

      {user === undefined ? (
        <p className="mt-6 font-mono text-[13px] text-regie-dim">Chargement…</p>
      ) : user === null ? (
        <p className="mt-6 font-mono text-[13px] text-regie-dim">
          Aucun compte pour cet identifiant, ou le compte a été supprimé.
        </p>
      ) : (
        <div className="mt-3">
          <PageHead
            title={user.email ?? user.userId}
            // The uuid under the email: the title is what a human calls this
            // account, this is what a log line and a SQL query call it. Copyable
            // rather than selectable because a double-click on a uuid takes one
            // hyphen-separated group and leaves the rest.
            meta={
              <span className="inline-flex items-center gap-1.5">
                <span className="break-all font-mono text-[12px] text-regie-dim">{user.userId}</span>
                <CopyButton value={user.userId} label="l'identifiant" />
              </span>
            }
          />

          <div className="space-y-6">
            {/* Identity across the full width, one field per column. Five facts is
                too few to stack down a card and too many to read as a sentence, and
                on a row they answer "who is this" in one glance without pushing the
                devices and orgs below the fold.
                A column below lg: at that width five cells in a row are 130px each,
                which truncates the only two values anyone came here to read. */}
            <Panel label="Identité">
              <dl className="flex flex-col divide-y divide-regie-rule-soft lg:flex-row lg:divide-x lg:divide-y-0">
                <InlineField label="Email" className="lg:flex-[1.75]">
                  {user.email ? (
                    <>
                      <span className="min-w-0">{user.email}</span>
                      <CopyButton value={user.email} label="l'email" />
                    </>
                  ) : (
                    <span className="text-regie-dim">aucun email</span>
                  )}
                </InlineField>
                {/* Pseudo and role come from `profiles`, which a user who never
                    opened the wizard does not have — hence "aucun profil" rather
                    than an empty cell. */}
                <InlineField label="Pseudo">
                  {user.name ?? <span className="text-regie-dim">aucun profil</span>}
                </InlineField>
                <InlineField label="Rôle déclaré">
                  {user.role ?? <span className="text-regie-dim">—</span>}
                </InlineField>
                <InlineField label="Inscrit le">{formatAbsoluteDate(user.createdAt)}</InlineField>
                <InlineField label="Dernière connexion">
                  {formatAbsoluteDate(user.lastSignInAt)}
                </InlineField>
              </dl>
            </Panel>

            {/* WHAT THEY BELONG TO, beside WHAT THEY RUN. Two unrelated questions —
                who this person works with, and what their desktop is doing — and
                neither needs the full width. 40 / 60 because the left column is two
                narrow tables to the app card's version headline, device table and ten
                feature boxes.
                `items-start` so a member of one org gets a short card rather than one
                stretched to the height of the app card beside it. */}
            <div className="grid items-start gap-6 lg:grid-cols-[2fr_3fr]">
              {/* Orgs then repos: a repository is reached THROUGH an org (personal
                  ones aside), so the column reads outside-in. */}
              <div className="space-y-6">
                <Panel
                  label="Organisations"
                  action={orgs && <SectionLabel>{orgs.length}</SectionLabel>}
                >
                  {orgs === null ? (
                    <Empty>Chargement…</Empty>
                  ) : (
                    <DataTable
                      rows={orgs}
                      columns={orgColumns}
                      rowKey={(o) => o.orgId}
                      // The one cross-entity jump in the console: from a person to
                      // the tenant, where the actions that concern them actually
                      // live.
                      onRowClick={(o) => router.push(`/admin/organizations/${o.orgId}`)}
                      initialSort={{ key: 'name', direction: 'asc' }}
                      emptyLabel="Membre d'aucune organisation."
                    />
                  )}
                </Panel>

                <Panel
                  label="Repositories"
                  action={repos && <SectionLabel>{repos.length}</SectionLabel>}
                >
                  {repos === null ? (
                    <Empty>Chargement…</Empty>
                  ) : (
                    <DataTable
                      rows={repos}
                      columns={repoColumns}
                      rowKey={(r) => r.id}
                      initialSort={{ key: 'name', direction: 'asc' }}
                      emptyLabel="Aucun repository configuré."
                    />
                  )}
                </Panel>
              </div>

              {/* The app: what they run, then how they have it set up. One card
                  because both answer "what is their desktop doing", and the version is
                  the first thing a support question turns on — an operator who reads
                  "0.54.1" when 0.59.3 has shipped has their answer before reading a
                  single setting. */}
              <Panel label="Application">
                <div className="flex flex-wrap items-center gap-x-5 gap-y-4 border-b border-regie-rule-soft px-6 py-7">
                  {/* The desktop app's REAL icon — `public/img/app-icon.png`, resized
                      from `desktop/resources/icon.png`, the file electron-builder ships
                      as the app icon. Not the webapp's favicon, which is a different
                      drawing: this is the icon the person is looking at in their dock,
                      and the version beside it is that app's build.
                      A copy because the webapp cannot read outside its own public dir —
                      at 256px, enough for a 44px slot on a 3x screen and 46 kB instead
                      of the 434 kB original.
                      Decorative alt: the panel is captioned "Application" and the
                      version is right there, so a screen reader gains nothing from
                      "logo Magic Slash" between them. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/img/app-icon.png"
                    alt=""
                    className="h-11 w-11 shrink-0 rounded-xl border border-regie-rule-soft shadow-sm shadow-brand/[0.06]"
                  />

                  {devices === null ? (
                    <p className="font-display text-[20px] font-bold leading-none text-regie-dim">
                      Chargement…
                    </p>
                  ) : (
                    <>
                      {/* Named, so the headline reads as a sentence — "Magic Slash
                          v0.59.2" — rather than as a bare number needing the panel
                          caption to mean anything. The name stays when there is no
                          version: the card is still about their desktop app, and the
                          pill beside it says they never opened it.
                          Cera Pro, not the console's monospace. The mono rule is for
                          values READ CHARACTER BY CHARACTER and compared down a column
                          — an email, a uuid, a version in the Users table. This one is
                          alone on a card and is a heading, so it takes the face the
                          console sets its headings in.
                          20px and not 28: it only has to be the largest thing in the
                          card, and at 28 it was competing with the page title above
                          it, which is the account's own name. */}
                      <p className="font-display text-[20px] font-bold leading-none tracking-tight text-ink">
                        Magic Slash{' '}
                        {runningVersion ? (
                          `v${runningVersion}`
                        ) : (
                          <span className="text-regie-dim">—</span>
                        )}
                      </p>

                      {/* The verdict, against the SHIPPED release rather than against
                          the fleet. Only three outcomes now: no device at all, on the
                          release, or behind it. */}
                      {runningVersion === null ? (
                        <Pill tone="neutral">jamais lancé</Pill>
                      ) : standing === 'current' ? (
                        <Pill tone="brand">à jour</Pill>
                      ) : (
                        <span className="inline-flex items-center gap-2.5">
                          <Pill tone="yellow">en retard</Pill>
                          <span className="font-mono text-[11px] text-regie-dim">
                            dernière version : {LATEST_DESKTOP_VERSION}
                          </span>
                        </span>
                      )}

                      {/* Which of their machines this version comes from. With two
                          devices on two versions the headline is one of them, and
                          naming it is the difference between a fact and a claim. */}
                      {runningDevice && (
                        <span className="ml-auto font-mono text-[11px] text-regie-dim">
                          {runningDevice.deviceName ?? 'device inconnu'} · vu{' '}
                          {formatRelative(runningDevice.lastSeenAt)}
                        </span>
                      )}
                    </>
                  )}
                </div>

                {/* What they run it ON, then how they have it SET UP — stacked, in that
                    order: the devices table answers "is this machine even alive" and
                    "which build", which is where a support question starts, and the
                    feature boxes are what you read once it has narrowed.
                    Clipped, because that order is also a priority: the ten feature
                    boxes are the tallest thing on the page and the least often the
                    answer, so they are one click away instead of pushing Agents and
                    Repositories off the screen. 300px keeps the version headline, the
                    devices table and the start of the features in view.
                    The headline above stays OUT of the collapsible: which build they
                    run is the one fact this card exists to state. */}
                <Collapsible collapsedHeight={300} moreLabel="Tout afficher" lessLabel="Réduire">
                  <div className="divide-y divide-regie-rule-soft">
                    <section className="min-w-0 p-4">
                      <header className="mb-2 flex items-baseline gap-2">
                        <SectionLabel>Devices</SectionLabel>
                        {devices && (
                          <span className="font-mono text-[11px] text-regie-dim">{devices.length}</span>
                        )}
                      </header>
                      {/* Boxed, instead of bleeding to the card's edges. DataTable is
                          built to sit flush inside a Panel, whose rounding clips it; here
                          it is one section among others and needs its own edges.
                          `overflow-hidden` is what rounds it: the header row and the last
                          row would otherwise square off the corners just set. */}
                      <div className="overflow-hidden rounded-xl border border-regie-rule-soft">
                        {devices === null ? (
                          <Empty>Chargement…</Empty>
                        ) : (
                          <DataTable
                            rows={devices}
                            columns={deviceColumns}
                            rowKey={(d) => d.deviceId}
                            initialSort={{ key: 'seen', direction: 'desc' }}
                            emptyLabel="N'a jamais lancé l'app desktop."
                          />
                        )}
                      </div>
                    </section>

                    <section className="min-w-0 p-4">
                      <header className="mb-2">
                        <SectionLabel>Features</SectionLabel>
                      </header>
                      {/* One box per feature. The flat 17-row list this replaces made
                          "PR review poll interval" and "Spotlight shortcut" look like
                          peers of "Theme", so reading it meant rebuilding the app's own
                          grouping in your head on every visit.
                          Two columns from sm rather than xl, now that the section has the
                          card's whole width back instead of 40% of it. */}
                      <div className="grid gap-2 sm:grid-cols-2">
                        {SETTING_GROUPS.map((group) => (
                          <div
                            key={group.title}
                            className="overflow-hidden rounded-xl border border-regie-rule-soft bg-regie-ground/40"
                          >
                            <p className="border-b border-regie-rule-soft px-3 py-1.5 font-display text-[10px] font-bold uppercase tracking-[0.1em] text-regie-dim">
                              {group.title}
                            </p>
                            <dl>
                              {group.fields.map(({ field, label }) => {
                                const { effective, unset } = resolveSetting(field, user.settings[field])
                                return (
                                  <div
                                    key={field}
                                    // items-CENTER, not items-baseline: the theme row is
                                    // 20px of chip, which makes the row taller than its
                                    // own text, and on a baseline the label sat at the
                                    // top of that extra space.
                                    className="flex items-center justify-between gap-3 px-3 py-1.5"
                                  >
                                    <dt className="min-w-0 text-[11px] text-regie-dim">{label}</dt>
                                    <dd
                                      className={`flex shrink-0 items-center gap-1.5 font-mono text-[11px] ${unset ? 'text-regie-dim/70' : 'text-ink'}`}
                                    >
                                      {/* The theme chip and the switch both show the
                                          state IN FORCE, default included — the "par
                                          défaut" tag beside them is what keeps saying
                                          whether the user ever chose it. */}
                                      {field === 'theme' && <ThemeChip themeId={String(effective)} />}
                                      {typeof effective === 'boolean' ? (
                                        <SwitchValue on={effective} />
                                      ) : (
                                        String(effective)
                                      )}
                                      {unset && (
                                        <span className="text-[10px] text-regie-dim/70">par défaut</span>
                                      )}
                                    </dd>
                                  </div>
                                )
                              })}
                            </dl>
                          </div>
                        ))}
                      </div>
                    </section>
                  </div>
                </Collapsible>
              </Panel>
            </div>

            <Panel label="Agents" action={agents && <SectionLabel>{agents.length}</SectionLabel>}>
              {agents === null ? (
                <Empty>Chargement…</Empty>
              ) : (
                <DataTable
                  rows={agents}
                  columns={agentColumns}
                  rowKey={(a) => a.id}
                  initialSort={{ key: 'created', direction: 'desc' }}
                  emptyLabel="Aucun agent."
                />
              )}
            </Panel>

          </div>
        </div>
      )}
    </div>
  )
}
