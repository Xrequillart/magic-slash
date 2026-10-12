import { Avatar } from './Avatar'
import { Button } from './Button'
import { ButtonIcon } from './ButtonIcon'
import { Card } from './Card'
import { Icon } from './Icon'
import { Building2, Check, Copy, Trash2, X } from './icons'
import { Loader } from './Loader'
import { Select, type SelectOption } from './Select'
import { Status } from './Status'
import { Text } from './Text'

/**
 * ONE ORGANIZATION, WHOLE: who is in it, who has been asked, and the two ways out.
 *
 * It was written inside the settings page it is drawn on, which is where a card this
 * size usually starts, and it had reached the point every one of those reaches: seven
 * hand-built controls, three plates spelled by hand, two roster pills with their own
 * idea of what an accent tint is, and a members table whose column widths were tuned
 * against a page nobody else could see. None of that is about an organization.
 *
 * ── FOUR BANDS, AND THE ORDER IS THE COMPONENT ────────────────────────────────────
 *
 * The NAME, then the PEOPLE, then the people who have been asked and have not answered,
 * then what you can do that cannot be undone. A reader arrives asking "who is in this",
 * which is the second band and the tallest; the invitations are the same question about
 * the future, so they follow it rather than the name; and the destructive pair goes last
 * because a control you must not press by mistake belongs where the eye arrives last.
 *
 * ── EVERY BAND IS OPTIONAL EXCEPT THE FIRST TWO ───────────────────────────────────
 *
 * `invitations` is admin-only at the call site and simply absent otherwise — the card
 * does not know what an admin is, and should not: what it knows is that it was handed no
 * invitations to draw. The same goes for the role picker on a row, the remove button, and
 * the archive button. WHO MAY DO WHAT IS THE APP'S, and it arrives as the presence or
 * absence of a handler rather than as a permission this folder would have to interpret.
 *
 * ── THE ROLE IS EITHER A PILL OR A PICKER ─────────────────────────────────────────
 *
 * The same cell, and the difference is one prop: a member handed `roleOptions` gets
 * `Select`, and one without gets `Status` reading the role as a word. They stand at the
 * same 28px on purpose — a roster where the rows change height depending on whether you
 * happen to be an admin is a roster that moves under the cursor when you are promoted.
 */

/** One person in the organization, as the card draws them. */
export interface OrganizationCardMember {
  /** Stable across renders — the user id. Not an index. */
  id: string
  /** Who this is: their address, or whatever the app has. Already resolved. */
  name: string
  /**
   * Appended quiet after the name — "(you)", and nothing else so far.
   *
   * Translated, and part of the NAME rather than a column of its own: it is true of
   * exactly one row and a column holding one word would be a column of blanks.
   */
  note?: string
  /**
   * The face. `null` is somebody with no photo, which draws the default portrait;
   * absent is the same thing, so a caller with no avatars at all passes nothing.
   *
   * A DATA URL and never a remote one — the app's buckets are private and their only
   * web-facing form expires, so an `<img src>` pointed at one works for an hour and
   * then draws a broken box. That is the app's rule; this card just draws what it gets.
   */
  avatar?: string | null
  /**
   * The role's VALUE — what `roleOptions` are keyed by, and what `onRoleChange` hands
   * back. `admin`, `user`: an identifier, never shown.
   */
  role: string
  /**
   * The same role as a WORD, for the pill this row draws when it cannot be changed.
   *
   * Two fields and not one, because the app has two catalogues for this and the casing
   * differs between them: a pill reading `admin` in the middle of a sentence-shaped row,
   * and `Admin` on a control you press. Which is which is the app's decision, and a card
   * that derived one from the other would be making it.
   */
  roleLabel: string
  /** The loud one — the admin's tint. The card does not infer it from the word. */
  roleStrong?: boolean
  /**
   * Makes the role a PICKER. The options are the caller's and translated; absent, the
   * role is a pill and this row cannot be changed.
   */
  roleOptions?: SelectOption[]
  /** Handed the new role's value. Required in practice whenever `roleOptions` is given. */
  onRoleChange?: (value: string) => void
  /** The row is waiting on the server: the control becomes a spinner and nothing is pressable. */
  busy?: boolean
  /** Take this person out. Absent is not offered — yourself, or a reader who may not. */
  remove?: { title: string; onClick: () => void }
}

/** One invitation that still needs attention. Accepted ones are members, and are listed above. */
export interface OrganizationCardInvitation {
  id: string
  /** Who was asked. */
  email: string
  /** What became of it, translated: pending, expired, revoked. */
  status: string
  /** Pending is the one that is still live, and the only one that wears a colour. */
  pending?: boolean
  /**
   * Copy the link. `copied` is the app's own two-second flag — the card draws the tick
   * and the word, and knows nothing about when they go back.
   */
  copy?: { label: string; copiedLabel: string; title: string; copied: boolean; onClick: () => void }
  /** Withdraw it. */
  remove?: { title: string; onClick: () => void; busy?: boolean }
}

