import { useEffect, useState } from 'react'
import { Megaphone, Workflow } from '@ds/desktop/icons'
import { SectionHeader, SettingsCard } from '@ds/desktop'
import { useConfig } from '../../hooks/useConfig'
import { useT, type MessageKey } from '../../i18n'
import { SELECT_WIDTH } from '../../theme/controls'
import { showToast } from '../../components/Toast'
import {
  WORKFLOW_CHAIN_LIMITS, WORKFLOW_CONFIRM_CHAINS, WORKFLOW_MISSING_SKILLS, resolveWorkflowSettings,
  type WorkflowConfirmChain, type WorkflowMissingSkill, type WorkflowSettings,
} from '../../../types'

/**
 * SETTINGS → WORKFLOW: how far a repository's flow may run on its own, for THIS person.
 *
 * The flow itself is the repository's (its Workflow tab), shared by every member. What it
 * may do unattended on someone's machine is theirs: ask before a chain, stop after a few
 * in a row, and what to do with a step whose skill they do not have. The main process
 * applies these to every answer of `/workflow/next` (`applyChainPolicy`), so a session
 * started from a plain terminal follows them too, as long as the app runs.
 *
 * ACTIONS ARE ON UNTIL TURNED OFF. A repository's action (a Slack message once the PR is
 * created) runs through this person's own MCP servers and speaks in their name, so they can
 * turn them off here: `applyActionPolicy` then holds every action back, and says so in one
 * line where one was held.
 */

/** Keys rather than labels: module scope is evaluated once at import, so a `t()` here would pin the boot language. */
export const CONFIRM_LABEL: Record<WorkflowConfirmChain, MessageKey> = {
  never: 'settings.workflow.confirm.never',
  custom: 'settings.workflow.confirm.custom',
  always: 'settings.workflow.confirm.always',
}

export const MISSING_LABEL: Record<WorkflowMissingSkill, MessageKey> = {
  stop: 'settings.workflow.missing.stop',
  skip: 'settings.workflow.missing.skip',
}

export function WorkflowSettingsPage() {
  const t = useT()
  const { config, updateWorkflowSettings } = useConfig()
  const stored = resolveWorkflowSettings(config?.workflow)
  const [settings, setSettings] = useState(stored)
  useEffect(() => setSettings(stored), [stored.confirmChain, stored.chainLimit, stored.missingSkill, stored.runActions])

  // Optimistic, then reverted on failure: the shape every write in Settings uses.
  const change = async (patch: WorkflowSettings) => {
    const previous = settings
    setSettings({ ...settings, ...patch })
    try {
      await updateWorkflowSettings(patch)
    } catch (error) {
      setSettings(previous)
      showToast(error instanceof Error ? error.message : t('toast.settingUpdateFailed'), 'error')
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <SectionHeader icon={Workflow} title={t('settings.workflow.section')} />
        <SettingsCard
          rows={[
            {
              id: 'workflowConfirmChain',
              label: t('settings.workflow.confirm.label'),
              hint: t('settings.workflow.confirm.help'),
              control: {
                kind: 'select',
                value: settings.confirmChain,
                options: WORKFLOW_CONFIRM_CHAINS.map((value) => ({ value, label: t(CONFIRM_LABEL[value]) })),
                onChange: (next) => change({ confirmChain: next as WorkflowConfirmChain }),
                ariaLabel: t('settings.workflow.confirm.label'),
                width: SELECT_WIDTH,
              },
            },
            {
              id: 'workflowChainLimit',
              label: t('settings.workflow.limit.label'),
              hint: t('settings.workflow.limit.help'),
              control: {
                kind: 'select',
                // A number of steps, and the picker deals in strings: parsed on the way back.
                value: String(settings.chainLimit),
                options: WORKFLOW_CHAIN_LIMITS.map((count) => ({
                  value: String(count),
                  label: count === 0 ? t('settings.workflow.limit.none') : t('settings.workflow.limit.option', { count }),
                })),
                onChange: (next) => change({ chainLimit: parseInt(next, 10) }),
                ariaLabel: t('settings.workflow.limit.label'),
                width: SELECT_WIDTH,
              },
            },
            {
              id: 'workflowMissingSkill',
              label: t('settings.workflow.missing.label'),
              hint: t('settings.workflow.missing.help'),
              control: {
                kind: 'select',
                value: settings.missingSkill,
                options: WORKFLOW_MISSING_SKILLS.map((value) => ({ value, label: t(MISSING_LABEL[value]) })),
                onChange: (next) => change({ missingSkill: next as WorkflowMissingSkill }),
                ariaLabel: t('settings.workflow.missing.label'),
                width: SELECT_WIDTH,
              },
            },
          ]}
        />
      </div>
      <div>
        <SectionHeader icon={Megaphone} title={t('settings.workflow.actions.section')} />
        <SettingsCard
          rows={[
            {
              id: 'workflowRunActions',
              label: t('settings.workflow.actions.label'),
              hint: t('settings.workflow.actions.help'),
              control: {
                kind: 'switch',
                checked: settings.runActions,
                onChange: (next) => change({ runActions: next }),
                label: t('settings.workflow.actions.label'),
              },
            },
          ]}
        />
      </div>
    </div>
  )
}
