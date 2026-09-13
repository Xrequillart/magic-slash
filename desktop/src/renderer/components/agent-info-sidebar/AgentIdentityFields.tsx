import { EditableText } from '@ds/desktop'
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

/** Click-to-edit agent title. Enter saves, Escape cancels, blur saves. */
export function AgentTitleField({ identity }: { identity: AgentIdentity }) {
  const t = useT()

  return (
    <EditableText
      as="h2"
      variant="title"
      value={identity.title ?? ''}
      placeholder={t('agentInfo.addTitle')}
      editPlaceholder={t('agentInfo.titlePlaceholder')}
      editing={identity.isEditingTitle}
      draft={identity.editTitle}
      onDraftChange={identity.setEditTitle}
      onStartEditing={identity.startEditingTitle}
      onSave={identity.saveTitle}
      onCancel={() => identity.setIsEditingTitle(false)}
    />
  )
}

/**
 * Click-to-edit agent description. Enter saves, Shift+Enter is a newline, Escape
 * cancels, blur saves.
 *
 * ENTER RATHER THAN ⌘ENTER, and no Save button beside it. The button was the only way
 * out of this field that did not require knowing a shortcut, and it sat under a hint
 * that was hardcoded English — the one string in the sidebar the language switch never
 * reached. Enter is what the title field above has always done, and a description in
 * this card is a line or two, not a document: the multi-line case keeps Shift+Enter,
 * which is the convention every chat box in the app already trains.
 *
 * Blur saves too, which is what makes losing the button safe: clicking away from a
 * field with no button used to discard the edit.
 */
export function AgentDescriptionField({ identity }: { identity: AgentIdentity }) {
  const t = useT()

  return (
    <EditableText
      multiline
      value={identity.description ?? ''}
      placeholder={t('agentInfo.addDescription')}
      editPlaceholder={t('agentInfo.descriptionPlaceholder')}
      hint={t('agentInfo.descriptionHint')}
      editing={identity.isEditingDescription}
      draft={identity.editDescription}
      onDraftChange={identity.setEditDescription}
      onStartEditing={identity.startEditingDescription}
      onSave={identity.saveDescription}
      onCancel={() => identity.setIsEditingDescription(false)}
    />
  )
}
