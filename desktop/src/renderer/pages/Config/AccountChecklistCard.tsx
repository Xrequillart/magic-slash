import { useEffect, useMemo, useState } from 'react'
import { ChecklistCard, CollapsibleLine, Text } from '@ds/desktop'
import { CheckCircle2, Circle } from '@ds/desktop/icons'
import type { InvalidRepo } from '../../../preload'
import type { SetupStatus } from '../../../types'
import { useAuth } from '../../hooks/useAuth'
import { useJiraAuth } from '../../hooks/useJiraAuth'
import { useStore } from '../../store'
import { buildRepoSetup, needsRepoSetup } from '../../utils/repoSetup'
import { useT, type MessageKey } from '../../i18n'

/**
 * The onboarding checklist, kept visible after onboarding.
 *
 * Every step here has its own first-run wizard (setup, profile, repositories) or
 * its own modal (sign in), and each of them disappears the moment it is done or
 * dismissed. That left no place to answer the one question a user asks after
 * clicking through four modals: "am I actually set up?". This card answers it —
 * a verdict plus the rows it is computed from, so a "not yet" says which
 * step is missing rather than just being a red light.
 *
 * Not every row is always there: the cloud account and the Atlassian link are each
 * shown only when they are steps the user can actually complete, which is why the
 * total in the hint is counted from the list rather than written as a constant.
 *
 * NO CONTROLS, BUT NOT SILENT ABOUT THE FIX. Each row's repair already lives one tab
 * away (Application for the machine setup, Repositories for the repos, Connections for
 * the Atlassian link) or right below it in this same tab, and duplicating those
 * affordances here would mean two places to keep in sync for no new capability. What a
 * pending row DOES carry is a fold saying where that place is — which costs a sentence
 * and nothing else, and is the difference between a card that names a gap and a card
 * that closes it.
 *
 * A TICKED ROW HAS NO FOLD AND NO CHEVRON. There is nothing behind it: the step is
 * done, and a button that opens an empty drawer is an affordance that lies. That is
 * `CollapsibleLine`'s own rule, stated in its header.
 *
 * THE NEXT STEP OPENS ITSELF. Landing on this tab with the first pending row already
 * unfolded answers "what do I do now" without a click; touching any chevron switches
 * the card to whatever the reader has chosen since. `opened === null` is what tells
 * those two apart — an empty Set means "they closed everything", which is a different
 * state from "they have not touched it yet" and must not re-open anything.
 */
