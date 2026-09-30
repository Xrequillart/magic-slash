import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import {
  Trash2, AlertTriangle, Plus, ArrowLeft, Building2, Lock, FolderOpen, Upload, Github, Jira,
  Ticket, Settings2, Puzzle, GitBranch, FolderGit2, Workflow, Pencil,
} from '@ds/desktop/icons'
import { useAuth } from '../../hooks/useAuth'
import { useConfig } from '../../hooks/useConfig'
import { useOrg } from '../../hooks/useOrg'
import { useIsFullScreen } from '../../hooks/useIsFullScreen'
import { Modal } from '../../components/Modal'
import { showToast } from '../../components/Toast'
import { getProjectColorMap } from '../../utils/projectColors'
import { RepoColorPicker } from './RepoColorPicker'
import { nextWorkflowStepColor } from '@ds/desktop/palette'
import { useT, type MessageKey, type Translate } from '../../i18n'
import {
  Banner,
  Button,
  Card,
  EmptyState,
  Loader,
  RepoPageHeader,
  SectionHeader,
  SettingsCard,
  SkillIntro as DsSkillIntro,
  TabStrip,
  Text,
  WorkflowCanvas,
  WorkflowEditor,
  skillIcon,
  workflowCardWidths,
  workflowPositions,
  type IconComponent,
  type SelectOption,
  type SettingsCardRow,
  type WorkflowCanvasLabels,
  type WorkflowCanvasSelection,
  type WorkflowEditorBanner,
  type WorkflowEditorLabels,
  type WorkflowInspectorIntro,
  type WorkflowInspectorSettings,
  type WorkflowInspectorTarget,
  type WorkflowProblemItem,
} from '@ds/desktop'
import { LANGUAGES } from '../../languages'
import { TabSweep } from '../../components/TabSweep'
import {
  COMMIT_FORMAT_LABELS,
  COMMIT_STYLE_LABELS,
  commitSummary,
  planSummary,
  prSummary,
  resolveSummary,
  reviewSummary,
  type SkillSummary,
} from '../../utils/skillSummary'
import { SELECT_WIDTH } from '../../theme/controls'
import {
  PLAN_SPLITTING_MODES,
  PLAN_ACCEPTANCE_CRITERIA_FORMATS,
  type PlanSettingsInput,
  type SkillShareResult,
} from '../../../types'
import { resolveReviewLanguage, resolveSpecLanguage, resolveTicketLanguage } from '../../../languages'
import { resolveGitHubIssuesUrl, resolveJiraProject, resolveJiraSite } from '../../../tracker'
import type { ResolvedWorkflow } from '../../../workflow/model'
import {
  EMPTY_OVERLAY, addLink, addStep, composeWorkflow, customNodeId, isCustomNodeId, isDefaultLink, isLinkIntoStart, moveNode,
  pinPositions, problems, removeLink, removeStep, sameOverlay, setLinkKind, setLinkOutcome, setStepColor, setStepEnabled, setStepMode,
  unreachableSteps, type WorkflowOverlay, type WorkflowProblem,
} from '../../../workflow/overlay'
import type { ListingEntry } from '../../hooks/useSkills'
import {
  folderSkillsOf, modeHasEffect, problemNodeIds, skillDescription, stepColors, skillDisplayName, skillOptions, stepHints, workflowCanvasData,
} from './workflowCanvasData'

interface RepoPageProps {
  repoName: string
}

/**
 * The four tabs the page is cut into, grouped by SUBJECT rather than by skill.
 *
 * That regrouping is the point. The tracker used to be spread over three sections
 * — the remote under General, the Jira URL under Issues, the project key and the
 * issue types under Plan — and the languages over five, so a single question
 * ("where do this repo's tickets go?", "what language does it work in?") could not
 * be answered without reading the whole page and remembering the answers.
 *
 * Message KEYS, not labels, like SETTINGS_TABS in Config/index.tsx: module scope
 * is evaluated once at import, so a `t()` call here would pin the strip to whatever
 * language the app booted in.
 *
 * Rendered by the shared `TabStrip`, the same control the Team page switches
 * organizations with and the dashboard switches scopes with. Each tab carries an
 * icon because the strip styles every pill alike: Danger has no red of its own
 * there, and the bin is what keeps it from reading as a fourth ordinary tab.
 */
type RepoTab =
  | 'general' | 'repository' | 'tickets' | 'workflow'
  | 'annex'

const REPO_TABS: { id: RepoTab; labelKey: MessageKey; icon: IconComponent }[] = [
  // Labelled with each subject's OWN `*.section` key rather than a parallel
  // `repo.tab.*` family: a tab and the thing it holds have one name, so there is
  // nowhere for two spellings of it to drift apart — and no second string to forget
  // to translate. Danger is the exception: its section is headed "Danger Zone",
  // which is a warning, where a pill wants one word.
  { id: 'general', labelKey: 'repo.general.section', icon: Settings2 },
  // Repository before Tickets: the first three tabs are the repo itself, what it is,
  // where its code lives, where its tickets go, before the strip turns to the skills.
  //
  // There is no Languages tab: each language is set where it is used, on the skill that
  // writes in it (the workflow editor's inspector), and the discussion language, which
  // every skill speaks, on General.
  { id: 'repository', labelKey: 'repo.repository.section', icon: GitBranch },
  { id: 'tickets', labelKey: 'repo.tickets.section', icon: Ticket },
  // The workflow holds the cycle skills' settings now: each one's are read and changed
  // on its step, in the workflow editor's inspector (`stepSettings`), not in a tab.
  { id: 'workflow', labelKey: 'repo.workflow.section', icon: Workflow },
  // The side skills, entered from wherever the user is rather than as steps of the cycle,
  // have no step to hang their settings from: they share this tab. Review, for now.
  { id: 'annex', labelKey: 'repo.annex.section', icon: Puzzle },
]

/**
 * The label each `plan` enum value wears in the form.
 *
 * Total records over the value lists exported by types.ts, which are the same
 * lists `updateRepositoryPlanSettings` validates against — so the dropdowns can
 * only ever offer a value the write path accepts, and adding a value there
 * without a label here is a tsc error rather than a blank option.
 */
/**
 * The two trackers a repository can file into.
 *
 * Not a config value: a view onto `plan.tracker`, which the skills read and which keeps
 * its three values (`github` / `jira` / `ask`). The third is not a tracker — it is the
 * instruction to ask at runtime — so it is a toggle beside this select rather than an
 * option inside it. Naming a behaviour as if it were a tool is what made the old
 * single three-way row hard to answer: "Ask each time" sat next to a Jira project key
 * that mattered for only two of its three values.
 */
const TRACKER_MODES = ['github', 'jira'] as const

const TRACKER_MODE_LABELS: Record<(typeof TRACKER_MODES)[number], MessageKey> = {
  github: 'repo.tracker.modeGithub',
  jira: 'repo.tracker.modeJira',
}

/** Each tracker's own mark, before its name in the picker and on its trigger. */
const TRACKER_MODE_ICONS: Record<(typeof TRACKER_MODES)[number], IconComponent> = {
  github: Github,
  jira: Jira,
}



const PLAN_SPLITTING_LABELS: Record<(typeof PLAN_SPLITTING_MODES)[number], MessageKey> = {
  conservative: 'repo.plan.splittingConservative',
  balanced: 'repo.plan.splittingBalanced',
  eager: 'repo.plan.splittingEager',
}

const PLAN_ACCEPTANCE_CRITERIA_LABELS: Record<(typeof PLAN_ACCEPTANCE_CRITERIA_FORMATS)[number], MessageKey> = {
  checklist: 'repo.plan.acceptanceCriteriaChecklist',
  gherkin: 'repo.plan.acceptanceCriteriaGherkin',
  none: 'repo.plan.acceptanceCriteriaNone',
}

/**
 * What the skill a tab configures actually DOES, at the top of that tab.
 *
 * The settings alone never said it: "How much to split" and "Acceptance criteria" are
 * knobs on a run whose shape you had to already know — that /magic:plan brainstorms
 * first, writes a spec, and creates nothing until you approve it. Five tabs out of
 * nine configure a skill rather than the repository, and those five get this.
 *
 * DESCRIBES THIS REPOSITORY, not the skill in general: the steps are composed from the
 * settings below by `utils/skillSummary`, so a repo filing GitHub issues reads "one
 * issue per story on owner/repo" where a Jira one reads "the epic (Epic) and its
 * stories (Story) in project PROJ". A generic summary was wrong for whichever half of
 * the fleet was configured the other way, and there is no lead sentence long enough to
 * cover both without saying nothing.
 *
 * The lead is the one static line — the skill's job in a clause — and the steps under
 * it carry every value. Flags that only add something to the output (co-author, ticket
 * id, labels) trail below as short phrases instead of taking a step of their own.
 */
const SKILL_INTROS = {
  plan: { command: '/magic:plan', icon: skillIcon('magic-plan'), lead: 'repo.plan.intro' },
  start: { command: '/magic:start', icon: skillIcon('magic-start'), lead: 'repo.start.intro' },
  commit: { command: '/magic:commit', icon: skillIcon('magic-commit'), lead: 'repo.commit.intro' },
  pr: { command: '/magic:pr', icon: skillIcon('magic-pr'), lead: 'repo.pr.intro' },
  review: { command: '/magic:review', icon: skillIcon('magic-review'), lead: 'repo.review.intro' },
  resolve: { command: '/magic:resolve', icon: skillIcon('magic-resolve'), lead: 'repo.resolve.intro' },
} satisfies Record<string, { command: string; icon: IconComponent; lead: MessageKey }>

function SkillIntro({ skill, summary }: { skill: keyof typeof SKILL_INTROS; summary: SkillSummary }) {
  const t = useT()
  const { command, icon, lead } = SKILL_INTROS[skill]
  return (
    <DsSkillIntro
      command={command}
      icon={icon}
      // Every string is resolved HERE, which is the split `SkillIntro` is built on: the
      // shape is the design system's, the sentences are composed from this repository's
      // own settings by `utils/skillSummary` and could not be anywhere else.
      steps={summary.steps.map((step) => t(step.key, step.vars))}
      flags={summary.tail.map((flag) => t(flag.key, flag.vars))}
    >
      {t(lead)}
    </DsSkillIntro>
  )
}

/**
 * A picker over a closed value list, with its label map — as a `SettingRow` CONTROL and
 * no longer as markup.
 *
 * `Select`'s drawing, where every one of these was a native `<select>` and the nine that
 * were written out row by row are this. What it adds is the pairing a settings row
 * actually wants: the values, and the message key each one is called by, so no call site
 * spells an `<option>` at all.
 *
 * A FUNCTION RETURNING A DESCRIPTOR, because that is what `SettingsCard` takes. It was a
 * component, which meant every row it ended had to be markup too — one JSX control was
 * enough to keep a whole card hand-built.
 */
function enumControl<T extends string>(
  t: Translate,
  value: string,
  values: readonly T[],
  labels: Record<T, MessageKey>,
  onChange: (value: string) => void,
  /** The control's accessible name — the row's own label. Translated. */
  ariaLabel: string,
) {
  return {
    kind: 'select' as const,
    value,
    options: values.map((v) => ({ value: v, label: t(labels[v]) })),
    onChange,
    width: SELECT_WIDTH,
    ariaLabel,
  }
}

/** `enumControl`'s select, each option wearing its value's glyph. */
function withIcons<T extends string>(control: ReturnType<typeof enumControl<T>>, icons: Record<T, IconComponent>) {
  return { ...control, options: control.options.map((option) => ({ ...option, icon: icons[option.value as T] })) }
}

/**
 * The value lists this page picks from, and what each entry is called.
 *
 * Message KEYS and not labels, for the reason every catalogue in this app gives:
 * module scope is evaluated once at import, so a `t()` here would pin the list to
 * whatever language the app booted in.
 */
const COMMIT_STYLES = ['single-line', 'multi-line'] as const
const COMMIT_STYLE_LABEL: Record<(typeof COMMIT_STYLES)[number], MessageKey> = {
  'single-line': 'repo.commit.styleSingle',
  'multi-line': 'repo.commit.styleMulti',
}

const COMMIT_FORMATS = ['conventional', 'angular', 'gitmoji', 'none'] as const
const COMMIT_FORMAT_LABEL: Record<(typeof COMMIT_FORMATS)[number], MessageKey> = {
  conventional: 'repo.commit.formatConventional',
  angular: 'repo.commit.formatAngular',
  gitmoji: 'repo.commit.formatGitmoji',
  none: 'repo.commit.formatNone',
}

const TEST_ACCOUNT_MODES = ['off', 'reference', 'inline'] as const
const TEST_ACCOUNT_LABEL: Record<(typeof TEST_ACCOUNT_MODES)[number], MessageKey> = {
  off: 'repo.pr.testAccountsOff',
  reference: 'repo.pr.testAccountsReference',
  inline: 'repo.pr.testAccountsInline',
}

const TEMPLATE_CHECKBOX_MODES = ['never', 'type', 'all'] as const
const TEMPLATE_CHECKBOX_LABEL: Record<(typeof TEMPLATE_CHECKBOX_MODES)[number], MessageKey> = {
  never: 'repo.pr.templateCheckboxesNever',
  type: 'repo.pr.templateCheckboxesType',
  all: 'repo.pr.templateCheckboxesAll',
}

const BODY_VERBOSITY_MODES = ['concise', 'normal', 'detailed'] as const
const BODY_VERBOSITY_LABEL: Record<(typeof BODY_VERBOSITY_MODES)[number], MessageKey> = {
  concise: 'repo.pr.bodyVerbosityConcise',
  normal: 'repo.pr.bodyVerbosityNormal',
  detailed: 'repo.pr.bodyVerbosityDetailed',
}

const START_EXPLORATION_MODES = ['auto', 'always', 'never'] as const
const START_EXPLORATION_LABEL: Record<(typeof START_EXPLORATION_MODES)[number], MessageKey> = {
  auto: 'repo.start.explorationAuto',
  always: 'repo.start.explorationAlways',
  never: 'repo.start.explorationNever',
}

const START_EXECUTION_MODES = ['auto', 'solo', 'multi'] as const
const START_EXECUTION_LABEL: Record<(typeof START_EXECUTION_MODES)[number], MessageKey> = {
  auto: 'repo.start.executionAuto',
  solo: 'repo.start.executionSolo',
  multi: 'repo.start.executionMulti',
}

/** The critic's two numbers, and the range the write path accepts for each (config.ts). */
const START_CRITIC_ITERATIONS = { min: 0, max: 5, fallback: 3 }
const START_CRITIC_SCORE = { min: 1, max: 10, fallback: 8 }

const REVIEW_MODES = ['ask', 'post'] as const
const REVIEW_MODE_LABEL: Record<(typeof REVIEW_MODES)[number], MessageKey> = {
  ask: 'repo.review.modeAsk',
  post: 'repo.review.modePost',
}

const RESOLVE_COMMIT_MODES = ['new', 'amend', 'ask'] as const
const RESOLVE_COMMIT_MODE_LABEL: Record<(typeof RESOLVE_COMMIT_MODES)[number], MessageKey> = {
  new: 'repo.resolve.modeNew',
  amend: 'repo.resolve.modeAmend',
  ask: 'repo.resolve.modeAsk',
}

const RESOLVE_CONFIG_SOURCES = ['commit', 'custom'] as const
const RESOLVE_CONFIG_SOURCE_LABEL: Record<(typeof RESOLVE_CONFIG_SOURCES)[number], MessageKey> = {
  commit: 'repo.resolve.useCommitConfig',
  custom: 'repo.resolve.customConfig',
}