export interface OrganizationCardProps {
  /** The organization's name, in the band at the top. */
  name: string
  members: {
    /** The band's heading, translated. */
    label: string
    /** What stands where the rows would be when there are none. Translated. */
    empty: string
    rows: OrganizationCardMember[]
    /**
     * The three column names, for a screen reader alone.
     *
     * The table's own headers are `sr-only`: the rows read perfectly without them — a
     * face, an address, a role, a cross — and a visible header row above four people
     * would be a table pretending to be a spreadsheet. A screen reader still needs the
     * columns named, so they are said once, invisibly, and the caller translates them.
     */
    columns: { member: string; role: string; actions: string }
  }
  /**
   * The people who have been asked. ABSENT IS A STATE: a reader who may not see them is
   * handed none, and the band is not drawn at all.
   */
  invitations?: {
    label: string
    empty: string
    rows: OrganizationCardInvitation[]
    /** The control in the band's heading. */
    invite?: { label: string; onClick: () => void }
  }
  /** Leave. Absent where leaving is impossible — see `note`. */
  leave?: { label: string; onClick: () => void; busy?: boolean }
  /**
   * The line that stands where `leave` would be: the last admin cannot walk out without
   * locking everyone else out. Translated, and the app's sentence — this card does not
   * count admins.
   */
  note?: string
  /** Archive. The destructive one, and it sits at the far end for that reason. */
  archive?: { label: string; onClick: () => void }
  /** Margins and width. Not the ground, the radius or the bands. */
  className?: string
}

/**
 * A band's heading: what is under it, how many, and the one control that adds to it.
 *
 * `h-5` pinned, so a band with a button and a band without stand the same height and the
 * two headings line up down the card.
 */
