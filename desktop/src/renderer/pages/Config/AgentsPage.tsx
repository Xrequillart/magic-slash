import { useEffect, useState } from 'react'
import { AlertTriangle, Archive, Bot, ListOrdered, PanelRight } from '@ds/desktop/icons'
import { SectionHeader, SettingsCard } from '@ds/desktop'
import { useToggleRow } from './ToggleRow'
import { useFormatSelect } from './FormatSelect'
import { useStore } from '../../store'
import { useConfig } from '../../hooks/useConfig'
import { useT, type MessageKey } from '../../i18n'
import { SELECT_WIDTH } from '../../theme/controls'
import { showToast } from '../../components/Toast'
import {
  AGENT_SORT_MODES, DEFAULT_AGENT_SORT,
  type AgentSortMode, type AgentType, type ClaudeModelOption, type LaunchMode,
} from '../../../types'

/**
 * EVERYTHING ABOUT AN AGENT, on one page: what a new one is and how it starts, how the
 * list of them is ordered, the panel beside one, and what archiving one asks.
 *
 * Gathered from four places. The new-agent defaults were a section of Application, the
 * launch mode a section of Claude Code, the context card a row of Appearance, and the
 * sort was only ever the little menu in the sidebar's header (which stays; this page is
 * a second door to the same value). Each was right where it was for its own reason and
 * wrong for the reader, who thinks "how do my agents start" and had three pages to open.
 *
 * ── THE MODEL LIST IS THE READER'S ────────────────────────────────────────────────
 *
 * Asked of their installed Claude Code (`claude:listModels`, main/claude-models.ts), so
 * it is what their own `/model` offers and needs no release of this app to follow one of
 * Claude Code's. Its first row is no model at all: no `--model` flag, the CLI's default.
 */

// Message keys rather than labels: module scope is evaluated once at import, so a
// literal here would pin the select to the boot language.
const AGENT_TYPE_OPTIONS: { value: AgentType; labelKey: MessageKey; descriptionKey: MessageKey }[] = [
  { value: 'coder', labelKey: 'agentType.coder', descriptionKey: 'agentType.coderHint' },
  { value: 'planner', labelKey: 'agentType.planner', descriptionKey: 'agentType.plannerHint' },
]

export const LAUNCH_MODE_OPTIONS: { value: LaunchMode; labelKey: MessageKey; descriptionKey: MessageKey }[] = [
  { value: 'plan', labelKey: 'settings.launchMode.plan', descriptionKey: 'settings.launchMode.plan.help' },
  { value: 'default', labelKey: 'settings.launchMode.default', descriptionKey: 'settings.launchMode.default.help' },
  { value: 'acceptEdits', labelKey: 'settings.launchMode.acceptEdits', descriptionKey: 'settings.launchMode.acceptEdits.help' },
  { value: 'auto', labelKey: 'settings.launchMode.auto', descriptionKey: 'settings.launchMode.auto.help' },
  { value: 'bypassPermissions', labelKey: 'settings.launchMode.bypass', descriptionKey: 'settings.launchMode.bypass.help' },
]

const SORT_LABEL: Record<AgentSortMode, MessageKey> = {
  recent: 'sidebar.sort.recent',
  status: 'sidebar.sort.status',
  repository: 'sidebar.sort.repository',
}

/** The value the model picker gives "no `--model`": not a model name, so it cannot collide. */
const CLI_DEFAULT = '__cli-default__'

/** What the installed CLI offers, or why there is nothing: still asking, or no answer. */
function useClaudeModels(): ClaudeModelOption[] | 'loading' | 'failed' {
  const [models, setModels] = useState<ClaudeModelOption[] | 'loading' | 'failed'>('loading')
  useEffect(() => {
    let live = true
    window.electronAPI.config.listClaudeModels()
      .then((list) => { if (live) setModels(list) })
      .catch(() => { if (live) setModels('failed') })
    return () => { live = false }
  }, [])
  return models
}