const RESOLVE_VERBOSITIES = ['minimal', 'normal', 'detailed'] as const
const RESOLVE_VERBOSITY_LABEL: Record<(typeof RESOLVE_VERBOSITIES)[number], MessageKey> = {
  minimal: 'repo.resolve.verbosityMinimal',
  normal: 'repo.resolve.verbosityNormal',
  detailed: 'repo.resolve.verbosityDetailed',
}

/**
 * Sample commit message for the format preview. Deliberately NOT translated to
 * the interface language: it illustrates the shape Claude will produce, and what
 * Claude writes follows this repo's own `languages.commit` setting, not the UI's.
 * Translating it would show a French sample above a repo that commits in English.
 */
function generateCommitExample(format: string, style: string, includeTicketId: boolean): string {
  const examples: Record<string, { type?: string; scope?: string; emoji?: string; msg: string }> = {
    'conventional': { type: 'feat', msg: 'add user authentication' },
    'angular': { type: 'feat', scope: 'auth', msg: 'add user authentication' },
    'gitmoji': { emoji: '\u2728', msg: 'add user authentication' },
    'none': { msg: 'Add user authentication' }
  }

  const bodyText = 'Implement login flow with session management'
  const ticketId = '[PROJ-123]'
  const example = examples[format] || examples['conventional']

  let firstLine = ''
  switch (format) {
    case 'angular':
      firstLine = `${example.type}(${example.scope}): ${example.msg}`
      break
    case 'gitmoji':
      firstLine = `${example.emoji} ${example.msg}`
      break
    case 'none':
      firstLine = example.msg
      break
    case 'conventional':
    default:
      firstLine = `${example.type}: ${example.msg}`
      break
  }

  if (includeTicketId) {
    firstLine += ` ${ticketId}`
  }

  if (style === 'multi-line') {
    return `${firstLine}\n\n${bodyText}`
  }

  return firstLine
}

/** What a step's inspector shows of its skill: what it does, then its settings. */
interface WorkflowStepConfig {
  intro?: WorkflowInspectorIntro
  settings: WorkflowInspectorSettings[]
}

/**
 * THE WORKFLOW TAB: the flow this repository's skills follow, drawn on the design
 * system's canvas, and the full-screen editor its Edit button opens for whoever may
 * change it (the repository's owner, or an admin of its organization: `readOnly` is
 * RepoPage's, which mirrors RLS).
 *
 * THE TAB ONLY SHOWS. The canvas in the tab is read-only, with no minimap, and an Edit
 * button under the section's description; everything that changes the flow happens in
 * the editor, which covers the
 * whole window (`WorkflowEditor`, in a fixed layer over the app and its settings
 * overlay). A read-only member gets the same button, as Open, and the same editor with
 * nothing to change: the inspector still says how each step and link runs.
 *
 * WHAT IS EDITED IS THE OVERLAY, not the flow: the steps, links, link kinds and card
 * positions added to the default flow (workflow/overlay.ts). Two copies of it are kept,
 * the one saved and the draft, and everything the editor draws is `composeWorkflow(draft)`,
 * so the canvas shows the flow the skills would get if Save were pressed now.
 * `problems(draft)`, the same judge the main process saves with, lists what stands in
 * the way, and Save stays disabled until the list is empty and the draft differs from
 * what is saved. Every edit is recorded, for ⌘Z and ⇧⌘Z; a reload forgets the history.
 *
 * CARDS STAY WHERE THEY WERE SEEN. A card without a stored position is laid out from the
 * links, so an edit to the links would move the ones not yet placed: before such an
 * edit (a step added or removed, a link drawn or removed, a card moved), every card is
 * pinned at the place it is drawn at (`pinPositions`).
 *
 * LEAVING WITH UNSAVED EDITS ASKS FIRST, and leaving drops them: the tab always shows
 * what is saved.
 *
 * PUSHED AS WELL AS ASKED FOR. Loaded on mount, and reloaded whenever the main process
 * says this repository's workflow changed (`onWorkflowChanged`: a save from another
 * window, or from a teammate over Realtime). A change that lands on unsaved edits does
 * not clobber them: a banner says so and offers the reload. A change announced while
 * our own save is in flight is looked at once the save has answered, never dropped.
 *
 * SAVED AGAINST A REVISION. The saved overlay comes with the revision of its row, and
 * a save sends it back: when a teammate saved in the meantime the backend refuses
 * (`conflict`), nothing is overwritten, and the draft stays until the editor reloads.
 * The revision is also how the echo of our own save is told from a teammate's change:
 * reading the workflow again after it finds the revision the save returned.
 *
 * A SKILL ONLY THE EDITOR HAS. A custom step runs a skill by name, and a skill (or a
 * command) that lives only in the editor's `~/.claude` is missing for every teammate.
 * After a save, the ones this save added are offered for a copy into the repository's
 * `.claude`. A copy is not shared yet either: the card's warning follows it until it is
 * committed and pushed (`skills:repoSkillStatus`), and so does a skill the editor
 * created in the repository themselves. Recomputed on load, after every save and copy,
 * and when the window comes back to the front, so a commit or a push made in a
 * terminal clears it, and a declined copy does not quietly forget it.
 *
 * THE KEYBOARD, while the editor is open: ⌘Z / ⇧⌘Z, Delete for what is selected, and
 * Escape to deselect, then to leave. Escape stops here, or the settings overlay under the
 * editor would close with it (its listener is on `window`, this one on `document`).
 *
 * A component of its own, at module scope, because it owns a fetch and an editor's
 * state: RepoPage's state is the repository's settings, and this is not one of them.
 */
/**
 * The repository whose editor opens as soon as its page mounts: set by the editor's
 * repository picker just before it navigates there. A switch is a new route, which
 * remounts RepoPage on General with the editor closed; this is how the next page knows
 * it was reached from an editor. Module scope because the two pages never coexist in
 * one component; RepoPage clears it once it has read it.
 */
let reopenEditorFor: string | null = null

