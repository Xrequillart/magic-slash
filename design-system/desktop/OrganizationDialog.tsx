import type { AnimationEvent } from 'react'
import { Button } from './Button'
import { Input } from './Input'
import { Mail, Plus, UserPlus } from './icons'
import { Modal } from './Modal'
import { ModalHeader } from './ModalHeader'
import { Select, type SelectOption } from './Select'
import { Text } from './Text'
import type { IconComponent } from './types'

/**
 * THE THREE ORGANIZATION DIALOGS: create one, join one, invite someone into one.
 *
 * They were three `Modal`s in the app's organization page, each with the same help line,
 * the same field and the same footer of two buttons spelled out class by class, a spinner
 * swapped in by hand. They are one drawing now, because they are one shape: a sentence
 * saying what happens, one field, and the answer. Inviting adds the role picker under the
 * field, and that is the whole difference.
 *
 * THE KIND PICKS THE DETAILS (`kind`), so a caller cannot pair the wrong ones: the submit
 * button's mark (a plus to create, a person to join, an envelope to invite) and the field's
 * type (an email address to invite, a name or a pasted link otherwise, in mono since it is
 * a token).
 *
 * ENTER SUBMITS, from the field, as it did. Escape and the exit animation stay the caller's,
 * on `Modal`'s terms: which of several open dialogs answers a key is a fact about the app's
 * layering, not about the shape of this one.
 *
 * DATA IN, CALLBACKS OUT. Every word arrives translated.
 */

export type OrganizationDialogKind = 'create' | 'join' | 'invite'

export interface OrganizationDialogProps {
  kind: OrganizationDialogKind
  /** "Create an organization", "Invite to Poppins". */
  title: string
  /** One line on what happens. */
  help: string
  field: {
    value: string
    onChange: (value: string) => void
    placeholder?: string
  }
  /** Inviting only: who the person will be once they accept. */
  role?: {
    label: string
    value: string
    options: SelectOption[]
    onChange: (value: string) => void
  }
  submit: {
    label: string
    onClick: () => void
    /** The request is out: the mark becomes a spinner and the button stops answering. */
    busy?: boolean
    disabled?: boolean
  }
  cancelLabel: string
  /** Cancel, the header's close button, and a press on the dimmed ground. */
  onCancel: () => void
  /** The header's close button tooltip. */
  closeTitle?: string
  /** The caller's enter and exit animation: see `Modal`, which owns neither. */
  backdropClassName?: string
  className?: string
  onAnimationEnd?: (event: AnimationEvent<HTMLDivElement>) => void
  /** Passed straight to `Modal`: see its note on why a drawing of the app needs it. */
  portalTo?: HTMLElement | null
}

const MARKS: Record<OrganizationDialogKind, IconComponent> = {
  create: Plus,
  join: UserPlus,
  invite: Mail,
}

/** The role picker's width, the members table's: one size for the same control. */
const ROLE_WIDTH = 112

export function OrganizationDialog({
  kind,
  title,
  help,
  field,
  role,
  submit,
  cancelLabel,
  onCancel,
  closeTitle,
  backdropClassName,
  className = '',
  onAnimationEnd,
  portalTo,
}: OrganizationDialogProps) {
  const blocked = submit.busy || submit.disabled
  const send = () => { if (!blocked) submit.onClick() }

  return (
    <Modal
      onClose={onCancel}
      backdropClassName={backdropClassName}
      onAnimationEnd={onAnimationEnd}
      portalTo={portalTo}
      className={`w-full max-w-md ${className}`.trim()}
    >
      <ModalHeader title={title} onClose={onCancel} closeTitle={closeTitle} gutter="wide" />
      <div className="flex flex-col gap-3 px-6 pb-6 pt-1">
        <Text size="sm" tone="secondary">{help}</Text>
        <Input
          type={kind === 'invite' ? 'email' : 'text'}
          mono={kind === 'join'}
          value={field.value}
          onChange={field.onChange}
          placeholder={field.placeholder}
          size="lg"
          autoFocus
          onKeyDown={(e) => { if (e.key === 'Enter') send() }}
          className="w-full"
        />
        {role && (
          <div className="flex items-center justify-between gap-3">
            <Text size="sm" tone="secondary">{role.label}</Text>
            <Select value={role.value} options={role.options} onChange={role.onChange} width={ROLE_WIDTH} />
          </div>
        )}
      </div>
      <div className="flex justify-end gap-2 px-6 pb-6">
        <Button tone="neutral" size="md" onClick={onCancel}>{cancelLabel}</Button>
        <Button
          tone="accent"
          size="md"
          icon={MARKS[kind]}
          busy={submit.busy}
          disabled={submit.disabled}
          onClick={send}
        >
          {submit.label}
        </Button>
      </div>
    </Modal>
  )
}