function BandHeading({
  label,
  count,
  action,
}: {
  label: string
  count?: number
  action?: { label: string; onClick: () => void }
}) {
  return (
    <div className="mb-2 flex h-5 items-center justify-between">
      <div className="flex items-center gap-1.5">
        <Text size="2xs" tone="secondary" className="uppercase tracking-wider opacity-50">
          {label}
        </Text>
        {count !== undefined && (
          <Text size="2xs" tone="secondary" className="opacity-30">
            {String(count)}
          </Text>
        )}
      </div>
      {action && (
        <Button size="sm" tone="neutral" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  )
}

export function OrganizationCard({
  name,
  members,
  invitations,
  leave,
  note,
  archive,
  className = '',
}: OrganizationCardProps) {
  return (
    /* NO BORDER, where this had `border border-line-strong`: a hairline around a plate
       that is already a different colour from the page is the same thing said twice —
       `Button` states the rule, `AccountCard` and `RepositoryItem` learned it the same
       way. The rules INSIDE stay, because separating two bands that are both here is a
       different job from drawing a line around the whole.

       `overflow-hidden` so the bands' own edges stop at the radius. */
    <Card padding="none" className={`overflow-hidden ${className}`.trim()}>
      <div className="flex items-center gap-3 border-b border-line-subtle px-4 py-3">
        <span className="shrink-0 rounded-lg bg-accent/10 p-1.5">
          <Icon glyph={Building2} size="md" tone="inherit" className="text-accent" />
        </span>
        <Text size="sm" weight="medium" className="min-w-0 flex-1 truncate" title={name}>
          {name}
        </Text>
      </div>

      <div className="border-b border-line-subtle px-4 py-3">
        <BandHeading label={members.label} count={members.rows.length} />
        {members.rows.length === 0 ? (
          <Text size="xs" tone="secondary" className="block py-1 opacity-40">
            {members.empty}
          </Text>
        ) : (
          /* `-mx-1` gives the cells' own padding back to the band's, so the first face
             and the heading above it begin on the same x. The table scrolls sideways
             rather than squeezing: below its `min-w`, a role pill and a cross have
             nothing left to give and it is the address that would vanish. */
          <div className="-mx-1 overflow-x-auto">
            <table className="w-full min-w-[22rem] border-collapse text-left">
              <thead className="sr-only">
                <tr>
                  <th scope="col">{members.columns.member}</th>
                  <th scope="col">{members.columns.role}</th>
                  <th scope="col">{members.columns.actions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line-subtle">
                {members.rows.map((member) => (
                  <tr key={member.id}>
                    {/* `max-w-0` lets a long address truncate instead of widening the
                        column past the card, and `min-w-0` on the row inside it is what
                        makes that truncation actually happen: a flex child defaults to
                        its content's minimum width. */}
                    <td className="max-w-0 px-1 py-2">
                      <div className="flex min-w-0 items-center gap-2">
                        {/* `md` — 24px, sized UNDER the 28px control it shares the row
                            with rather than at it, so adding faces does not make every
                            roster taller. `alt=""` on purpose: the address beside it
                            already names the person, and an alt repeating the adjacent
                            label makes a screen reader say them twice per row. */}
                        <Avatar src={member.avatar ?? null} alt="" size="md" fallback="portrait" />
                        {/* Two spans and not one string: `Text` takes words, never a
                            node, so the quiet "(you)" is its own.

                            NOT A FLEX ROW, which is the whole reason this is written out
                            rather than reached for. The note arrives with its own leading
                            space — the caller's to write, because only the caller knows
                            whether its language puts one there — and a flex container
                            eats it: leading whitespace is stripped at the start of every
                            flex item. In normal inline flow it survives, which is what
                            the two spans are laid out in. */}
                        <span className="block min-w-0 truncate" title={member.name}>
                          <Text size="sm">{member.name}</Text>
                          {member.note && (
                            <Text size="sm" tone="secondary" className="opacity-40">
                              {member.note}
                            </Text>
                          )}
                        </span>
                      </div>
                    </td>
                    <td className="w-px whitespace-nowrap px-1 py-2">
                      {member.busy ? (
                        <Loader variant="spin" size="sm" tone="muted" />
                      ) : member.roleOptions && member.onRoleChange ? (
                        <Select
                          value={member.role}
                          options={member.roleOptions}
                          onChange={member.onRoleChange}
                          width={112}
                          ariaLabel={members.columns.role}
                        />
                      ) : (
                        <Status
                          label={member.roleLabel}
                          tone={member.roleStrong ? 'accent' : 'neutral'}
                          strength="strong"
                          size="md"
                        />
                      )}
                    </td>
                    <td className="w-px px-1 py-2">
                      {member.remove && !member.busy && (
                        /* `md` — 28px, the rung the role control beside it stands on.
                           `ButtonIcon` defaults to `sm`, which is 24: a square four
                           pixels shorter than the picker it shares a row with reads as a
                           control that failed to line up rather than as a quieter one. */
                        <ButtonIcon
                          icon={X}
                          size="md"
                          tone="danger"
                          title={member.remove.title}
                          onClick={member.remove.onClick}
                        />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {invitations && (
        <div className="border-b border-line-subtle px-4 py-3">
          <BandHeading
            label={invitations.label}
            count={invitations.rows.length}
            action={invitations.invite}
          />
          {invitations.rows.length === 0 ? (
            <Text size="xs" tone="secondary" className="block py-1 opacity-40">
              {invitations.empty}
            </Text>
          ) : (
            <div className="flex flex-col gap-1">
              {invitations.rows.map((invitation) => (
                <div key={invitation.id} className="flex items-center gap-2 py-0.5">
                  <Text size="sm" className="min-w-0 flex-1 truncate" title={invitation.email}>
                    {invitation.email}
                  </Text>
                  {/* Pending is the only one still live, so it is the only one that wears
                      a colour; expired and revoked are facts about the past. */}
                  <Status
                    label={invitation.status}
                    tone={invitation.pending ? 'yellow' : 'neutral'}
                    size="md"
                  />
                  {invitation.copy && (
                    /* `sm` — 28px on `Button`'s ladder, which is where the status pill
                       and the bin beside it stand. The ladders do not share a rung NAME
                       across components (a 28px button is `sm`, a 28px `ButtonIcon` and
                       a 28px `Status` are both `md`), so a row is lined up by its
                       HEIGHT rather than by matching the words. */
                    <Button
                      size="sm"
                      tone="neutral"
                      icon={invitation.copy.copied ? Check : Copy}
                      title={invitation.copy.title}
                      onClick={invitation.copy.onClick}
                    >
                      {invitation.copy.copied ? invitation.copy.copiedLabel : invitation.copy.label}
                    </Button>
                  )}
                  {invitation.remove && (
                    // `md` for the roster's reason: the status pill and the copy button
                    // on this row are both 28px.
                    <ButtonIcon
                      icon={Trash2}
                      size="md"
                      tone="danger"
                      title={invitation.remove.title}
                      busy={invitation.remove.busy}
                      onClick={invitation.remove.onClick}
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* The two ways out. `ml-auto` on the archive holds it at the far edge whether or
          not there is a Leave button beside it: they are not a pair to choose between. */}
      <div className="flex items-center gap-2 px-4 py-3">
        {note && (
          <Text size="xs" tone="secondary" className="opacity-50">
            {note}
          </Text>
        )}
        {leave && (
          <Button size="md" tone="neutral" onClick={leave.onClick} busy={leave.busy}>
            {leave.label}
          </Button>
        )}
        {archive && (
          <Button size="md" tone="danger" onClick={archive.onClick} className="ml-auto">
            {archive.label}
          </Button>
        )}
      </div>
    </Card>
  )
}