function WorkflowPanel({
  repoName,
  repositories,
  openEditor,
  readOnly,
  stepSettings,
}: {
  repoName: string
  /** Every configured repository, for the editor's picker. */
  repositories: SelectOption[]
  /** Mounted by a switch from another repository's editor: open this one's straight away. */
  openEditor: boolean
  readOnly: boolean
  /** A step's own settings, by the skill it runs, for the inspector. RepoPage's, which holds them. */
  stepSettings: Readonly<Record<string, WorkflowStepConfig>>
}) {
  const t = useT()
  const windowFullScreen = useIsFullScreen()
  // null while loading. `saved` is what the backend holds, `source` whether it is the
  // repository's own flow or the default (the header's hint).
  const [loaded, setLoaded] = useState<
    { saved: WorkflowOverlay; revision: string | null; source: ResolvedWorkflow['source'] } | 'error' | null
  >(null)
  const [draft, setDraft] = useState<WorkflowOverlay>(EMPTY_OVERLAY)
  // The drafts before this one, and the ones undone since, for ⌘Z and ⇧⌘Z.
  const [history, setHistory] = useState<{ past: WorkflowOverlay[]; future: WorkflowOverlay[] }>(EMPTY_HISTORY)
  const [editing, setEditing] = useState(openEditor)
  // Unsaved edits ask before a switch as before a close: where the switch was going.
  const [switchTo, setSwitchTo] = useState<string | null>(null)
  const mountedFor = useRef(repoName)
  // The editor is playing its way out: it unmounts once it says it has (`onLeft`).
  const [leavingEditor, setLeavingEditor] = useState(false)
  const [closePrompt, setClosePrompt] = useState(false)
  const [selected, setSelected] = useState<WorkflowCanvasSelection | null>(null)
  const [focus, setFocus] = useState<{ id: string; n: number } | null>(null)
  const [entries, setEntries] = useState<ListingEntry[]>([])
  // The custom steps' skills teammates don't have yet, and how far each one got: in the
  // editor's `~/.claude` only (`missing`), or in the checkout, not yet on the remote.
  const [unshared, setUnshared] = useState<Record<string, SkillShareResult>>({})
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<
    { kind: 'denied' } | { kind: 'conflict' } | { kind: 'failed'; message: string } | null
  >(null)
  // What the backend refused a save on. The same judge as `problems(draft)`, so this is
  // a safety net for a build skew; it is dropped at the next edit.
  const [refused, setRefused] = useState<WorkflowProblem[] | null>(null)
  const [stale, setStale] = useState(false)
  const [copyOffer, setCopyOffer] = useState<string[] | null>(null)
  const [copying, setCopying] = useState(false)

  const saved = loaded && loaded !== 'error' ? loaded.saved : EMPTY_OVERLAY
  const revision = loaded && loaded !== 'error' ? loaded.revision : null
  // Read by the change listener, which is subscribed once per repository and would
  // otherwise judge "unsaved edits" against the state of the render it was made in.
  // `adopt` also sets the first two at once, for a change judged before the next render.
  const savedRef = useRef(saved)
  const revisionRef = useRef(revision)
  const draftRef = useRef(draft)
  const savingRef = useRef(false)
  // A change announced while our save was in flight, to look at once it has answered.
  const changedDuringSaveRef = useRef(false)
  savedRef.current = saved
  revisionRef.current = revision
  draftRef.current = draft
  // Bumped on every repository switch: an answer for the previous one is dropped.
  const generation = useRef(0)

  const fetchWorkflow = useCallback(async () => {
    const [stored, resolved] = await Promise.all([
      window.electronAPI.config.getRepositoryWorkflowOverlay(repoName),
      window.electronAPI.config.getRepositoryWorkflow(repoName),
    ])
    return { overlay: stored.overlay, revision: stored.revision, source: resolved.source }
  }, [repoName])

  /**
   * Where each of the overlay's folder skills stands for teammates, keeping the ones to
   * warn about. Resolves to those only the editor's `~/.claude` has, the copy candidates.
   * A skill nobody here has (not in `~/.claude`, not in the repository) is someone
   * else's, and nothing this machine can say about it.
   */
  const refreshUnshared = useCallback(async (overlay: WorkflowOverlay): Promise<string[]> => {
    const at = generation.current
    const checks = await Promise.all(folderSkillsOf(overlay).map(async (skill): Promise<[string, SkillShareResult][]> => {
      try {
        const [home, share] = await Promise.all([
          window.electronAPI.skills.homeHasSkill(skill),
          window.electronAPI.skills.repoSkillStatus(repoName, skill),
        ])
        if (share.status === 'shared') return []
        if ((share.status === 'missing' || share.status === 'unknown') && !home) return []
        return [[skill, share]]
      } catch {
        return []
      }
    }))
    const next = Object.fromEntries(checks.flat())
    if (at === generation.current) setUnshared(next)
    return Object.keys(next).filter((skill) => next[skill].status === 'missing')
  }, [repoName])

  const adopt = useCallback((
    next: { overlay: WorkflowOverlay; revision: string | null; source: ResolvedWorkflow['source'] },
  ) => {
    savedRef.current = next.overlay
    revisionRef.current = next.revision
    setLoaded({ saved: next.overlay, revision: next.revision, source: next.source })
    setDraft(next.overlay)
    setHistory(EMPTY_HISTORY)
    setRefused(null)
    setStale(false)
    // The version a conflict was about is now the one on screen.
    setSaveError((was) => (was?.kind === 'conflict' ? null : was))
    return refreshUnshared(next.overlay)
  }, [refreshUnshared])

  useEffect(() => {
    const at = ++generation.current
    setLoaded(null)
    setSelected(null)
    // Idempotent, so StrictMode's second run keeps it open.
    setEditing(openEditor && repoName === mountedFor.current)
    setLeavingEditor(false)
    setClosePrompt(false)
    setSaveError(null)
    setUnshared({})
    // An offer is about the previous repository's skills: accepting it here would copy
    // them into this one.
    setCopyOffer(null)
    setCopying(false)
    changedDuringSaveRef.current = false
    fetchWorkflow().then(
      (next) => { if (at === generation.current) void adopt(next) },
      (error) => {
        console.error('Failed to load the repository workflow:', error)
        if (at === generation.current) {
          setLoaded('error')
          // Nothing to edit: an editor left open would never draw, and never close.
          setEditing(false)
        }
      },
    )
  }, [fetchWorkflow, adopt, openEditor, repoName])

  // A commit or a push made in a terminal changes the warnings without telling us: look
  // again when the window comes back to the front. Debounced, as focus and visibility
  // usually fire together.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined
    const recheck = () => {
      if (document.visibilityState !== 'visible') return
      clearTimeout(timer)
      timer = setTimeout(() => { void refreshUnshared(savedRef.current) }, 300)
    }
    window.addEventListener('focus', recheck)
    document.addEventListener('visibilitychange', recheck)
    return () => {
      clearTimeout(timer)
      window.removeEventListener('focus', recheck)
      document.removeEventListener('visibilitychange', recheck)
    }
  }, [refreshUnshared])

  // The skills a step may run. Read once per repository: the Skills page is where they
  // change, and leaving this tab for it remounts the panel on the way back.
  useEffect(() => {
    let live = true
    window.electronAPI.skills.listingEntries().then(
      (listing: { entries: ListingEntry[] }) => { if (live) setEntries(listing.entries) },
      () => { /* no listing: the picker says there is nothing to add */ },
    )
    return () => { live = false }
  }, [repoName])

  /** Read the workflow again after a change was announced, and judge what came back. */
  const followChange = useCallback(() => {
    const at = generation.current
    fetchWorkflow().then((next) => {
      if (at !== generation.current) return
      // The revision already held: nothing new, such as the echo of our own save.
      if (next.revision === revisionRef.current) return
      const dirty = !sameOverlay(draftRef.current, savedRef.current)
      // Nothing of ours to lose, or it is what we drafted anyway: take it.
      if (!dirty || sameOverlay(next.overlay, draftRef.current)) void adopt(next)
      else if (sameOverlay(next.overlay, savedRef.current)) {
        // Saved again as it was: the draft still edits the same flow, at its new revision.
        revisionRef.current = next.revision
        setLoaded({ saved: next.overlay, revision: next.revision, source: next.source })
      } else setStale(true)
    }, (error) => console.error('Failed to reload the repository workflow:', error))
  }, [fetchWorkflow, adopt])
  // The current repository's, for a save that settles after a switch: its own closure
  // would read the previous repository's workflow into this panel.
  const followChangeRef = useRef(followChange)
  followChangeRef.current = followChange

  useEffect(() => {
    const off = window.electronAPI.config.onWorkflowChanged((change) => {
      if (change.name !== repoName) return
      // Our own save answers first; what changed is looked at once it has (save's
      // `finally`), when the revision it returned tells its echo from a teammate's save.
      if (savingRef.current) {
        changedDuringSaveRef.current = true
        return
      }
      followChange()
    })
    return () => { off() }
  }, [repoName, followChange])

  const reload = () => {
    const at = generation.current
    fetchWorkflow().then(
      (next) => { if (at === generation.current) void adopt(next) },
      (error) => console.error('Failed to reload the repository workflow:', error),
    )
  }

  const flow = useMemo(() => composeWorkflow(draft), [draft])
  const found = useMemo(() => problems(draft), [draft])
  const shown = useMemo(() => (found.length > 0 ? found : (refused ?? [])), [found, refused])
  const unreachable = useMemo(() => unreachableSteps(draft), [draft])
  const dirty = !sameOverlay(draft, saved)

  const labelOf = (id: string) => {
    const node = flow.nodes.find((n) => n.id === id)
    return node ? skillDisplayName(node.skill) : id
  }
  const skillOf = (id: string) => flow.nodes.find((n) => n.id === id)?.skill ?? id

  const data = useMemo(() => {
    const warningOf = ({ status, branch }: SkillShareResult): string => {
      switch (status) {
        case 'missing': return t('repo.workflow.warning.onlyHome')
        case 'uncommitted': return t('repo.workflow.warning.uncommitted')
        case 'unpushed': return branch
          ? t('repo.workflow.warning.unpushed', { branch: `origin/${branch}` })
          : t('repo.workflow.warning.unpushedNoRemote')
        default: return t('repo.workflow.warning.noFolder')
      }
    }
    const warnings: Record<string, string> = Object.fromEntries(
      Object.entries(unshared).map(([skill, share]) => [customNodeId(skill), warningOf(share)]),
    )
    for (const id of unreachable) {
      warnings[id] = warnings[id] ? `${t('repo.workflow.warning.unreachable')} ${warnings[id]}` : t('repo.workflow.warning.unreachable')
    }
    return workflowCanvasData(flow, { problems: problemNodeIds(shown), warnings, disabled: draft.disabled, colors: stepColors(draft) })
  }, [flow, shown, unshared, unreachable, draft, t])

  // Where every card is drawn right now: what an edit to the links pins them at.
  const drawn = useMemo(
    () => workflowPositions(data.nodes, data.links, data.entry, draft.positions, workflowCardWidths(data.nodes, {
      anyExit: t('repo.workflow.anyExit'), blocking: t('repo.workflow.blocking'), advisory: t('repo.workflow.advisory'),
    })).positions,
    [data, draft.positions, t],
  )

  const skills = useMemo(
    () => skillOptions(entries, repoName, flow.nodes.map((node) => node.skill)),
    [entries, repoName, flow],
  )

  const problemItems: WorkflowProblemItem[] = shown.map((problem, i) => {
    switch (problem.code) {
      case 'duplicate-skill':
        return { id: `${problem.code}-${problem.nodeId}`, nodeId: problem.nodeId, message: t('repo.workflow.problem.duplicate', { skill: problem.skill }) }
      case 'auto-into-start':
        return { id: `${problem.code}-${problem.nodeId}`, nodeId: problem.nodeId, message: t('repo.workflow.problem.autoIntoStart', { from: labelOf(problem.nodeId) }) }
      case 'start-disabled':
        return { id: problem.code, nodeId: problem.nodeId, message: t('repo.workflow.problem.startDisabled') }
      case 'self-link':
        return { id: `${problem.code}-${problem.nodeId}`, nodeId: problem.nodeId, message: t('repo.workflow.problem.selfLink', { step: labelOf(problem.nodeId) }) }
      case 'duplicate-link':
        return {
          id: `${problem.code}-${problem.nodeId}-${problem.to}`,
          nodeId: problem.nodeId,
          message: t('repo.workflow.problem.duplicateLink', { from: labelOf(problem.nodeId), to: labelOf(problem.to) }),
        }
      default:
        return { id: `${problem.code}-${i}`, message: t('repo.workflow.problem.invalid', { message: problem.message }) }
    }
  })

  const focusOn = (id: string) => {
    setSelected({ type: 'node', id })
    setFocus((was) => ({ id, n: (was?.n ?? 0) + 1 }))
  }

  /**
   * Every edit goes through here: it is recorded for undo, and a refusal is about the
   * draft it was made on. A conflict is not, it is about the version under the draft,
   * and only a reload settles it: it stays.
   */
  const edit = (next: WorkflowOverlay) => {
    if (sameOverlay(next, draft)) return
    setHistory((was) => ({ past: [...was.past, draft].slice(-HISTORY_LIMIT), future: [] }))
    setDraft(next)
    setRefused(null)
    setSaveError((was) => (was?.kind === 'conflict' ? was : null))
  }
  /** An edit that changes what the layout is computed from: every card is pinned first. */
  const reshape = (change: (pinned: WorkflowOverlay) => WorkflowOverlay) => edit(change(pinPositions(draft, drawn)))

  const travel = (from: 'past' | 'future') => {
    const stack = history[from]
    if (stack.length === 0) return
    const next = stack[stack.length - 1]
    const to = from === 'past' ? 'future' : 'past'
    setHistory({ ...history, [from]: stack.slice(0, -1), [to]: [...history[to], draft] } as typeof history)
    setDraft(next)
    setRefused(null)
    setSelected(null)
  }

  const removeSelection = () => {
    if (!selected) return
    if (selected.type === 'node') {
      if (!isCustomNodeId(selected.id)) return
      reshape((pinned) => removeStep(pinned, skillOf(selected.id)))
    } else {
      if (isDefaultLink(selected.from, selected.to)) return
      reshape((pinned) => removeLink(pinned, selected.from, selected.to))
    }
    setSelected(null)
  }

  const target: WorkflowInspectorTarget | null = (() => {
    if (!selected) return null
    if (selected.type === 'node') {
      const node = data.nodes.find((n) => n.id === selected.id)
      if (!node) return null
      const hints = stepHints(flow, node.id).map((hint) => t(
        hint === 'on-review-comments' ? 'repo.workflow.hint.reviewComments' : 'repo.workflow.hint.skippedFromStart',
      ))
      const config = stepSettings[node.skill]
      return {
        type: 'node',
        step: {
          ...node,
          description: isCustomNodeId(node.id) ? skillDescription(entries, repoName, node.skill) : undefined,
          hints: hints.length > 0 ? hints : undefined,
          modeNote: isCustomNodeId(node.id) && !modeHasEffect(flow, node.id) ? t('repo.workflow.hint.modeNoEffect') : undefined,
          settings: config?.settings,
          intro: config?.intro,
        },
      }
    }
    const link = flow.links.find((l) => l.from === selected.from && l.to === selected.to)
    if (!link) return null
    // Links leaving a custom step need no word: the protocol applies them like any other.
    const intoStart = isLinkIntoStart(link)
    const locked = isDefaultLink(link.from, link.to)
    return {
      type: 'link',
      link: {
        from: link.from,
        to: link.to,
        fromLabel: labelOf(link.from),
        toLabel: labelOf(link.to),
        kind: link.kind,
        outcome: link.outcome,
        disabledKinds: intoStart ? ['auto'] : undefined,
        hint: intoStart ? t('repo.workflow.hint.intoStart') : undefined,
        locked,
        outcomes: locked ? undefined : flow.nodes.find((n) => n.id === link.from)?.outcomes,
      },
    }
  })()

  const save = async () => {
    const previous = saved
    // The write completes whatever happens meanwhile, but once the panel shows another
    // repository its answer is not about what is on screen: adopted, it would put this
    // repository's flow, banners and copy offer into that one's editor.
    const at = generation.current
    const current = () => at === generation.current
    setSaving(true)
    savingRef.current = true
    setSaveError(null)
    try {
      const result = await window.electronAPI.config.saveRepositoryWorkflow(repoName, draft, revisionRef.current)
      if (!current()) return
      switch (result.status) {
        case 'saved': {
          // null is the default flow, which the editor edits as an empty overlay.
          const missing = adopt({
            overlay: result.overlay ?? EMPTY_OVERLAY,
            revision: result.revision,
            source: result.workflow.source,
          })
          showToast(t('repo.workflow.saved'))
          // Offered once, for the steps this save added: an older one already had its
          // chance, and keeps its warning instead of a dialog at every save.
          const added = (await missing).filter((skill) => !previous.steps.some((step) => step.skill === skill))
          if (added.length > 0 && current()) setCopyOffer(added)
          break
        }
        case 'invalid':
          setRefused(result.problems)
          break
        case 'denied':
          setSaveError({ kind: 'denied' })
          break
        // A teammate saved first. The draft stays; the banner offers their version.
        case 'conflict':
          setSaveError({ kind: 'conflict' })
          break
        case 'failed':
          setSaveError({ kind: 'failed', message: result.message })
          break
      }
    } catch (error) {
      if (current()) setSaveError({ kind: 'failed', message: error instanceof Error ? error.message : String(error) })
    } finally {
      setSaving(false)
      savingRef.current = false
      // After a switch, a change held back meanwhile is the repository now on screen's.
      if (changedDuringSaveRef.current) {
        changedDuringSaveRef.current = false
        followChangeRef.current()
      }
    }
  }

  const copyToRepo = async (list: string[]) => {
    // As for a save: the copies complete, what they report is dropped after a switch.
    const at = generation.current
    const current = () => at === generation.current
    setCopying(true)
    const copied: string[] = []
    for (const skill of list) {
      try {
        await window.electronAPI.skills.copyToRepo(repoName, skill)
        copied.push(skill)
      } catch (error) {
        if (current()) showToast(t('repo.workflow.copy.failed', { skill, message: error instanceof Error ? error.message : String(error) }), 'error')
      }
    }
    if (!current()) return
    if (copied.length > 0) showToast(t('repo.workflow.copy.done', { skills: copied.join(', ') }))
    setCopying(false)
    setCopyOffer(null)
    void refreshUnshared(savedRef.current)
  }

  /** To another repository's editor: its page, which opens it on mount. */
  const goTo = (name: string) => {
    reopenEditorFor = name
    window.location.hash = `#/repo/${encodeURIComponent(name)}`
  }
  const switchRepository = (name: string) => {
    if (name === repoName) return
    if (dirty) {
      setSwitchTo(name)
      setClosePrompt(true)
    } else goTo(name)
  }
  const keepEditing = () => {
    setClosePrompt(false)
    setSwitchTo(null)
  }

  /** Out of the editor, the draft dropped: the tab shows what is saved. It plays its exit first. */
  const leave = () => {
    setClosePrompt(false)
    if (switchTo) {
      setSwitchTo(null)
      goTo(switchTo)
      return
    }
    setLeavingEditor(true)
  }
  const left = () => {
    setEditing(false)
    setLeavingEditor(false)
    setSelected(null)
    setDraft(savedRef.current)
    setHistory(EMPTY_HISTORY)
    setRefused(null)
    setSaveError(null)
    setStale(false)
  }
  const requestClose = () => (dirty ? setClosePrompt(true) : leave())

  // The editor's keys. Re-bound on every render, which is what lets them read the draft
  // as it is now; there is one listener at a time.
  const keysRef = useRef<(event: KeyboardEvent) => void>(() => {})
  keysRef.current = (event) => {
    // The dialogs answer their own keys, and so do the menus and the fields.
    if (closePrompt || copyOffer !== null || leavingEditor) return
    if (document.querySelector('[role="menu"], [role="listbox"]')) return
    const el = event.target as HTMLElement | null
    if (el && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName))) return
    const mod = event.metaKey || event.ctrlKey
    if (event.key === 'Escape') {
      event.preventDefault()
      event.stopPropagation()
      if (selected) setSelected(null)
      else requestClose()
      return
    }
    if (readOnly) return
    if (mod && event.key.toLowerCase() === 'z') {
      event.preventDefault()
      travel(event.shiftKey ? 'future' : 'past')
    } else if (mod && event.key.toLowerCase() === 'y') {
      event.preventDefault()
      travel('future')
    } else if (!mod && (event.key === 'Delete' || event.key === 'Backspace')) {
      event.preventDefault()
      removeSelection()
    }
  }
  useEffect(() => {
    if (!editing) return
    const onKeyDown = (event: KeyboardEvent) => keysRef.current(event)
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [editing])

  const source = loaded && loaded !== 'error' ? loaded.source : null
  const sourceHint = source
    ? (source === 'repository' ? t('repo.workflow.sourceRepository') : t('repo.workflow.sourceDefault'))
    : undefined
  // Memoised so the canvas does not rebuild its nodes on every render of the page.
  const labels = useMemo<WorkflowCanvasLabels>(() => ({
    canvas: t('repo.workflow.canvas', { name: repoName }),
    minimap: t('repo.workflow.minimap'),
    auto: t('repo.workflow.auto'),
    suggest: t('repo.workflow.suggest'),
    anyExit: t('repo.workflow.anyExit'),
    disable: t('repo.workflow.disable'),
    enable: t('repo.workflow.enable'),
    alwaysOn: t('repo.workflow.alwaysOn'),
    off: t('repo.workflow.off'),
    blocking: t('repo.workflow.blocking'),
    advisory: t('repo.workflow.advisory'),
  }), [t, repoName])
  const sources = {
    custom: t('repo.workflow.source.custom'),
    repo: t('repo.workflow.source.repo'),
    plugin: t('repo.workflow.source.plugin'),
  }
  const editorLabels: WorkflowEditorLabels = {
    canvas: labels,
    back: t('repo.workflow.editor.back'),
    picker: {
      title: t('repo.workflow.picker.title'),
      empty: t('repo.workflow.picker.empty'),
      inWorkflow: t('repo.workflow.inWorkflow'),
      sources,
    },
    inspector: {
      title: t('repo.workflow.inspector.title'),
      empty: readOnly ? t('repo.workflow.inspector.emptyReadOnly') : t('repo.workflow.inspector.empty'),
      mode: t('repo.workflow.inspector.mode'),
      color: t('repo.workflow.inspector.color'),
      kind: t('repo.workflow.inspector.kind'),
      outcome: t('repo.workflow.inspector.outcome'),
      blocking: t('repo.workflow.inspector.blocking'),
      advisory: t('repo.workflow.inspector.advisory'),
      auto: t('repo.workflow.inspector.auto'),
      suggest: t('repo.workflow.inspector.suggest'),
      remove: t('repo.workflow.inspector.remove'),
      removeRow: t('repo.workflow.inspector.removeRow'),
      removeHint: t('repo.workflow.inspector.removeHint'),
      builtIn: t('repo.workflow.inspector.builtIn'),
      disable: t('repo.workflow.disable'),
      enable: t('repo.workflow.enable'),
      alwaysOn: t('repo.workflow.alwaysOn'),
      offHint: t('repo.workflow.inspector.offHint'),
      removeLink: t('repo.workflow.inspector.removeLink'),
      removeLinkRow: t('repo.workflow.inspector.removeLinkRow'),
      removeLinkHint: t('repo.workflow.inspector.removeLinkHint'),
      anyOutcome: t('repo.workflow.inspector.anyOutcome'),
      defaultLink: t('repo.workflow.inspector.defaultLink'),
      close: t('repo.workflow.inspector.close'),
      settings: t('repo.workflow.inspector.settings'),
      settingsHint: t('repo.workflow.inspector.settingsHint'),
    },
    dock: {
      dock: t('repo.workflow.dock.label'),
      add: t('repo.workflow.dock.add'),
      undo: t('repo.workflow.dock.undo'),
      redo: t('repo.workflow.dock.redo'),
      zoomIn: t('repo.workflow.dock.zoomIn'),
      zoomOut: t('repo.workflow.dock.zoomOut'),
      fit: t('repo.workflow.dock.fit'),
      problems: problemItems.length === 1
        ? t('repo.workflow.problems.one')
        : t('repo.workflow.problems.other', { count: problemItems.length }),
      discard: t('repo.workflow.discard'),
      save: t('common.save'),
      close: t('repo.workflow.dock.close'),
    },
  }

  const banners: WorkflowEditorBanner[] = []
  if (saveError?.kind === 'conflict') {
    banners.push({
      id: 'conflict', variant: 'warning', message: t('repo.workflow.conflict'), hint: t('repo.workflow.conflictHint'),
      action: { label: t('repo.workflow.reload'), onClick: reload },
    })
  } else if (stale) {
    // The conflict banner already says it, with the same Reload.
    banners.push({
      id: 'stale', variant: 'info', message: t('repo.workflow.changedElsewhere'), hint: t('repo.workflow.changedElsewhereHint'),
      action: { label: t('repo.workflow.reload'), onClick: reload },
    })
  }
  if (saveError?.kind === 'denied') {
    banners.push({ id: 'denied', variant: 'danger', message: t('repo.workflow.denied'), hint: t('repo.workflow.deniedHint') })
  }
  if (saveError?.kind === 'failed') {
    banners.push({ id: 'failed', variant: 'danger', message: t('repo.workflow.saveFailed'), hint: saveError.message })
  }

  return (
    <div className="flex flex-col gap-4">
      <SectionHeader
        icon={Workflow}
        title={t('repo.workflow.section')}
        hint={sourceHint}
        description={[
          t('repo.workflow.intro'),
          readOnly ? t('repo.workflow.readOnlyHint') : t('repo.workflow.editHint'),
          t('repo.workflow.navigation'),
        ].join(' ')}
        spacing="none"
      />
      {loaded && loaded !== 'error' && !editing && (
        <div>
          <Button tone="solid" size="sm" icon={Pencil} onClick={() => setEditing(true)}>
            {readOnly ? t('repo.workflow.open') : t('repo.workflow.edit')}
          </Button>
        </div>
      )}
      {/* Reached from another repository's editor, whose layer is gone: the window stays
          covered while this flow loads, rather than flashing the settings between the two. */}
      {editing && !loaded && createPortal(<div className="fixed inset-0 z-[55] bg-bg" />, document.body)}
      {loaded === 'error' ? (
        <Banner variant="danger" icon={AlertTriangle}>{t('repo.workflow.loadError')}</Banner>
      ) : loaded ? (
        <>
          {/* Read-only: what is saved; the Edit button above is the way into the editor. A fixed height, since the
              canvas fills its box and a settings pane has none to give it. Not mounted while
              the editor is open: a canvas listens for Space on the whole document. */}
          {!editing && (
            <WorkflowCanvas
              nodes={data.nodes}
              links={data.links}
              entry={data.entry}
              labels={labels}
              positions={draft.positions}
              className="h-[520px]"
              // The wheel scrolls the settings page, not the canvas: dragging still pans.
              scrollPans={false}
              minimap={false}
            />
          )}
          {editing && createPortal(
            <div className="fixed inset-0 z-[55]">
              <WorkflowEditor
                title={t('repo.workflow.editor.title', { name: repoName })}
                repositories={repositories.length > 1 ? {
                  value: repoName,
                  options: repositories,
                  onChange: switchRepository,
                  label: t('repo.workflow.editor.repository'),
                } : undefined}
                labels={editorLabels}
                nodes={data.nodes}
                links={data.links}
                entry={data.entry}
                positions={draft.positions}
                selected={selected}
                onSelect={setSelected}
                onMove={(id, position) => reshape((pinned) => moveNode(pinned, id, position))}
                onConnect={(from, to, outcome) => {
                  reshape((pinned) => addLink(pinned, from, to, outcome))
                  setSelected({ type: 'link', from, to })
                }}
                focusRequest={focus}
                target={target}
                skills={skills}
                onChangeMode={(id, mode) => edit(setStepMode(draft, skillOf(id), mode))}
                onRemove={(id) => {
                  reshape((pinned) => removeStep(pinned, skillOf(id)))
                  setSelected(null)
                }}
                onChangeKind={(from, to, kind) => edit(setLinkKind(draft, from, to, kind))}
                onChangeOutcome={(from, to, outcome) => edit(setLinkOutcome(draft, from, to, outcome))}
                onRemoveLink={(from, to) => {
                  reshape((pinned) => removeLink(pinned, from, to))
                  setSelected(null)
                }}
                onToggle={(id, enabled) => edit(setStepEnabled(draft, id, enabled))}
                onChangeColor={(id, color) => edit(setStepColor(draft, skillOf(id), color))}
                onAdd={(skill, position) => {
                  // Its own colour from the start: the first no other custom step wears.
                  reshape((pinned) => addStep(pinned, skill, position, 'advisory', nextWorkflowStepColor(Object.values(stepColors(pinned)))))
                  setSelected({ type: 'node', id: customNodeId(skill) })
                }}
                canUndo={history.past.length > 0}
                canRedo={history.future.length > 0}
                onUndo={() => travel('past')}
                onRedo={() => travel('future')}
                problems={problemItems}
                onFocusProblem={focusOn}
                dirty={dirty}
                saving={saving}
                canSave={shown.length === 0}
                onSave={save}
                onDiscard={() => edit(saved)}
                onClose={requestClose}
                banners={banners}
                readOnly={readOnly}
                leaving={leavingEditor}
                onLeft={left}
                trafficLightGutter={!windowFullScreen}
              />
            </div>,
            document.body,
          )}
          <Modal
            isOpen={closePrompt}
            onClose={keepEditing}
            title={switchTo ? t('repo.workflow.editor.switch.title', { name: switchTo }) : t('repo.workflow.editor.close.title')}
            footer={
              <>
                <Button tone="ghost" onClick={keepEditing}>{t('repo.workflow.editor.close.keep')}</Button>
                <Button tone="danger" onClick={leave}>{t('repo.workflow.editor.close.leave')}</Button>
              </>
            }
          >
            <Text size="sm" className="block">{t('repo.workflow.editor.close.body')}</Text>
          </Modal>
          <Modal
            isOpen={copyOffer !== null}
            onClose={() => setCopyOffer(null)}
            title={t('repo.workflow.copy.title')}
            footer={
              <>
                <Button tone="ghost" disabled={copying} onClick={() => setCopyOffer(null)}>
                  {t('repo.workflow.copy.decline')}
                </Button>
                <Button tone="accent" busy={copying} onClick={() => copyOffer && copyToRepo(copyOffer)}>
                  {t('repo.workflow.copy.confirm')}
                </Button>
              </>
            }
          >
            <Text size="sm" className="block">
              {copyOffer && copyOffer.length === 1
                ? t('repo.workflow.copy.body.one', { skills: copyOffer.join(', ') })
                : t('repo.workflow.copy.body.other', { skills: (copyOffer ?? []).join(', ') })}
            </Text>
            <Text size="sm" tone="secondary" className="mt-2 block">{t('repo.workflow.copy.commit')}</Text>
          </Modal>
        </>
      ) : (
        <div className="flex h-[520px] items-center justify-center">
          <Loader variant="spin" label={t('repo.workflow.loading')} />
        </div>
      )}
    </div>
  )
}