function NewAgentsSection() {
  const t = useT()
  const config = useStore((s) => s.config)
  const setConfig = useStore((s) => s.setConfig)
  const { updateDefaultAgentType, updateLaunchMode, updateDefaultModel } = useConfig()
  const models = useClaudeModels()

  const [agentType, setAgentType] = useState<AgentType>(config?.defaultAgentType ?? 'coder')
  const [launchMode, setLaunchMode] = useState<LaunchMode>(config?.launchMode ?? 'default')
  const [model, setModel] = useState(config?.defaultModel ?? CLI_DEFAULT)
  const [showBypassWarning, setShowBypassWarning] = useState(false)

  const storedType = config?.defaultAgentType
  const storedMode = config?.launchMode
  const storedModel = config?.defaultModel ?? CLI_DEFAULT
  useEffect(() => { if (storedType !== undefined) setAgentType(storedType) }, [storedType])
  useEffect(() => { if (storedMode !== undefined) setLaunchMode(storedMode) }, [storedMode])
  useEffect(() => setModel(storedModel), [storedModel])

  // Optimistic, then reverted on failure: the shape every write in Settings uses.
  const chooseType = async (next: AgentType) => {
    const previous = agentType
    setAgentType(next)
    try {
      await updateDefaultAgentType(next)
      showToast(t('toast.defaultAgentTypeUpdated'), 'success')
    } catch {
      setAgentType(previous)
    }
  }

  const applyLaunchMode = async (next: LaunchMode) => {
    const previous = launchMode
    setLaunchMode(next)
    setShowBypassWarning(false)
    try {
      await updateLaunchMode(next)
      showToast(t('toast.launchModeUpdated'), 'success')
    } catch {
      setLaunchMode(previous)
    }
  }

  // The one mode that asks before it is set: the picker stays where it was and the card
  // asks underneath, and only the confirm writes it.
  const chooseLaunchMode = (next: LaunchMode) => {
    if (next === 'bypassPermissions') return setShowBypassWarning(true)
    applyLaunchMode(next)
  }

  const chooseModel = async (next: string) => {
    if (next === model) return
    const previous = model
    setModel(next)
    try {
      await updateDefaultModel(next === CLI_DEFAULT ? null : next)
    } catch (error) {
      setModel(previous)
      showToast(error instanceof Error ? error.message : t('toast.settingUpdateFailed'), 'error')
    }
  }

  // A FALLBACK, as it always was: an agent whose panel has been toggled keeps its own
  // state, so flipping this changes no agent already decided about.
  const infoSidebarRow = useToggleRow({
    label: t('settings.application.infoSidebar.label'),
    help: t('settings.application.infoSidebar.help'),
    value: config?.infoSidebarOnCreate,
    onChange: async (next) => {
      const result = await window.electronAPI.config.setInfoSidebarOnCreate(next)
      setConfig(result.config)
    },
    errorMessage: t('toast.settingUpdateFailed'),
  })

  const list = Array.isArray(models) ? models : []
  // The stored model stays offered even when the CLI no longer lists it (a model retired
  // since it was picked, or the list not in yet), so the picker never shows a value it
  // does not have a row for. The CLI is the one to refuse it, at launch.
  const modelOptions = [
    { value: CLI_DEFAULT, label: t('settings.agents.model.cliDefault') },
    ...list.map((m) => ({ value: m.value, label: m.label })),
    ...(model !== CLI_DEFAULT && !list.some((m) => m.value === model) ? [{ value: model, label: model }] : []),
  ]
  const activeModel = list.find((m) => m.value === model)
  const modelNote = models === 'loading'
    ? t('settings.agents.model.loading')
    : models === 'failed' || list.length === 0
      ? t('settings.agents.model.unavailable')
      : model === CLI_DEFAULT
        ? t('settings.agents.model.cliDefaultHelp')
        : activeModel?.description

  const activeType = AGENT_TYPE_OPTIONS.find((option) => option.value === agentType)
  const activeMode = LAUNCH_MODE_OPTIONS.find((option) => option.value === launchMode)

  return (
    <div>
      <SectionHeader icon={Bot} title={t('settings.application.agentDefaults.section')} />
      <SettingsCard
        rows={[
          {
            id: 'defaultAgentType',
            label: t('settings.defaultAgentType.title'),
            hint: t('settings.defaultAgentType.description'),
            note: activeType ? t(activeType.descriptionKey) : undefined,
            control: {
              kind: 'select',
              value: agentType,
              options: AGENT_TYPE_OPTIONS.map((opt) => ({ value: opt.value, label: t(opt.labelKey) })),
              onChange: (next) => chooseType(next as AgentType),
              ariaLabel: t('settings.defaultAgentType.title'),
              width: SELECT_WIDTH,
            },
          },
          {
            id: 'defaultModel',
            label: t('settings.agents.model.label'),
            hint: t('settings.agents.model.help'),
            note: modelNote,
            control: {
              kind: 'select',
              value: model,
              options: modelOptions,
              onChange: chooseModel,
              ariaLabel: t('settings.agents.model.label'),
              width: SELECT_WIDTH,
            },
          },
          {
            id: 'launchMode',
            label: t('settings.launchMode.label'),
            hint: t('settings.launchMode.help'),
            note: activeMode ? t(activeMode.descriptionKey) : undefined,
            control: {
              kind: 'select',
              value: launchMode,
              options: LAUNCH_MODE_OPTIONS.map((opt) => ({ value: opt.value, label: t(opt.labelKey) })),
              onChange: (next) => chooseLaunchMode(next as LaunchMode),
              ariaLabel: t('settings.launchMode.label'),
              width: SELECT_WIDTH,
            },
          },
          { id: 'infoSidebar', ...infoSidebarRow },
        ]}
        alert={
          showBypassWarning
            ? {
                message: t('settings.launchMode.bypassWarning'),
                icon: AlertTriangle,
                actions: [
                  { label: t('settings.launchMode.bypassConfirm'), primary: true, onClick: () => applyLaunchMode('bypassPermissions') },
                  { label: t('common.cancel'), onClick: () => setShowBypassWarning(false) },
                ],
              }
            : undefined
        }
      />
    </div>
  )
}