export function AccountChecklistCard() {
  const t = useT()
  const { status: authStatus, loading: authLoading } = useAuth()
  const config = useStore((s) => s.config)
  // The same hook the Atlassian section on the Connections tab uses, so the row
  // and the section it points at can never disagree — and so a connection made
  // over there ticks the row without a reload, the push being what both of them
  // listen to.
  const { status: jiraStatus, loading: jiraLoading } = useJiraAuth()

  const [profileFilled, setProfileFilled] = useState<boolean | null>(null)
  const [setupStatus, setSetupStatus] = useState<SetupStatus | null>(null)
  const [setupFailed, setSetupFailed] = useState(false)
  const [invalidRepos, setInvalidRepos] = useState<InvalidRepo[]>([])
  /**
   * Which folds are open — and `null` for "the reader has not touched a chevron yet",
   * which is NOT the same as an empty Set. Null defers to the first pending step, so
   * the tab opens on what to do next; an empty Set means they closed everything, and
   * re-opening a row they just shut would be the card arguing with them.
   */
  const [opened, setOpened] = useState<Set<string> | null>(null)

  useEffect(() => {
    window.electronAPI.profile
      .get()
      .then((profile) => setProfileFilled(profile !== null))
      .catch(() => setProfileFilled(false))
  }, [])

  useEffect(() => {
    window.electronAPI.setup
      .getStatus()
      .then(setSetupStatus)
      // Told apart from "still loading" on purpose: the card is unrendered either
      // way, but a failure that only cleared the loading flag would leave the
      // placeholder pulsing forever, like SetupHealthCard.
      .catch(() => setSetupFailed(true))
  }, [])

  // Same source as the launch modal: the main process is the only side that can
  // stat the folders, and it re-emits on a timer and on focus.
  useEffect(() => {
    window.electronAPI.config.getInvalidRepos().then(setInvalidRepos).catch(() => {})
    const unsubscribe = window.electronAPI.config.onInvalidRepos(setInvalidRepos)
    return () => { unsubscribe() }
  }, [])

  const repoReady = useMemo(
    () => (config ? !needsRepoSetup(buildRepoSetup(config.repositories, invalidRepos)) : false),
    [config, invalidRepos],
  )

  // A missing OPTIONAL prerequisite is a warning, not a blocker — same verdict as
  // the machine setup card, so the two can never disagree.
  const setupReady = useMemo(() => {
    if (!setupStatus) return false
    const missingRequired = setupStatus.prerequisites.some((p) => p.required && (!p.installed || p.outdated))
    const mcpToFix = setupStatus.mcpServers.some(
      (s) => s.state !== 'configured'
        && (s.id === 'github' ? setupStatus.integrations.github : setupStatus.integrations.atlassian),
    )
    return !missingRequired && !mcpToFix && setupStatus.missingSkills.length === 0
  }, [setupStatus])

  if (setupFailed) return null

  // A placeholder until every answer is in: a half-loaded card would show green
  // rows turning grey, which reads as something breaking rather than as loading.
  // The placeholder keeps the card's own shape, so the verdict lands in place
  // instead of pushing the sections under it down the page.
  if (authLoading || jiraLoading || profileFilled === null || setupStatus === null || !config) {
    // Five rows is the shape of a stock install: a build with no Supabase env drops
    // the cloud row, and GitHub-only — or a build with no Atlassian application id —
    // drops the Atlassian one. Neither is known yet here, so the skeleton assumes the
    // default install and may show one bar too many for a beat; a bar that vanishes is
    // cheaper than rows appearing under a verdict that has already landed.
    return <ChecklistSkeleton rows={authLoading || authStatus.enabled ? 5 : 4} />
  }

  // `todo` is what unfolds under a row that is NOT ticked: one sentence naming the
  // place that fixes it. Never read for a done step — see the render, which gives a
  // ticked row neither a fold nor a chevron.
  const steps: { key: MessageKey; todo: MessageKey; done: boolean }[] = [
    // The cloud account is optional and hidden entirely when no Supabase env is
    // baked in — it cannot be a step the user is failing to complete.
    ...(authStatus.enabled
      ? [{
        key: 'account.checklist.step.account' as MessageKey,
        todo: 'account.checklist.todo.account' as MessageKey,
        done: authStatus.loggedIn,
      }]
      : []),
    // Right after the cloud account: it is the next thing to set up, even though the
    // section that sets it up now lives on the Connections tab rather than under this
    // card. Hidden unless it is a step that can be completed at all: Atlassian has to
    // be one of the chosen integrations — someone on GitHub-only has no Jira to read —
    // and the build has to carry an Atlassian application id, without which the Connect
    // button on Connections cannot even open a browser (`jira.notConfigured`).
    ...(setupStatus.integrations.atlassian && jiraStatus.configured
      ? [{
        key: 'account.checklist.step.atlassian' as MessageKey,
        todo: 'account.checklist.todo.atlassian' as MessageKey,
        // `unverified` is connected-but-refused — Atlassian turned the stored
        // credential down, which usually means the user revoked the app. Ticking it
        // would mark a step done whose feature returns nothing, which is the exact
        // confusion this card exists to remove.
        done: jiraStatus.connected && !jiraStatus.unverified,
      }]
      : []),
    { key: 'account.checklist.step.profile', todo: 'account.checklist.todo.profile', done: profileFilled },
    { key: 'account.checklist.step.repository', todo: 'account.checklist.todo.repository', done: repoReady },
    { key: 'account.checklist.step.setup', todo: 'account.checklist.todo.setup', done: setupReady },
  ]

  const done = steps.filter((step) => step.done).length
  const ready = done === steps.length

  // The one that opens itself while `opened` is null. Undefined when everything is
  // ticked, which is also when no row has a fold at all.
  const nextStep = steps.find((step) => !step.done)?.key
  const isOpen = (key: MessageKey) => (opened ? opened.has(key) : key === nextStep)
  const toggleStep = (key: MessageKey) => {
    setOpened((previous) => {
      // The first toggle starts from what is ON SCREEN, not from nothing: the reader
      // sees the next step already unfolded, so a click on a second row has to add to
      // that rather than silently close it.
      const next = new Set(previous ?? (nextStep ? [nextStep as string] : []))
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  return (
    /* THE CARD IS `ChecklistCard` NOW — the plate, the verdict band, the badge and the
       hairline over every row went to the design system whole, on `PullRequestCard`'s
       shape. What is left here is what only the app knows: which steps exist for this
       install, whether each is done, and the words.

       NO SECTION HEADER, and no wrapper left to hold one. "Account status" sat above
       this card in the rung the profile section still uses, and the card's own header
       band now states the verdict in words with the count beside it — a title saying
       the same thing one line higher is the same thing said twice. `CloudAccountSection`
       lost its own for the same reason. */
    <ChecklistCard
        verdict={ready ? 'ready' : 'pending'}
        title={ready ? t('account.checklist.ready') : t('account.checklist.pending')}
        subtitle={ready
          ? t('account.checklist.readyHint')
          : t('account.checklist.pendingHint', { done, total: steps.length })}
        // The arithmetic behind the verdict, which the words above state but do not
        // quantify. Green only when it is ALL of them: a 4/5 in green would be a tick
        // on a card whose own mark says otherwise.
        badge={{ label: `${done}/${steps.length}`, tone: ready ? 'green' : 'yellow' }}
      >
        {/* ALL TICKED, THE HEADER ALONE. Five green rows under a band that already says
            "ready" in words and 5/5 in a badge are the same news six times over, on a
            card that opens the tab every visit for the rest of the install's life. */}
        {!ready && steps.map((step) => (
          <CollapsibleLine
            key={step.key}
            // The mark keeps its colour when ticked while the LABEL steps back to grey
            // — `muted`'s whole point, and what makes scanning the list land on the
            // rows that still need doing.
            icon={step.done ? CheckCircle2 : Circle}
            tone={step.done ? 'green' : 'neutral'}
            label={t(step.key)}
            muted={step.done}
            // No toggle on a ticked row, and therefore no chevron: there is nothing
            // behind it. Passing one would be a button that opens an empty drawer.
            toggle={step.done ? undefined : { open: isOpen(step.key), onToggle: () => toggleStep(step.key) }}
          >
            {/* Only ever rendered for a pending row — `CollapsibleLine` draws children
                whenever there is no toggle, so a done row must be handed none at all. */}
            {step.done ? undefined : (
              <Text size="xs" tone="secondary" className="block opacity-70">
                {t(step.todo)}
              </Text>
            )}
          </CollapsibleLine>
        ))}
    </ChecklistCard>
  )
}

/**
 * The wait, in the card's own shape.
 *
 * THE DRAWING IS `ChecklistCard`'S NOW — it takes a row count and a label and renders
 * its own placeholder, so the skeleton cannot describe a card that has since changed.
 * What is left here is the row count, which only this side knows.
 *
 * Kept as a named function rather than inlined at the one `return` that uses it: the
 * caller's line reads as a sentence about what it is doing — show a placeholder of this
 * many rows — where the props spelled out there would read as a second card.
 */
function ChecklistSkeleton({ rows }: { rows: number }) {
  const t = useT()

  return <ChecklistCard verdict="pending" title="" loading={{ rows, label: t('common.loading') }} />
}