/** Nothing to undo, nothing to redo. */
const EMPTY_HISTORY: { past: WorkflowOverlay[]; future: WorkflowOverlay[] } = { past: [], future: [] }
/** How many edits ⌘Z goes back through. */
const HISTORY_LIMIT = 100

export function RepoPage({ repoName }: RepoPageProps) {
  const {
    config,
    updateRepository,
    setRepositoryRemoteUrl: saveRemoteUrlToCloud,
    deleteRepository,
    renameRepository,
    setRepositoryOrg,
    updateRepositoryLanguages,
    updateRepositoryCommitSettings,
    updateRepositoryResolveSettings,
    updateRepositoryReviewSettings,
    updateRepositoryStartSettings,
    updateRepositoryPullRequestSettings,
    updateRepositoryIssuesSettings,
    updateRepositoryJiraSettings,
    updateRepositoryPlanSettings,
    updateRepositoryBranchSettings,
    updateRepositoryWorktreeFilesSettings,
    validatePath,
    getPRTemplate,
    createPRTemplate,
    updatePRTemplate,
  } = useConfig()

  const { orgs } = useOrg()
  const t = useT()
  const { status } = useAuth()
  // Reached from another repository's editor: straight back into this one's.
  const [openEditor] = useState(() => reopenEditorFor === repoName)
  useEffect(() => {
    if (reopenEditorFor === repoName) reopenEditorFor = null
  }, [repoName])
  const [tab, setTab] = useState<RepoTab>(openEditor ? 'workflow' : 'general')
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [editedName, setEditedName] = useState(repoName)

  // Form state
  const repo = config?.repositories?.[repoName]
  /* Built over the FULL repository list so the colour matches the rail item and the
     list row this page was opened from, palette fallback included. */
  const repoColor = getProjectColorMap(
    Object.keys(config?.repositories ?? {}),
    config?.repositories,
  )[repoName]
  // The workflow editor's picker: every repository, by name, each in its own colour.
  const repositoryOptions = useMemo<SelectOption[]>(
    () => {
      const colors = getProjectColorMap(Object.keys(config?.repositories ?? {}), config?.repositories)
      return Object.keys(config?.repositories ?? {})
        .sort((a, b) => a.localeCompare(b))
        .map((name) => ({ value: name, label: name, color: colors[name] }))
    },
    [config?.repositories],
  )
  const scopeOrg = repo?.orgId ? orgs.find((o) => o.id === repo.orgId) : null

  /**
   * A team repo's settings drive what every member's agents do — how they
   * commit, which branch they base on, in which language they write — so only
   * the org's admins, plus whoever created the repo, may change them. Other
   * members read.
   *
   * The one exception is the local folder: it is per-machine, private to its
   * user and never shared, so a read-only member still binds their own.
   * Personal repos (no org) have no such notion — only their owner sees them.
   *
   * The same rule is enforced by RLS on `repositories`; this only keeps the page
   * from offering an edit the database would refuse. Until the memberships have
   * loaded the role is unknown and the page stays locked, rather than briefly
   * inviting a change that fails.
   */
  const isOwner = !!repo?.ownerId && repo.ownerId === status.user?.id
  const readOnly = !!repo?.orgId && !isOwner && scopeOrg?.role !== 'admin'

  const [path, setPath] = useState(repo?.path || '')
  const [pathStatus, setPathStatus] = useState<{ isGit?: boolean; exists?: boolean } | null>(null)
  const [pathChanged, setPathChanged] = useState(false)
  const [remoteUrl, setRemoteUrl] = useState(repo?.remoteUrl || '')
  const [remoteUrlChanged, setRemoteUrlChanged] = useState(false)
  const [remoteUrlError, setRemoteUrlError] = useState<string | null>(null)

  // PR Template state
  const [template, setTemplate] = useState<{ exists: boolean; path?: string; content?: string } | null>(null)
  const [templateContent, setTemplateContent] = useState('')
  const [templateChanged, setTemplateChanged] = useState(false)
  const [templateLoading, setTemplateLoading] = useState(true)

  // Remote branches state
  const [remoteBranches, setRemoteBranches] = useState<string[]>([])
  const [branchesLoading, setBranchesLoading] = useState(false)

  // Reset form state when repoName changes
  useEffect(() => {
    const currentRepo = config?.repositories?.[repoName]
    setEditedName(repoName)
    setPath(currentRepo?.path || '')
    setPathChanged(false)
    setTemplate(null)
    setTemplateContent('')
    setTemplateChanged(false)
    setTemplateLoading(true)
    setPathStatus(null)
  }, [repoName])

  // Validate path on mount and when repo changes
  useEffect(() => {
    if (repo?.path) {
      validatePath(repo.path).then((result) => {
        setPathStatus(result)
      })
    }
  }, [repoName, repo?.path, validatePath])

  // Load PR template
  useEffect(() => {
    if (repo?.path) {
      setTemplateLoading(true)
      getPRTemplate(repo.path).then((result) => {
        setTemplate(result)
        if (result.content) {
          setTemplateContent(result.content)
        }
        setTemplateLoading(false)
      })
    }
  }, [repoName, repo?.path, getPRTemplate])

  // Fetch remote branches
  useEffect(() => {
    if (!repo?.path) return
    setBranchesLoading(true)
    window.electronAPI.config.getRemoteBranches(repo.path)
      .then((result) => {
        if (!result.error) setRemoteBranches(result.branches)
      })
      .finally(() => setBranchesLoading(false))
  }, [repo?.path])

  const handlePathChange = async (value: string) => {
    setPath(value)
    setPathChanged(value !== repo?.path)
    if (value.trim()) {
      const result = await validatePath(value)
      setPathStatus(result)
    } else {
      setPathStatus(null)
    }
  }

  const savePath = async () => {
    try {
      await updateRepository(repoName, { path })
      setPathChanged(false)
      showToast(t('toast.pathUpdated'))
    } catch (error) {
      showToast(error instanceof Error ? error.message : t('toast.pathUpdateFailed'), 'error')
    }
  }

  const handleRemoteUrlChange = (value: string) => {
    setRemoteUrl(value)
    setRemoteUrlError(null)
    setRemoteUrlChanged(value.trim() !== (repo?.remoteUrl || ''))
  }

  const saveRemoteUrl = async () => {
    const value = remoteUrl.trim()
    // Checked here so the user is told before a round-trip, and again in main and
    // in the database — this one is a courtesy, not the guarantee.
    if (!/^https:\/\/github\.com\/[\w.-]+\/[\w.-]+$/.test(value)) {
      setRemoteUrlError(t('repo.general.remoteUrlInvalid'))
      return
    }
    try {
      await saveRemoteUrlToCloud(repoName, value)
      setRemoteUrlChanged(false)
      setRemoteUrlError(null)
      showToast(t('toast.remoteUrlUpdated'))
    } catch (error) {
      // The backend is the authority on who may change an address that is
      // already set; say so plainly rather than echoing a raw IPC error.
      const raw = error instanceof Error ? error.message : ''
      setRemoteUrlError(
        raw.includes('remote-url-refused')
          ? t('repo.general.remoteUrlRefused')
          : raw || t('toast.remoteUrlUpdateFailed'),
      )
    }
  }

  // Saves on every add and every removal, like the worktree files below: a chip is a
  // whole value, so there is no half-typed state a Save button would be protecting.
  const handleKeywordsChange = async (next: string[]) => {
    try {
      await updateRepository(repoName, { keywords: next })
      showToast(t('toast.keywordsUpdated'))
    } catch (error) {
      showToast(error instanceof Error ? error.message : t('toast.keywordsUpdateFailed'), 'error')
    }
  }

  const handleShare = async (orgId: string) => {
    if (!orgId) return
    try {
      await setRepositoryOrg(repoName, orgId)
      showToast(t('toast.repoShared'))
    } catch (error) {
      showToast(error instanceof Error ? error.message : t('toast.repoShareFailed'), 'error')
    }
  }

  const handleMakePersonal = async () => {
    try {
      await setRepositoryOrg(repoName, null)
      showToast(t('toast.repoNowPersonal'))
    } catch (error) {
      showToast(error instanceof Error ? error.message : t('toast.repoUpdateFailed'), 'error')
    }
  }

  // Bind (or re-point) this machine's local folder for the repo.
  const handlePickFolder = async () => {
    const folder = await window.electronAPI.dialog.openFolder()
    if (!folder) return
    try {
      await updateRepository(repoName, { path: folder })
      setPath(folder)
      setPathChanged(false)
      const result = await validatePath(folder)
      setPathStatus(result)
      showToast(t('toast.localFolderSet'))
    } catch (error) {
      showToast(error instanceof Error ? error.message : t('toast.localFolderFailed'), 'error')
    }
  }

  const handleLanguageChange = async (key: string, value: string) => {
    try {
      await updateRepositoryLanguages(repoName, { [key]: value === 'default' ? null : value })
      showToast(t('toast.languageUpdated'))
    } catch (error) {
      showToast(error instanceof Error ? error.message : t('toast.languageUpdateFailed'), 'error')
    }
  }

  const handleCommitSettingChange = async (key: string, value: any) => {
    try {
      const settingValue = value === 'default' ? null : value
      await updateRepositoryCommitSettings(repoName, { [key]: settingValue })
      showToast(t('toast.settingUpdated'))
    } catch (error) {
      showToast(error instanceof Error ? error.message : t('toast.settingUpdateFailed'), 'error')
    }
  }

  const handleResolveSettingChange = async (key: string, value: any) => {
    try {
      const settingValue = value === 'default' ? null : value
      await updateRepositoryResolveSettings(repoName, { [key]: settingValue })
      showToast(t('toast.settingUpdated'))
    } catch (error) {
      showToast(error instanceof Error ? error.message : t('toast.settingUpdateFailed'), 'error')
    }
  }

  const handleStartSettingChange = async (key: string, value: boolean | string | number) => {
    try {
      await updateRepositoryStartSettings(repoName, { [key]: value })
      showToast(t('toast.settingUpdated'))
    } catch (error) {
      showToast(error instanceof Error ? error.message : t('toast.settingUpdateFailed'), 'error')
    }
  }

  const handleReviewSettingChange = async (key: string, value: boolean | string) => {
    try {
      await updateRepositoryReviewSettings(repoName, { [key]: value })
      showToast(t('toast.settingUpdated'))
    } catch (error) {
      showToast(error instanceof Error ? error.message : t('toast.settingUpdateFailed'), 'error')
    }
  }

  const handlePRSettingChange = async (key: string, value: boolean | string) => {
    try {
      if (typeof value === 'boolean') {
        await updateRepositoryPullRequestSettings(repoName, { [key]: value ? null : false })
      } else {
        await updateRepositoryPullRequestSettings(repoName, { [key]: value })
      }
      showToast(t('toast.settingUpdated'))
    } catch (error) {
      showToast(error instanceof Error ? error.message : t('toast.settingUpdateFailed'), 'error')
    }
  }

  const handleIssuesSettingChange = async (key: string, value: boolean | string) => {
    try {
      if (typeof value === 'boolean') {
        await updateRepositoryIssuesSettings(repoName, { [key]: value ? null : false })
      } else {
        await updateRepositoryIssuesSettings(repoName, { [key]: value })
      }
      showToast(t('toast.settingUpdated'))
    } catch (error) {
      showToast(error instanceof Error ? error.message : t('toast.settingUpdateFailed'), 'error')
    }
  }

  /**
   * The one writer of the `jira` block — the repo's Jira site and project key.
   *
   * Two fields that used to live in two different sections, under two different
   * writers (`issues.jiraUrl` and `plan.jiraProject`). They are one address, so
   * they now share a block and this writer; see tracker.ts for the read side.
   */
  const handleJiraSettingChange = async (key: 'siteUrl' | 'projectKey', value: string) => {
    try {
      await updateRepositoryJiraSettings(repoName, { [key]: value })
      showToast(t('toast.settingUpdated'))
    } catch (error) {
      showToast(error instanceof Error ? error.message : t('toast.settingUpdateFailed'), 'error')
    }
  }

  /**
   * The one writer of the `plan` block.
   *
   * Unlike its siblings, `updateRepositoryPlanSettings` does not throw on a bad
   * value: it applies the fields it accepts and answers with the names of the ones
   * it REFUSED, so one stale value can never discard the rest of an object. That
   * makes a plain success toast a lie, hence the branch — a refused write has to
   * say so, and say which setting, or the form silently shows a value the config
   * does not hold.
   */
  const writePlanSettings = async (settings: PlanSettingsInput) => {
    try {
      const { rejected } = await updateRepositoryPlanSettings(repoName, settings)
      if (rejected.length > 0) {
        showToast(t('toast.settingRejected', { keys: rejected.join(', ') }), 'error')
        return
      }
      showToast(t('toast.settingUpdated'))
    } catch (error) {
      showToast(error instanceof Error ? error.message : t('toast.settingUpdateFailed'), 'error')
    }
  }

  // Booleans go over as themselves, deliberately unlike handlePRSettingChange's
  // `value ? null : false`: `true` is a value here, not the absence of one.
  const handlePlanSettingChange = (key: keyof PlanSettingsInput, value: string | boolean | string[]) =>
    writePlanSettings({ [key]: value === 'default' ? null : value })

  // `issueTypes` sits one level deeper, and its two names reset independently —
  // sending `{ issueTypes: { epic } }` leaves `story` alone.
  const handlePlanIssueTypeChange = (key: 'epic' | 'story', value: string) =>
    writePlanSettings({ issueTypes: { [key]: value } })

  const handleBranchSettingChange = async (key: string, value: string) => {
    try {
      await updateRepositoryBranchSettings(repoName, { [key]: value })
      showToast(t('toast.branchSettingUpdated'))
    } catch (error) {
      showToast(error instanceof Error ? error.message : t('toast.branchSettingUpdateFailed'), 'error')
    }
  }

  const handleWorktreeFilesChange = async (files: string[]) => {
    try {
      await updateRepositoryWorktreeFilesSettings(repoName, files)
      showToast(t('toast.worktreeFilesUpdated'))
    } catch (error) {
      showToast(error instanceof Error ? error.message : t('toast.worktreeFilesUpdateFailed'), 'error')
    }
  }

  const handleColorChange = async (color: string) => {
    try {
      await updateRepository(repoName, { color })
      showToast(t('toast.colorUpdated'))
    } catch (error) {
      showToast(error instanceof Error ? error.message : t('toast.colorUpdateFailed'), 'error')
    }
  }

  const handleGenerateTemplate = async () => {
    if (!repo?.path) return
    try {
      const lang = repo.languages?.pullRequest || 'en'
      await createPRTemplate(repo.path, lang)
      showToast(t('toast.prTemplateCreated'))
      // Reload template
      const result = await getPRTemplate(repo.path)
      setTemplate(result)
      if (result.content) setTemplateContent(result.content)
    } catch (error) {
      showToast(error instanceof Error ? error.message : t('toast.prTemplateCreateFailed'), 'error')
    }
  }

  const handleSaveTemplate = async () => {
    if (!repo?.path) return
    try {
      await updatePRTemplate(repo.path, templateContent)
      setTemplateChanged(false)
      showToast(t('toast.prTemplateUpdated'))
    } catch (error) {
      showToast(error instanceof Error ? error.message : t('toast.prTemplateUpdateFailed'), 'error')
    }
  }

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      await deleteRepository(repoName)
      showToast(t('toast.repoDeleted', { name: repoName }))
      window.location.hash = '#/'
    } catch (error) {
      showToast(error instanceof Error ? error.message : t('toast.repoDeleteFailed'), 'error')
    } finally {
      setIsDeleting(false)
      setIsDeleteModalOpen(false)
    }
  }

  const handleRename = async () => {
    const newName = editedName.trim()
    if (!newName || newName === repoName) {
      setEditedName(repoName)
      return
    }

    try {
      await renameRepository(repoName, newName)
      showToast(t('toast.repoRenamed', { name: newName }))
      window.location.hash = `#/repo/${encodeURIComponent(newName)}`
    } catch (error) {
      showToast(error instanceof Error ? error.message : t('toast.repoRenameFailed'), 'error')
      setEditedName(repoName)
    }
  }

  if (!repo) {
    // An `EmptyState`, which is what this is: a page with nothing on it, and the one way
    // out of it. It was a centred paragraph with an anchor under it — the only link in
    // the settings surface styled as a link rather than as a control.
    return (
      <EmptyState
        icon={FolderGit2}
        actions={[{ id: 'back', label: t('repo.back'), icon: ArrowLeft, onClick: () => { window.location.hash = '#/' } }]}
        className="mt-16"
      >
        {t('repo.notFound')}
      </EmptyState>
    )
  }

  const repoLangs = repo.languages || {}
  const commitSettings = repo.commit || {}
  const resolveSettings = repo.resolve || {}
  // /magic:start's, every one defaulting to what the skill did before it had settings.
  const startSettings = repo.start || {}
  const startExplorationVal = startSettings.exploration || 'auto'
  const startPlanVal = startSettings.plan !== undefined ? startSettings.plan : true
  const startPlanReviewVal = startSettings.planReview !== undefined ? startSettings.planReview : true
  const startPlanApprovalVal = startSettings.planApproval !== undefined ? startSettings.planApproval : true
  const startExecutionVal = startSettings.execution || 'auto'
  const startSimplifyVal = startSettings.simplify !== undefined ? startSettings.simplify : true
  const startIterationsVal = startSettings.criticIterations ?? START_CRITIC_ITERATIONS.fallback
  const startMinScoreVal = startSettings.criticMinScore ?? START_CRITIC_SCORE.fallback
  const reviewSettings = repo.review || {}
  const reviewConfidenceScoreVal = reviewSettings.confidenceScore !== undefined ? reviewSettings.confidenceScore : true
  const reviewModeVal = reviewSettings.mode === 'post' ? 'post' : 'ask'
  const prSettings = repo.pullRequest || {}
  const issuesSettings = repo.issues || {}
  const planSettings = repo.plan || {}
  const branchSettings = repo.branches || {}

  const styleVal = commitSettings.style || 'single-line'
  const formatVal = commitSettings.format || 'angular'
  const coAuthorVal = commitSettings.coAuthor !== undefined ? commitSettings.coAuthor : true
  const includeTicketIdVal = commitSettings.includeTicketId !== undefined ? commitSettings.includeTicketId : false
  // Absent means permitted — the same fallback the skill applies, so an untouched
  // repo reads the same on both sides.
  const allowOnProtectedBranchVal = commitSettings.allowOnProtectedBranch !== undefined ? commitSettings.allowOnProtectedBranch : true
  // Absent means off, as the skill reads it: a push is never started by default.
  const pushAfterCommitVal = commitSettings.pushAfterCommit === true
  const resolveCommitModeVal = resolveSettings.commitMode || 'new'
  const resolveUseCommitConfigVal = resolveSettings.useCommitConfig !== undefined ? resolveSettings.useCommitConfig : true
  const resolveStyleVal = resolveSettings.style || 'single-line'
  const resolveFormatVal = resolveSettings.format || 'angular'
  const resolveReplyVal = resolveSettings.replyToComments !== undefined ? resolveSettings.replyToComments : true
  const resolveReplyLangVal = resolveSettings.replyLanguage || repoLangs.discussion || 'en'
  const resolveReplyVerbosityVal = resolveSettings.replyVerbosity || 'minimal'
  const autoLinkTicketsVal = prSettings.autoLinkTickets !== undefined ? prSettings.autoLinkTickets : true
  const watchCIVal = prSettings.watchCI !== undefined ? prSettings.watchCI : true
  const testAccountsVal = prSettings.testAccounts || 'off'
  const testAccountsSourceVal = prSettings.testAccountsSource || ''
  // Read-time fallback on purpose: the key is kept OUT of DEFAULT_REPOSITORY_FIELDS so
  // that "absent" stays absent and an org-shared value can still fill it in. Matched
  // against the mode list rather than merely defaulted: an org-shared block is copied
  // without re-validation and a Supabase row can be edited outside the app, so a value
  // that is not a mode does reach here, and it reads as `never` like everywhere else.
  const templateCheckboxesVal =
    TEMPLATE_CHECKBOX_MODES.find((mode) => mode === prSettings.templateCheckboxes) ?? 'never'
  // Matched the same way, and for the same reasons, as the line above.
  const bodyVerbosityVal =
    BODY_VERBOSITY_MODES.find((mode) => mode === prSettings.bodyVerbosity) ?? 'concise'
  const commentOnPRVal = issuesSettings.commentOnPR !== undefined ? issuesSettings.commentOnPR : true
  const planTrackerVal = planSettings.tracker || 'ask'
  // Resolved, not read: both keys fall back to the legacy `issues.jiraUrl` /
  // `plan.jiraProject` they replaced, and a form that showed the raw new key would
  // display a blank next to a repo that is in fact configured — then overwrite it
  // with '' on the next save of a neighbouring field.
  const jiraSiteUrlVal = resolveJiraSite(repo)
  const jiraProjectVal = resolveJiraProject(repo)
  // Derived from the remote, or from an `issues.githubIssuesUrl` override when the
  // issues live in another repository. Displayed, never edited — see the Tickets tab.
  const githubIssuesTargetVal = resolveGitHubIssuesUrl(repo)
  // `ask` counts as "there is a Jira": it can only mean anything if Jira is one of the
  // two answers. Only `github` states that there is not one.
  const trackerModeVal = planTrackerVal === 'github' ? 'github' : 'jira'
  // The two free-text Jira issue-type names read '' when unset so the field shows
  // its placeholder — the documented default — rather than a value nobody typed.
  const planEpicTypeVal = planSettings.issueTypes?.epic || ''
  const planStoryTypeVal = planSettings.issueTypes?.story || ''
  const planUseRepoTemplatesVal = planSettings.useRepoTemplates ?? true
  const planSplittingVal = planSettings.splitting || 'balanced'
  const planAcceptanceCriteriaVal = planSettings.acceptanceCriteria || 'checklist'
  const planDefaultLabelsVal = planSettings.defaultLabels || []
  const planAssignToMeVal = planSettings.assignToMe ?? false
  const planDuplicateCheckVal = planSettings.duplicateCheck ?? true

  /**
   * `resolvedValue` is for the language keys whose effective value is a FALLBACK
   * CHAIN rather than the key itself: `languages.ticket` inherits `jiraComment`
   * when unset, so reading `repoLangs.ticket` alone would show English above a
   * repo whose tickets are written in French. Callers with a plain key omit it.
   */
  /**
   * A row that is a name, a help line and a switch — the shape this page holds twenty of.
   *
   * Named because the alternative is twenty copies of the same six-line object, and the
   * one thing that varies between them (which handler the change goes to) is the only
   * thing worth reading at the call site.
   */
  const switchRow = (
    id: string,
    label: string,
    hint: string,
    checked: boolean,
    onChange: (next: boolean) => void,
  ): SettingsCardRow => ({
    id,
    label,
    hint,
    disabled: readOnly,
    control: { kind: 'switch' as const, checked, onChange, label },
  })

  const languageControl = (value: string, onChange: (next: string) => void, ariaLabel: string) => ({
    kind: 'select' as const,
    // THE LIST IS `LANGUAGES`, the one `LanguageSelect` reads — and the fallback with it:
    // a stored value this build does not know resolves to the first entry rather than
    // leaving the trigger blank.
    value: LANGUAGES.some((language) => language.value === value) ? value : LANGUAGES[0].value,
    options: LANGUAGES,
    onChange,
    ariaLabel,
    width: SELECT_WIDTH,
  })

  /**
   * One row of the Languages tab.
   *
   * `resolvedValue` is for the keys whose effective value is a FALLBACK CHAIN rather than
   * the key itself: `languages.ticket` inherits `jiraComment` when unset, so reading
   * `repoLangs.ticket` alone would show English above a repo whose tickets are written in
   * French. Callers with a plain key omit it.
   */
  const langRow = (langKey: string, label: string, hint: string, resolvedValue?: string): SettingsCardRow => ({
    id: langKey,
    label,
    hint,
    disabled: readOnly,
    control: languageControl(
      resolvedValue || (repoLangs as Record<string, string | undefined>)[langKey] || 'en',
      (next) => handleLanguageChange(langKey, next),
      label,
    ),
  })

  /**
   * The clone address row, rendered on BOTH the Repository and the Tickets tab.
   *
   * One row, one piece of state, one save button: the two tabs never render at the
   * same time, so sharing them is what makes it impossible for the field to hold two
   * different answers depending on where you opened it. Only the label and the help
   * line differ — on Repository it is the address the team clones from, on Tickets it
   * is the repository the issues are filed in. The `id` too, because `SettingsCard` keys
   * its rows on it and the two cards are two lists.
   *
   * IT RETURNS A ROW DESCRIPTOR AND NOT JSX NOW, which is what `SettingsCard` takes —
   * and it settles the hazard the old note here was about. A component declared inside
   * `RepoPage` is a new type on every render, so React remounts it and the field inside
   * loses focus on every keystroke; a plain object cannot be a component, so there is
   * nothing left to get wrong.
   */
  const remoteUrlRow = (id: string, label: string, hint: string): SettingsCardRow => ({
    id,
    label,
    hint,
    disabled: readOnly,
    // The refusal is the FIELD's, not a line of red text beside it: `invalid` draws the
    // hairline, and the note under the row says what is wrong with the value. The page
    // used to spell both by hand, in two different reds.
    ...(remoteUrlError ? { note: remoteUrlError } : {}),
    control: [
      {
        kind: 'input' as const,
        value: remoteUrl,
        onChange: handleRemoteUrlChange,
        placeholder: 'https://github.com/owner/repo',
        invalid: !!remoteUrlError,
        className: 'w-64',
      },
      ...(remoteUrlChanged
        ? [{ kind: 'button' as const, children: t('common.save'), onClick: saveRemoteUrl }]
        : []),
    ],
  })

  const resolvePreviewFormat = resolveUseCommitConfigVal
    ? (formatVal === 'default' ? 'angular' : formatVal)
    : (resolveFormatVal === 'default' ? 'angular' : resolveFormatVal)
  const resolvePreview = (() => {
    switch (resolvePreviewFormat) {
      case 'conventional': return 'fix: address review feedback for PROJ-123'
      case 'gitmoji': return '\uD83D\uDC1B address review feedback for PROJ-123'
      case 'none': return 'Address review feedback for PROJ-123'
      case 'angular':
      default: return 'fix(pr): address review feedback for PROJ-123'
    }
  })()

  const commitPreview = generateCommitExample(
    formatVal === 'default' ? 'angular' : formatVal,
    styleVal === 'default' ? 'single-line' : styleVal,
    includeTicketIdVal
  )

  // No entrance animation of its own: the settings content pane already animates
  // every page switch, and two nested slides would compound.
  // Each skill's languages, where it writes in them (the Languages tab is gone). The
  // ticket cascade still reads top-down: `spec` inherits `ticket`, which inherits
  // `jiraComment`, and each row shows the RESOLVED value, what is actually in force.
  const languagesGroup = (rows: (SettingsCardRow | false)[]): WorkflowInspectorSettings => ({
    id: 'languages',
    title: t('repo.langs.section'),
    rows,
  })

  /**
   * THE PLAN SKILL'S SETTINGS, in the three phases the skill itself runs in: it looks
   * for what already exists, it decides how to cut the work up, then it creates the
   * tickets. Shown in the workflow editor's inspector when the Plan step is selected,
   * and nowhere else: the tab they had is gone, the step on the canvas is where they are
   * read. Saved as soon as they change, like every other setting on this page, not with
   * the workflow's Save.
   */
  const planStepSettings: WorkflowInspectorSettings[] = [
    { id: 'before', title: t('repo.plan.groupBefore'), rows: [{
        id: 'duplicateCheck',
        label: t('repo.plan.duplicateCheck'),
        hint: t('repo.plan.duplicateCheckHelp'),
        disabled: readOnly,
        control: {
          kind: 'switch' as const,
          checked: planDuplicateCheckVal,
          onChange: (next: boolean) => handlePlanSettingChange('duplicateCheck', next),
          label: t('repo.plan.duplicateCheck'),
        },
      }] },
    { id: 'breakdown', title: t('repo.plan.groupBreakdown'), rows: [
        {
          id: 'splitting',
          label: t('repo.plan.splitting'),
          hint: t('repo.plan.splittingHelp'),
          disabled: readOnly,
          control: enumControl(
            t,
            planSplittingVal,
            PLAN_SPLITTING_MODES,
            PLAN_SPLITTING_LABELS,
            (v) => handlePlanSettingChange('splitting', v),
            t('repo.plan.splitting'),
          ),
        },
        {
          id: 'acceptanceCriteria',
          label: t('repo.plan.acceptanceCriteria'),
          hint: t('repo.plan.acceptanceCriteriaHelp'),
          disabled: readOnly,
          control: enumControl(
            t,
            planAcceptanceCriteriaVal,
            PLAN_ACCEPTANCE_CRITERIA_FORMATS,
            PLAN_ACCEPTANCE_CRITERIA_LABELS,
            (v) => handlePlanSettingChange('acceptanceCriteria', v),
            t('repo.plan.acceptanceCriteria'),
          ),
        },
      ] },
    { id: 'tickets', title: t('repo.plan.groupTickets'), rows: [
        // Jira issue-type NAMES, as that project spells them — read by this skill and
        // nothing else (jira-fields.md §1.2), which is why they sit here rather than
        // with the Jira address on the Tickets tab. Hidden when the repo files into
        // GitHub, where an "Epic" issue type does not exist.
        ...(trackerModeVal === 'jira'
          ? ([
            ['epic', t('repo.plan.epicType'), t('repo.plan.epicTypeHelp'), planEpicTypeVal, 'Epic'],
            ['story', t('repo.plan.storyType'), t('repo.plan.storyTypeHelp'), planStoryTypeVal, 'Story'],
          ] as const).map(([key, label, hint, value, placeholder]) => ({
            id: `issueType-${key}`,
            label,
            hint,
            disabled: readOnly,
            control: {
              kind: 'input' as const,
              value,
              onChange: (next: string) => handlePlanIssueTypeChange(key, next),
              placeholder,
              className: 'w-64',
            },
          }))
          : []),
        // Two switches that differ only by key, and whose message keys are
        // mechanically `repo.plan.<key>` / `<key>Help`. `duplicateCheck` used to ride
        // along here; it belongs to the phase before any of this.
        ...([
          ['useRepoTemplates', planUseRepoTemplatesVal],
          ['assignToMe', planAssignToMeVal],
        ] as const).map(([key, checked]) => ({
          id: key,
          label: t(`repo.plan.${key}` as MessageKey),
          hint: t(`repo.plan.${key}Help` as MessageKey),
          disabled: readOnly,
          control: {
            kind: 'switch' as const,
            checked,
            onChange: (next: boolean) => handlePlanSettingChange(key, next),
            label: t(`repo.plan.${key}` as MessageKey),
          },
        })),
        {
          id: 'defaultLabels',
          label: t('repo.plan.defaultLabels'),
          hint: t('repo.plan.defaultLabelsHelp'),
          disabled: readOnly,
          layout: 'stacked' as const,
          control: {
            kind: 'chips' as const,
            items: planDefaultLabelsVal,
            onChange: (labels: string[]) => handlePlanSettingChange('defaultLabels', labels),
            placeholder: 'enhancement',
            addLabel: t('common.add'),
            removeLabel: t('common.remove'),
            id: 'plan-default-label-input',
            disabled: readOnly,
          },
        },
      ] },
    languagesGroup([
      langRow('ticket', t('repo.issues.ticketLang'), t('repo.issues.ticketLangHelp'), resolveTicketLanguage(repoLangs)),
      langRow('spec', t('repo.issues.specLang'), t('repo.issues.specLangHelp'), resolveSpecLanguage(repoLangs)),
    ]),
  ]
  /**
   * /MAGIC:START'S SETTINGS, in the order its Step 5 runs: what it does before writing
   * code, who writes it, then how hard the critic is to satisfy. The plan's own rows (its
   * review, its approval, who implements it) only show while there is a plan: without
   * one, the agent implements straight from the ticket, alone.
   */
  const stepperFor = (
    key: 'criticIterations' | 'criticMinScore',
    value: number,
    range: { min: number; max: number; fallback: number },
    label: string,
    text: string,
  ) => ({
    kind: 'stepper' as const,
    value: text,
    onDecrement: () => handleStartSettingChange(key, value - 1),
    onIncrement: () => handleStartSettingChange(key, value + 1),
    canDecrement: value > range.min,
    canIncrement: value < range.max,
    decrementTitle: t('repo.start.less'),
    incrementTitle: t('repo.start.more'),
    onReset: () => handleStartSettingChange(key, range.fallback),
    canReset: value !== range.fallback,
    resetTitle: t('repo.start.reset'),
    label,
    disabled: readOnly,
  })
  const startStepSettings: WorkflowInspectorSettings[] = [
    {
      id: 'before',
      title: t('repo.start.groupBefore'),
      rows: [
        {
          id: 'exploration',
          label: t('repo.start.exploration'),
          hint: t('repo.start.explorationHelp'),
          disabled: readOnly,
          control: enumControl(t, startExplorationVal, START_EXPLORATION_MODES, START_EXPLORATION_LABEL,
            (next) => handleStartSettingChange('exploration', next), t('repo.start.exploration')),
        },
        switchRow('plan', t('repo.start.plan'), t('repo.start.planHelp'),
          startPlanVal, (next) => handleStartSettingChange('plan', next)),
        startPlanVal && switchRow('planReview', t('repo.start.planReview'), t('repo.start.planReviewHelp'),
          startPlanReviewVal, (next) => handleStartSettingChange('planReview', next)),
        startPlanVal && switchRow('planApproval', t('repo.start.planApproval'), t('repo.start.planApprovalHelp'),
          startPlanApprovalVal, (next) => handleStartSettingChange('planApproval', next)),
      ],
    },
    {
      id: 'implementation',
      title: t('repo.start.groupImplementation'),
      rows: [
        startPlanVal && {
          id: 'execution',
          label: t('repo.start.execution'),
          hint: t('repo.start.executionHelp'),
          disabled: readOnly,
          control: enumControl(t, startExecutionVal, START_EXECUTION_MODES, START_EXECUTION_LABEL,
            (next) => handleStartSettingChange('execution', next), t('repo.start.execution')),
        },
        switchRow('simplify', t('repo.start.simplify'), t('repo.start.simplifyHelp'),
          startSimplifyVal, (next) => handleStartSettingChange('simplify', next)),
      ],
    },
    {
      id: 'critic',
      title: t('repo.start.groupCritic'),
      rows: [
        {
          id: 'criticIterations',
          label: t('repo.start.criticIterations'),
          hint: t('repo.start.criticIterationsHelp'),
          disabled: readOnly,
          control: stepperFor('criticIterations', startIterationsVal, START_CRITIC_ITERATIONS,
            t('repo.start.criticIterations'), String(startIterationsVal)),
        },
        {
          id: 'criticMinScore',
          label: t('repo.start.criticMinScore'),
          hint: t('repo.start.criticMinScoreHelp'),
          disabled: readOnly,
          control: stepperFor('criticMinScore', startMinScoreVal, START_CRITIC_SCORE,
            t('repo.start.criticMinScore'), `${startMinScoreVal}/10`),
        },
      ],
    },
  ]

  /**
   * THE COMMIT, PULL REQUEST AND RESOLVE SKILLS' SETTINGS, as their steps' inspector
   * shows them, like Plan's above and for the same reasons: the tabs they had are gone.
   * A group's `sample` is the preview that sat under its card, and `notice` the warning
   * that replaces it when there is nothing to preview.
   */
  const commitStepSettings: WorkflowInspectorSettings[] = [
    {
      id: 'message',
      title: t('repo.commit.groupMessage'),
      rows: [
        {
          id: 'style',
          label: t('repo.commit.style'),
          hint: t('repo.commit.styleHelp'),
          disabled: readOnly,
          control: enumControl(t, styleVal, COMMIT_STYLES, COMMIT_STYLE_LABEL,
            (next) => handleCommitSettingChange('style', next), t('repo.commit.style')),
        },
        {
          id: 'format',
          label: t('repo.commit.format'),
          hint: t('repo.commit.formatHelp'),
          disabled: readOnly,
          control: enumControl(t, formatVal, COMMIT_FORMATS, COMMIT_FORMAT_LABEL,
            (next) => handleCommitSettingChange('format', next), t('repo.commit.format')),
        },
        switchRow('coAuthor', t('repo.commit.coAuthor'), t('repo.commit.coAuthorHelp'),
          coAuthorVal, (next) => handleCommitSettingChange('coAuthor', next)),
        switchRow('ticketId', t('repo.commit.ticketId'), t('repo.commit.ticketIdHelp'),
          includeTicketIdVal, (next) => handleCommitSettingChange('includeTicketId', next)),
      ],
      sample: { label: t('repo.example'), text: commitPreview },
    },
    {
      id: 'branches',
      title: t('repo.commit.groupBranches'),
      rows: [{
        id: 'protectedBranch',
        // The padlock says this row is a guard rail rather than another property of
        // the message — see `SettingRow.icon`, which exists for it.
        icon: Lock,
        label: t('repo.commit.protectedBranch'),
        // The help text has to say which way round it is, because both states do
        // something: ON means allowed-but-asked, OFF means /magic:commit branches
        // off first.
        hint: allowOnProtectedBranchVal
          ? t('repo.commit.protectedBranchHelpOn')
          : t('repo.commit.protectedBranchHelpOff'),
        disabled: readOnly,
        control: {
          kind: 'switch' as const,
          checked: allowOnProtectedBranchVal,
          onChange: (next: boolean) => handleCommitSettingChange('allowOnProtectedBranch', next),
          label: t('repo.commit.protectedBranch'),
        },
      }, {
        id: 'pushAfterCommit',
        icon: Upload,
        label: t('repo.commit.push'),
        hint: pushAfterCommitVal ? t('repo.commit.pushHelpOn') : t('repo.commit.pushHelpOff'),
        disabled: readOnly,
        control: {
          kind: 'switch' as const,
          checked: pushAfterCommitVal,
          onChange: (next: boolean) => handleCommitSettingChange('pushAfterCommit', next),
          label: t('repo.commit.push'),
        },
      }],
    },
    languagesGroup([langRow('commit', t('repo.langs.commit'), t('repo.commit.languageHelp'))]),
  ]

  const prStepSettings: WorkflowInspectorSettings[] = [
    {
      id: 'description',
      title: t('repo.pr.groupDescription'),
      rows: [
        // First row of the card because it governs the body itself, where the rows
        // under it only add things to that body.
        {
          id: 'bodyVerbosity',
          label: t('repo.pr.bodyVerbosity'),
          hint: t('repo.pr.bodyVerbosityHelp'),
          disabled: readOnly,
          control: enumControl(t, bodyVerbosityVal, BODY_VERBOSITY_MODES, BODY_VERBOSITY_LABEL,
            (next) => handlePRSettingChange('bodyVerbosity', next), t('repo.pr.bodyVerbosity')),
        },
        switchRow('autoLink', t('repo.pr.autoLink'), t('repo.pr.autoLinkHelp'),
          autoLinkTicketsVal, (next) => handlePRSettingChange('autoLinkTickets', next)),
        {
          id: 'testAccounts',
          label: t('repo.pr.testAccounts'),
          hint: t('repo.pr.testAccountsHelp'),
          // The warning is about the VALUE — test accounts written into a description
          // a public repository will publish — which is exactly what `note` is for.
          ...(testAccountsVal === 'inline' ? { note: t('repo.pr.testAccountsPublicWarn') } : {}),
          disabled: readOnly,
          control: enumControl(t, testAccountsVal, TEST_ACCOUNT_MODES, TEST_ACCOUNT_LABEL,
            (next) => handlePRSettingChange('testAccounts', next), t('repo.pr.testAccounts')),
        },
        // Only when the accounts are surfaced at all: where to read them from is not a
        // question about a feature that is off.
        testAccountsVal !== 'off' && {
          id: 'testAccountsSource',
          label: t('repo.pr.testAccountsSource'),
          hint: t('repo.pr.testAccountsSourceHelp'),
          disabled: readOnly,
          control: {
            kind: 'input' as const,
            value: testAccountsSourceVal,
            onChange: (next: string) => handlePRSettingChange('testAccountsSource', next),
            placeholder: 'docs/test-accounts.md',
            className: 'w-64',
          },
        },
        // What /magic:pr may do with the boxes of the template edited just below,
        // which is why it sits against that block rather than with the rows above.
        {
          id: 'templateCheckboxes',
          label: t('repo.pr.templateCheckboxes'),
          hint: t('repo.pr.templateCheckboxesHelp'),
          disabled: readOnly,
          control: enumControl(t, templateCheckboxesVal, TEMPLATE_CHECKBOX_MODES, TEMPLATE_CHECKBOX_LABEL,
            (next) => handlePRSettingChange('templateCheckboxes', next), t('repo.pr.templateCheckboxes')),
        },
        // THE TEMPLATE IS ONE ROW IN THREE STATES, which is what it always was and
        // could not say while it was three blocks of markup: the file is being looked
        // for, it is not there and can be written, or it is there and can be edited.
        templateLoading
          ? { id: 'template', label: t('repo.pr.template'), hint: t('repo.pr.templateHelp'), note: t('repo.pr.templateChecking') }
          : !template?.exists
            ? {
              id: 'template',
              label: t('repo.pr.template'),
              hint: t('repo.pr.templateHelp'),
              disabled: readOnly,
              control: {
                kind: 'button' as const,
                icon: Plus,
                children: t('repo.pr.templateGenerate'),
                onClick: handleGenerateTemplate,
              },
            }
            : {
              id: 'template',
              label: t('repo.pr.template'),
              hint: t('repo.pr.templateHelp'),
              // WHERE the file is, which is the one fact the editor below cannot
              // carry: a template is a real path in the repository, not a field.
              note: template.path,
              disabled: readOnly,
              // Stacked: a 64-line editor has no business in a right-hand column.
              layout: 'stacked' as const,
              control: [
                {
                  kind: 'input' as const,
                  multiline: true as const,
                  rows: 14,
                  resize: 'vertical' as const,
                  value: templateContent,
                  onChange: (next: string) => {
                    setTemplateContent(next)
                    setTemplateChanged(next !== template.content)
                  },
                  placeholder: t('repo.pr.templatePlaceholder'),
                  className: 'flex-1 min-w-0',
                },
                ...(templateChanged
                  ? [{ kind: 'button' as const, children: t('common.save'), onClick: handleSaveTemplate }]
                  : []),
              ],
            },
      ],
    },
    {
      id: 'after',
      title: t('repo.pr.groupAfter'),
      rows: [
        // The comment lands on the TICKET and carries the PR link. It sits here
        // rather than with the tracker's address because it is the pull request that
        // triggers it — the same reason the auto-link row above is on this tab.
        // /magic:review and /magic:done read it too.
        switchRow('commentOnPR', t('repo.issues.commentOnPR'), t('repo.issues.commentOnPRHelp'),
          commentOnPRVal, (next) => handleIssuesSettingChange('commentOnPR', next)),
        switchRow('watchCI', t('repo.pr.watchCI'), t('repo.pr.watchCIHelp'),
          watchCIVal, (next) => handlePRSettingChange('watchCI', next)),
      ],
    },
    languagesGroup([
      langRow('pullRequest', t('repo.langs.pullRequest'), t('repo.pr.languageHelp')),
      // The comment /magic:pr leaves on the ticket, and the start of the ticket cascade.
      langRow('jiraComment', t('repo.issues.commentLang'), t('repo.issues.commentLangHelp')),
    ]),
  ]

  const resolveStepSettings: WorkflowInspectorSettings[] = [
    {
      id: 'commits',
      title: t('repo.resolve.groupCommits'),
      rows: [
        {
          id: 'commitMode',
          label: t('repo.resolve.commitMode'),
          hint: t('repo.resolve.commitModeHelp'),
          disabled: readOnly,
          control: enumControl(t, resolveCommitModeVal, RESOLVE_COMMIT_MODES, RESOLVE_COMMIT_MODE_LABEL,
            (next) => handleResolveSettingChange('commitMode', next), t('repo.resolve.commitMode')),
        },
        // Shown when a new commit is possible at all — amending writes no message of
        // its own, so there is no format to choose.
        resolveCommitModeVal !== 'amend' && {
          id: 'commitFormatSource',
          label: t('repo.resolve.commitFormat'),
          hint: t('repo.resolve.commitFormatHelp'),
          disabled: readOnly,
          control: enumControl(t, resolveUseCommitConfigVal ? 'commit' : 'custom',
            RESOLVE_CONFIG_SOURCES, RESOLVE_CONFIG_SOURCE_LABEL,
            (next) => handleResolveSettingChange('useCommitConfig', next === 'commit'),
            t('repo.resolve.commitFormat')),
        },
        // ...and its own style and format only once it has been told not to borrow
        // the commit tab's.
        ...(resolveCommitModeVal !== 'amend' && !resolveUseCommitConfigVal
          ? [
            {
              id: 'resolveStyle',
              label: t('repo.commit.style'),
              hint: t('repo.commit.styleHelp'),
              disabled: readOnly,
              control: enumControl(t, resolveStyleVal, COMMIT_STYLES, COMMIT_STYLE_LABEL,
                (next) => handleResolveSettingChange('style', next), t('repo.commit.style')),
            },
            {
              id: 'resolveFormat',
              label: t('repo.commit.format'),
              hint: t('repo.commit.formatHelp'),
              disabled: readOnly,
              control: enumControl(t, resolveFormatVal, COMMIT_FORMATS, COMMIT_FORMAT_LABEL,
                (next) => handleResolveSettingChange('format', next), t('repo.commit.format')),
            },
          ]
          : []),
      ],
      // THE THREE MODES SAY THREE DIFFERENT THINGS HERE, and only one of them is a
      // preview. A new commit can be shown; amending and asking cannot be, because what
      // they produce is a rewritten history rather than a message, so they warn about
      // the force-push instead.
      ...(resolveCommitModeVal === 'new'
        ? { sample: { label: t('repo.example'), text: resolvePreview } }
        : { notice: { variant: 'warning' as const, text: `${t(resolveCommitModeVal === 'amend' ? 'repo.resolve.amendNotice' : 'repo.resolve.askNotice')} --force-with-lease` } }),
    },
    {
      id: 'replies',
      title: t('repo.resolve.groupReplies'),
      rows: [
        // The language these replies are written in lives on the Languages tab, with
        // every other language — this switch decides whether they are written at all,
        // which is a different question.
        switchRow('reply', t('repo.resolve.reply'), t('repo.resolve.replyHelp'),
          resolveReplyVal, (next) => handleResolveSettingChange('replyToComments', next)),
        // Shown only when replies are on, like the language row on the Languages tab:
        // how much a reply says is not a question worth asking about replies that are
        // never written.
        resolveReplyVal && {
          id: 'replyVerbosity',
          label: t('repo.resolve.replyVerbosity'),
          hint: t('repo.resolve.replyVerbosityHelp'),
          disabled: readOnly,
          control: enumControl(t, resolveReplyVerbosityVal, RESOLVE_VERBOSITIES, RESOLVE_VERBOSITY_LABEL,
            (next) => handleResolveSettingChange('replyVerbosity', next), t('repo.resolve.replyVerbosity')),
        },
      ],
    },
    // Review replies live in `resolve.replyLanguage`, not in the `languages` block, and
    // fall back to the discussion language. Only while replies are written at all.
    ...(resolveReplyVal
      ? [languagesGroup([{
        id: 'replyLanguage',
        label: t('repo.resolve.replyLang'),
        hint: t('repo.resolve.replyLangHelp'),
        disabled: readOnly,
        control: languageControl(
          resolveReplyLangVal,
          (next) => handleResolveSettingChange('replyLanguage', next),
          t('repo.resolve.replyLang'),
        ),
      }])]
      : []),
  ]

  /** A skill's `SkillIntro`, translated for the inspector: the same words its tab opened on. */
  const introOf = (skill: keyof typeof SKILL_INTROS, summary: SkillSummary): WorkflowInspectorIntro => ({
    command: SKILL_INTROS[skill].command,
    lead: t(SKILL_INTROS[skill].lead),
    steps: summary.steps.map((step) => t(step.key, step.vars)),
    flags: summary.tail.map((flag) => t(flag.key, flag.vars)),
  })

  // By skill: what each step's inspector shows below its own controls.
  const stepSettings: Record<string, WorkflowStepConfig> = {
    'magic-plan': {
      intro: introOf('plan', planSummary({
        tracker: planTrackerVal,
        jiraProject: jiraProjectVal,
        githubTarget: githubIssuesTargetVal,
        epicType: planEpicTypeVal,
        storyType: planStoryTypeVal,
        duplicateCheck: planDuplicateCheckVal,
        splitting: planSplittingVal,
        acceptanceCriteria: planAcceptanceCriteriaVal,
        assignToMe: planAssignToMeVal,
        labels: planDefaultLabelsVal,
        useRepoTemplates: planUseRepoTemplatesVal,
      })),
      settings: planStepSettings,
    },
    'magic-start': {
      intro: introOf('start', { steps: [], tail: [] }),
      settings: startStepSettings,
    },
    'magic-commit': {
      intro: introOf('commit', commitSummary({
        format: formatVal,
        style: styleVal,
        allowOnProtectedBranch: allowOnProtectedBranchVal,
        pushAfterCommit: pushAfterCommitVal,
        developmentBranch: branchSettings.development || '',
        coAuthor: coAuthorVal,
        includeTicketId: includeTicketIdVal,
      })),
      settings: commitStepSettings,
    },
    'magic-pr': {
      intro: introOf('pr', prSummary({
        trackerMode: trackerModeVal,
        autoLinkTickets: autoLinkTicketsVal,
        testAccounts: testAccountsVal,
        testAccountsSource: testAccountsSourceVal,
        commentOnPR: commentOnPRVal,
        watchCI: watchCIVal,
        templateCheckboxes: templateCheckboxesVal,
        bodyVerbosity: bodyVerbosityVal,
      })),
      settings: prStepSettings,
    },
    'magic-resolve': {
      intro: introOf('resolve', resolveSummary({
        commitMode: resolveCommitModeVal,
        useCommitConfig: resolveUseCommitConfigVal,
        // Translated here rather than in the summary: a step carries strings, and these
        // two labels are the resolve settings' own dropdowns spelled out.
        formatLabel: t(COMMIT_FORMAT_LABELS[resolveFormatVal] ?? COMMIT_FORMAT_LABELS.angular),
        styleLabel: t(COMMIT_STYLE_LABELS[resolveStyleVal] ?? COMMIT_STYLE_LABELS['single-line']),
        replyToComments: resolveReplyVal,
        replyVerbosity: resolveReplyVerbosityVal,
      })),
      settings: resolveStepSettings,
    },
  }

  return (
    <div>
      <RepoPageHeader
        name={repoName}
        color={repoColor}
        subtitle={readOnly ? t('repo.subtitleReadOnly') : t('repo.subtitle')}
        backLabel={t('repo.back')}
        onBack={() => { window.location.hash = '#/' }}
      />

      {/* THREE THINGS CAN BE WRONG BEFORE ANY SETTING IS, and all three are `Banner` now
          — one component, three variants, where they were three hand-built boxes that
          disagreed about their padding and each spelled its own tint twice.

          They stay above the tab strip because none of them belongs to a tab: a repo
          nobody has bound to a folder is unusable whichever tab you are reading. */}
      <div className="flex flex-col gap-3 mb-6">
        {/* You are neither an admin of the org nor the repo's creator. */}
        {readOnly && (
          <Banner
            variant="info"
            icon={Lock}
            hint={t('repo.readOnly.body', { org: scopeOrg?.name ?? t('repo.readOnly.theOrganization') })}
          >
            {t('repo.readOnly.title')}
          </Banner>
        )}

        {/* The folder is bound but is not a git repository, or is not there at all. */}
        {pathStatus && !pathStatus.isGit && (
          <Banner
            variant="danger"
            icon={AlertTriangle}
            hint={pathStatus.exists ? t('repo.gitWarning.notGitBody') : t('repo.gitWarning.missingBody')}
          >
            {pathStatus.exists ? t('repo.gitWarning.notGitTitle') : t('repo.gitWarning.missingTitle')}
          </Banner>
        )}

        {/* A team repo nobody has pointed at a clone on THIS machine. The only one of the
            three that can be fixed from here, so it is the only one carrying a button. */}
        {repo?.needsLocalPath && (
          <Banner
            variant="warning"
            icon={FolderOpen}
            hint={t('repo.noLocal.body')}
            actions={[{ label: t('repo.noLocal.action'), icon: FolderOpen, onClick: handlePickFolder, primary: true }]}
          >
            {t('repo.noLocal.title')}
          </Banner>
        )}
      </div>

      {/* Sub-tabs, INSIDE one entry of the settings rail — the shared TabStrip, so a
          second level of navigation looks like every other tab row in the app rather
          than like something this page invented.

          Local state, not the hash route: `contentKey` in Config/index.tsx keys the
          content pane on `repo:{name}`, so switching sub-tab does not remount this
          page and the choice survives. Leaving the repository and coming back does
          remount it, which lands on General — the right default for reopening a repo
          you have not touched in a while. */}
      <div className="mb-6">
        <TabStrip
          ariaLabel={t('repo.tabs.aria')}
          items={REPO_TABS.map(({ id, labelKey, icon }) => ({ key: id, label: t(labelKey), icon }))}
          activeKey={tab}
          // The cast holds because TabStrip only ever reports back a key it was
          // handed, and every key here comes from REPO_TABS.
          onSelect={(key) => setTab(key as RepoTab)}
        />
      </div>

      {/* Every tab's panel, in one wrapper so the switch between them travels the way
          the strip does: a tab further right arrives from the right. The panels keep
          their own indentation rather than gaining a level from this — the alternative
          was reindenting nine hundred lines of settings to add a div.

          `bleed` because this sweep is NESTED: the window's own sweep layer already
          insets every page by `p-6` (see `pages/Config/index.tsx`), so without it the
          cards start flush against the box that clips and each one loses 24px of its
          side for the length of the slide. */}
      <TabSweep tabKey={tab} order={REPO_TABS.map(({ id }) => id)} bleed>

      {tab === 'general' && (
        <div className="flex flex-col gap-6">
        <SectionHeader icon={Settings2} title={t('repo.general.section')} description={t('repo.general.intro')} spacing="none" />
        {/* WHO THE REPOSITORY BELONGS TO, and the one move that changes it.

            A `SettingRow` with a mark rather than the accent-tinted badge this drew by
            hand: the padlock and the building say personal-or-team at the same glance the
            plate did, on the row every other setting on this page is drawn as. */}
        <SettingsCard
          title={t('repo.scope.section')}
          rows={[{
            id: 'scope',
            icon: repo?.orgId ? Building2 : Lock,
            label: repo?.orgId
              ? (scopeOrg ? t('repo.scope.teamNamed', { name: scopeOrg.name }) : t('repo.scope.team'))
              : t('repo.scope.personal'),
            hint: repo?.orgId ? t('repo.scope.teamHelp') : t('repo.scope.personalHelp'),
            disabled: readOnly,
            ...(repo?.orgId
              ? {
                control: {
                  kind: 'button' as const,
                  icon: Lock,
                  children: t('repo.scope.makePersonal'),
                  onClick: handleMakePersonal,
                },
              }
              : orgs.length > 0
                ? {
                  // Held at `''` on purpose: picking an organization SHARES the repository
                  // with it rather than setting the control to it, so the trigger goes
                  // back to the placeholder and the row is replaced by the shared state.
                  control: {
                    kind: 'select' as const,
                    value: '',
                    options: orgs.map((o) => ({ value: o.id, label: o.name })),
                    onChange: handleShare,
                    placeholder: t('repo.scope.sharePlaceholder'),
                    ariaLabel: t('repo.scope.sharePlaceholder'),
                    width: SELECT_WIDTH,
                  },
                }
                // No organization to share with: the row states why rather than offering
                // a picker with nothing in it.
                : { note: t('repo.scope.joinOrg') }),
          }]}
        />

        {/* The one language that belongs to no skill: the one Claude speaks with you, in
            every skill alike. Each skill's own languages are on its step in the workflow. */}
        <SettingsCard
          title={t('repo.langs.groupChat')}
          rows={[langRow('discussion', t('repo.general.discussionLang'), t('repo.general.discussionLangHelp'))]}
        />

        <SettingsCard
          title={t('repo.general.section')}
          rows={[
            {
              id: 'name',
              label: t('repo.general.name'),
              hint: t('repo.general.nameHelp'),
              disabled: readOnly,
              // The Save appears only once the field differs, and it sits BESIDE the
              // input rather than under it: the row draws its controls as one cluster,
              // which is what keeps a field-plus-button the same object here as on every
              // other settings page.
              control: [
                { kind: 'input' as const, value: editedName, onChange: setEditedName, className: 'w-64' },
                ...(editedName !== repoName && editedName.trim()
                  ? [{ kind: 'button' as const, children: t('common.save'), onClick: handleRename }]
                  : []),
              ],
            },
            {
              id: 'keywords',
              label: t('repo.general.keywords'),
              hint: t('repo.general.keywordsHelp'),
              disabled: readOnly,
              // STACKED, because chips grow along the row and a handful of them beside
              // their own label wraps after two. Each one saves as it is added or
              // removed, so there is no draft to lose and no Save button to find.
              layout: 'stacked' as const,
              control: {
                kind: 'chips' as const,
                items: repo.keywords || [],
                onChange: handleKeywordsChange,
                placeholder: 'auth',
                addLabel: t('common.add'),
                removeLabel: t('common.remove'),
                id: 'keyword-input',
                disabled: readOnly,
              },
            },
          ]}
        />

        {/* The colour picker is the one control on this tab that is not a design system
            kind and should not become one: thirty-six hues in a popover is this app's own
            object, and a `kind` for it would be the design system holding the palette. It
            keeps its hand-built row, which is now the only one left on the page. */}
        <Card className="flex items-center justify-between gap-6">
          <div className="min-w-0">
            <Text size="sm" weight="medium" className="block">{t('repo.general.color')}</Text>
            <Text size="xs" tone="secondary" className="mt-0.5 block opacity-50">
              {t('repo.general.colorHelp')}
            </Text>
          </div>
          {/* `repoColor`, not `repo.color`: a repo that never chose keeps the fallback the
              rest of the app draws it with, so the selection shown here is never a colour
              the repo is not wearing. */}
          <RepoColorPicker color={repoColor} onChange={handleColorChange} disabled={readOnly} />
        </Card>

        {/* Danger last, and inside General rather than behind a tab of its own: a tab is a
            place you go, and nobody goes looking for the delete button. At the bottom of
            the page the repo's own settings live on, it is where a destructive action
            belongs — past everything else, and not one click from anywhere.

            `SettingsCard`'s own `alert`, which is a `Banner` in the variant's colour: the
            red-tinted box with a red-outlined button was this page's private spelling of
            exactly that, and the outline went with every other border on the page. */}
        <SettingsCard
          title={t('repo.danger.section')}
          rows={[]}
          alert={{
            variant: 'danger',
            icon: Trash2,
            message: t('repo.danger.delete'),
            hint: t('repo.danger.deleteHelp'),
            actions: readOnly
              ? []
              : [{ label: t('repo.danger.deleteAction'), icon: Trash2, onClick: () => setIsDeleteModalOpen(true) }],
          }}
        />
        </div>
      )}

      {tab === 'repository' && (
        <div className="flex flex-col gap-6">
        <SectionHeader icon={GitBranch} title={t('repo.repository.section')} description={t('repo.repository.intro')} spacing="none" />
        {/* Repository, in three groups that answer three different questions: WHERE the
            repo is — the folder on this machine and the address teammates clone — which
            branch work starts from, and what a fresh worktree needs copied into it. One
            unlabelled card held all four rows, which read as a pile: the path is private
            to this machine while the branch is shared config, and nothing on screen said
            so. */}
        {/* NO `disabled` ON THE PATH ROW, unlike the two cards below. The path is this
            machine's own, private to you, and a read-only member of a team repo still has
            to point the repo at their clone. The remote row carries its own rule again —
            any member may FILL IN a missing address, only an owner or admin may correct
            one already set. */}
        <SettingsCard
          title={t('repo.repository.groupLocation')}
          rows={[
            {
              id: 'path',
              label: t('repo.general.path'),
              hint: readOnly ? t('repo.general.pathHelpReadOnly') : t('repo.general.pathHelp'),
              // What the folder actually IS, under the row. The loud version of a bad
              // path is the banner at the top of the page, which every tab shows: a
              // second red line here would be the same news twice.
              ...(pathStatus
                ? {
                  note: pathStatus.isGit
                    ? t('repo.general.pathValid')
                    : pathStatus.exists
                      ? t('repo.general.pathNotGit')
                      : t('repo.general.pathMissing'),
                }
                : {}),
              control: [
                { kind: 'input' as const, value: path, onChange: handlePathChange, className: 'w-64' },
                {
                  kind: 'buttonIcon' as const,
                  icon: FolderOpen,
                  title: t('repo.general.chooseFolder'),
                  onClick: handlePickFolder,
                },
                ...(pathChanged
                  ? [{ kind: 'button' as const, children: t('common.save'), onClick: savePath }]
                  : []),
              ],
            },
            // The same remote row the Tickets tab shows — same state, same save button
            // (see `remoteUrlRow`). It appears twice because the address answers two
            // different questions: here it is where a teammate clones this repo FROM,
            // there it is the repository the issues are filed IN. One row shared between
            // them is what keeps the two from drifting apart.
            remoteUrlRow(
              'remote-repository',
              t('repo.general.remoteUrl'),
              readOnly ? t('repo.general.remoteUrlHelpReadOnly') : t('repo.general.remoteUrlHelp'),
            ),
          ]}
        />

        <SettingsCard
          title={t('repo.repository.groupBranches')}
          rows={[{
            id: 'development',
            label: t('repo.branches.development'),
            hint: t('repo.branches.developmentHelp'),
            disabled: readOnly,
            // The placeholder does double duty while the branches are being read: the
            // list is empty then, and "Loading…" is the honest name for a picker that has
            // nothing to offer yet.
            control: {
              kind: 'select' as const,
              value: branchSettings.development || '',
              options: remoteBranches.map((branch) => ({ value: branch, label: branch })),
              onChange: (next: string) => handleBranchSettingChange('development', next),
              disabled: branchesLoading,
              placeholder: branchesLoading ? t('common.loading') : t('repo.branches.select'),
              ariaLabel: t('repo.branches.development'),
              width: SELECT_WIDTH,
            },
          }]}
        />

        <SettingsCard
          title={t('repo.repository.groupWorktrees')}
          rows={[{
            id: 'worktree-files',
            label: t('repo.worktree.files'),
            hint: t('repo.worktree.filesHelp'),
            disabled: readOnly,
            // Stacked for the keywords' reason: a list of filenames beside its own label
            // wraps after two.
            layout: 'stacked' as const,
            control: {
              kind: 'chips' as const,
              items: repo.worktreeFiles || [],
              onChange: handleWorktreeFilesChange,
              placeholder: '.env',
              addLabel: t('common.add'),
              removeLabel: t('common.remove'),
              id: 'worktree-file-input',
              disabled: readOnly,
            },
          }]}
        />
        </div>
      )}

      {tab === 'tickets' && (
        <div className="flex flex-col gap-6">
        <SectionHeader icon={Ticket} title={t('repo.tickets.section')} description={t('repo.tickets.intro')} spacing="none" />
        {/* Tickets, in groups that answer one question each: WHERE do tickets go, and
            what is each tracker's address. It was one flat list of seven rows mixing
            the two with Jira issue-type names, and it read as a form rather than as an
            answer — the Jira type names have moved to the Plan tab, which is the only
            skill that reads them. */}
        <SettingsCard
          title={t('repo.tracker.groupDestination')}
          rows={[
            // Which tracker this repo files into. Not quite `plan.tracker`, which has a
            // third value, `ask`: that one is not a tracker but an instruction to choose
            // at runtime, so it is the switch below rather than an option here. Switching
            // to GitHub writes `github` and leaves every Jira value in storage untouched,
            // so it cannot lose a project key by accident.
            {
              id: 'tracker',
              label: t('repo.tracker.mode'),
              hint: t('repo.tracker.modeHelp'),
              disabled: readOnly,
              control: withIcons(enumControl(
                t,
                trackerModeVal,
                TRACKER_MODES,
                TRACKER_MODE_LABELS,
                (mode) => handlePlanSettingChange('tracker', mode === 'github' ? 'github' : 'jira'),
                t('repo.tracker.mode'),
              ), TRACKER_MODE_ICONS),
            },
            // Only reachable in Jira mode, because it is a question about a CHOICE: with
            // GitHub alone there is nothing to ask about. On means `ask`, off means the
            // tracker named above — so switching it off leaves a repo filing into Jira,
            // never into nothing.
            trackerModeVal === 'jira' && {
              id: 'tracker-ask',
              label: t('repo.tracker.askEachTime'),
              hint: t('repo.tracker.askEachTimeHelp'),
              disabled: readOnly,
              control: {
                kind: 'switch' as const,
                checked: planTrackerVal === 'ask',
                onChange: (next: boolean) => handlePlanSettingChange('tracker', next ? 'ask' : 'jira'),
                label: t('repo.tracker.askEachTime'),
              },
            },
          ]}
        />

        <SettingsCard
          title={t('repo.tracker.groupGithub')}
          rows={[
            // The same remote row the Repository tab shows as a clone address — same
            // state, same save button (see `remoteUrlRow`).
            //
            // Its help line depends on the tracker, and that is the whole point: it used
            // to claim "issues are filed in …/issues" even when the tracker was Jira,
            // contradicting the row above it. In Jira mode the remote is still needed —
            // pull requests and clones use it — but it is not where tickets go, so it
            // says so.
            remoteUrlRow(
              'remote-tickets',
              t('repo.tracker.githubRepo'),
              readOnly
                ? t('repo.general.remoteUrlHelpReadOnly')
                : trackerModeVal !== 'github'
                  ? t('repo.tracker.githubRepoHelpPr')
                  : githubIssuesTargetVal
                    ? t('repo.tracker.issuesGoTo', { target: githubIssuesTargetVal })
                    : t('repo.tracker.githubTargetNone'),
            ),
          ]}
        />

        {trackerModeVal === 'jira' && (
          <SettingsCard
            title={t('repo.tracker.groupJira')}
            rows={[
              // Two halves of one address, which is why they share a config block: the
              // site says where Jira is, the key says which project inside it receives
              // the tickets. Only the key is needed to WRITE one — the site decides
              // whether a ticket can be shown as a link (trackers.md §3.1).
              {
                id: 'jira-site',
                label: t('repo.tracker.jiraLink'),
                hint: t('repo.tracker.jiraLinkHelp'),
                disabled: readOnly,
                control: {
                  kind: 'input' as const,
                  value: jiraSiteUrlVal,
                  onChange: (next: string) => handleJiraSettingChange('siteUrl', next),
                  placeholder: 'https://company.atlassian.net/browse/',
                  className: 'w-64',
                },
              },
              {
                id: 'jira-project',
                label: t('repo.plan.jiraProject'),
                hint: t('repo.plan.jiraProjectHelp'),
                disabled: readOnly,
                control: {
                  kind: 'input' as const,
                  value: jiraProjectVal,
                  onChange: (next: string) => handleJiraSettingChange('projectKey', next),
                  placeholder: 'PROJ',
                  className: 'w-64',
                },
              },
            ]}
          />
        )}
        </div>
      )}

      {/* Mounted only while its tab is shown, which TabSweep's `tab ===` already
          guarantees: the canvas listens for the space bar on the whole document. */}
      {tab === 'workflow' && <WorkflowPanel repoName={repoName} repositories={repositoryOptions} openEditor={openEditor} readOnly={readOnly} stepSettings={stepSettings} />}

      {tab === 'annex' && (
        <div className="flex flex-col gap-6">
        <SectionHeader icon={Puzzle} title={t('repo.annex.section')} description={t('repo.annex.intro')} spacing="none" />
        <SkillIntro
          skill="review"
          summary={reviewSummary({ confidenceScore: reviewConfidenceScoreVal, mode: reviewModeVal })}
        />
        <SettingsCard
          title={t('repo.review.groupDraft')}
          rows={[
            switchRow('confidenceScore', t('repo.review.confidenceScore'), t('repo.review.confidenceScoreHelp'),
              reviewConfidenceScoreVal, (next) => handleReviewSettingChange('confidenceScore', next)),
            {
              id: 'reviewMode',
              label: t('repo.review.mode'),
              hint: t('repo.review.modeHelp'),
              disabled: readOnly,
              control: enumControl(t, reviewModeVal, REVIEW_MODES, REVIEW_MODE_LABEL,
                (next) => handleReviewSettingChange('mode', next), t('repo.review.mode')),
            },
          ]}
        />
        <SettingsCard
          title={t('repo.langs.section')}
          // Inherits the pull request language when unset, so it is handed the resolved value.
          rows={[langRow('review', t('repo.langs.review'), t('repo.review.languageHelp'), resolveReviewLanguage(repoLangs))]}
        />
        </div>
      )}

      </TabSweep>

      {/* Delete Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title={t('repo.delete.title')}
        footer={
          <>
            <Button tone="ghost" onClick={() => setIsDeleteModalOpen(false)}>
              {t('common.cancel')}
            </Button>
            {/* `danger`, and `busy` rather than a hand-spun disabled state: the delete is
                a round trip to the cloud, and a button that dims without moving reads as
                refused rather than as working. */}
            <Button tone="danger" icon={Trash2} busy={isDeleting} onClick={handleDelete}>
              {isDeleting ? t('repo.delete.deleting') : t('repo.danger.deleteAction')}
            </Button>
          </>
        }
      >
        <Text size="sm" className="block">{t('repo.delete.confirm', { name: repoName })}</Text>
        <Text size="sm" tone="secondary" className="mt-2 block opacity-50">{t('repo.delete.irreversible')}</Text>
      </Modal>
    </div>
  )
}