function ListSection() {
  const t = useT()
  const { config, updateAgentSort } = useConfig()
  const current = config?.agentSort ?? DEFAULT_AGENT_SORT

  return (
    <div>
      <SectionHeader icon={ListOrdered} title={t('settings.agents.list.section')} />
      <SettingsCard
        rows={[
          {
            id: 'agentSort',
            label: t('settings.agents.sort.label'),
            hint: t('settings.agents.sort.help'),
            control: {
              kind: 'select',
              value: current,
              options: AGENT_SORT_MODES.map((mode) => ({ value: mode, label: t(SORT_LABEL[mode]) })),
              // The same write as the sidebar's menu, so the two doors cannot disagree.
              onChange: (next) => { if (next !== current) updateAgentSort(next as AgentSortMode) },
              ariaLabel: t('settings.agents.sort.label'),
              width: SELECT_WIDTH,
            },
          },
        ]}
      />
    </div>
  )
}

function PanelSection() {
  const t = useT()
  const { config, updateAgentContextEnabled, updateAgentContextMinimized } = useConfig()

  const agentContextFormat = useFormatSelect({
    minimized: config?.agentContextMinimized,
    onChange: updateAgentContextMinimized,
    ariaLabel: `${t('settings.appearance.sidebars.agentContext.label')} · ${t('settings.appearance.sidebars.format.label')}`,
    errorMessage: t('toast.sidebarPanelFailed'),
  })
  const agentContextRow = useToggleRow({
    label: t('settings.appearance.sidebars.agentContext.label'),
    help: t('settings.appearance.sidebars.agentContext.help'),
    value: config?.agentContextEnabled,
    onChange: updateAgentContextEnabled,
    errorMessage: t('toast.sidebarPanelFailed'),
    // Hidden card, hidden format: asking how to lay out a panel that is not on screen
    // is a question with no answer.
    trailing: (enabled) => enabled && agentContextFormat,
  })

  return (
    <div>
      <SectionHeader icon={PanelRight} title={t('settings.agents.panel.section')} />
      <SettingsCard rows={[{ id: 'agentContext', ...agentContextRow }]} />
    </div>
  )
}

function ArchiveSection() {
  const t = useT()
  const { config, updateConfirmAgentArchive } = useConfig()

  const confirmRow = useToggleRow({
    label: t('settings.agents.archive.confirm.label'),
    help: t('settings.agents.archive.confirm.help'),
    value: config?.confirmAgentArchive,
    onChange: updateConfirmAgentArchive,
    errorMessage: t('toast.settingUpdateFailed'),
  })

  return (
    <div>
      <SectionHeader icon={Archive} title={t('settings.agents.archive.section')} />
      <SettingsCard rows={[{ id: 'confirmAgentArchive', ...confirmRow }]} />
    </div>
  )
}

export function AgentsPage() {
  return (
    <div className="flex flex-col gap-8">
      <NewAgentsSection />
      <ListSection />
      <PanelSection />
      <ArchiveSection />
    </div>
  )
}
