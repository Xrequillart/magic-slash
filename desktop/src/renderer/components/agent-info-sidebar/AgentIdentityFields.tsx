import { EditableText, type EditableTextProps } from '@ds/desktop'
import { useT } from '../../i18n'

/**
 * The agent's title and description, and everything needed to edit them in place.
 *
 * Bundled into one object rather than spread over a dozen props because two
 * components now render these fields — TicketHeader for an implementation agent,
 * SpecPanel for a planning one, which has no ticket card to carry them. Passing
 * them individually meant fourteen props at each call site, and the second caller
 * would have doubled that.
 *
 * The editing state lives in AgentInfoSidebar rather than here: a field can be
 * open for editing while the agent is switched, and the sidebar is what resets it.
 *
 * THE DRAWING IS `EditableText`, in the design system — the ground that appears on
 * hover and stays for the edit, the pencil that reserves the column the text wraps
 * against, the box that grows to its content, and the rule that nothing moves when a
 * field opens. What is left in this file is which of the two readings each field is,
 * and the four strings it needs in the reader's language.
 */
export interface AgentIdentity {
  title?: string
  description?: string
  isEditingTitle: boolean
  isEditingDescription: boolean
  editTitle: string
  editDescription: string
  setEditTitle: (v: string) => void
  setEditDescription: (v: string) => void
  startEditingTitle: () => void
  startEditingDescription: () => void
  saveTitle: () => void
  saveDescription: () => void
  setIsEditingTitle: (v: boolean) => void
  setIsEditingDescription: (v: boolean) => void
}

/** What `EditableText` needs, minus everything the two presets below decide. */
type FieldProps = Omit<EditableTextProps, 'variant' | 'multiline' | 'as' | 'className'>

/**
 * The two fields, as props.
 *
 * A HOOK BESIDE THE TWO COMPONENTS, for the reason the ticket badge and the status
 * have one: `TitleAgentCard` takes both fields as data, and the spec panel renders the
 * title on its own. One resolution, so the strings and the keyboard rules cannot
 * differ between an implementation agent and a planning one.
 */
export function useAgentIdentityFields(identity: AgentIdentity): {
  title: FieldProps
  description: FieldProps
} {
  const t = useT()

  return {
    title: {
      value: identity.title ?? '',
      placeholder: t('agentInfo.addTitle'),
      editPlaceholder: t('agentInfo.titlePlaceholder'),
      editing: identity.isEditingTitle,
      draft: identity.editTitle,
      onDraftChange: identity.setEditTitle,
      onStartEditing: identity.startEditingTitle,
      onSave: identity.saveTitle,
      onCancel: () => identity.setIsEditingTitle(false),
    },
    description: {
      value: identity.description ?? '',
      placeholder: t('agentInfo.addDescription'),
      editPlaceholder: t('agentInfo.descriptionPlaceholder'),
      // ENTER RATHER THAN ⌘ENTER, and no Save button beside it. The button was the only
      // way out that did not require knowing a shortcut, and it sat under a hint that
      // was hardcoded English — the one string in the sidebar the language switch never
      // reached. Enter is what the title does; the multi-line case keeps Shift+Enter,
      // which every chat box in the app already trains.
      hint: t('agentInfo.descriptionHint'),
      editing: identity.isEditingDescription,
      draft: identity.editDescription,
      onDraftChange: identity.setEditDescription,
      onStartEditing: identity.startEditingDescription,
      onSave: identity.saveDescription,
      onCancel: () => identity.setIsEditingDescription(false),
    },
  }
}

/** Click-to-edit agent title, for a caller that draws the field itself. */
export function AgentTitleField({ identity }: { identity: AgentIdentity }) {
  return <EditableText as="h2" variant="title" {...useAgentIdentityFields(identity).title} />
}

/** Click-to-edit agent description, for a caller that draws the field itself. */
export function AgentDescriptionField({ identity }: { identity: AgentIdentity }) {
  return <EditableText multiline {...useAgentIdentityFields(identity).description} />
}
