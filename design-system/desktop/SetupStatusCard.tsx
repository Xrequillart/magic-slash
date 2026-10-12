import { ButtonIcon } from './ButtonIcon'
import { Card } from './Card'
import { CircleCheck, CircleX, RefreshCw } from './icons'
import { Loader } from './Loader'
import { Text } from './Text'

/**
 * THE MACHINE'S VERDICT IN ONE ROW — three points of pill and one of button, on the
 * quick-settings sheet.
 *
 * The settings page has a whole card for the machine's setup: the tools, the MCP
 * servers, the skills, each with its reason and its repair. This is that card's first
 * line and nothing else — a mark, two words, and the way to the card. A verdict you
 * cannot act on is a worry rather than a status, so the pill is a BUTTON and pressing
 * it goes where the fixes are; the caller says where.
 *
 * FOUR STATES AND NOT A BOOLEAN. `checking` is the spinner — the moment the words on
 * screen are known to be stale, so nothing stale is on screen. `ready` and `issues`
 * are the answer. `failed` is the check itself not coming back, which is a different
 * thing from "something is missing" and wears the same red because both need the same
 * click. The WORDS are the caller's and translated: "2 to fix" is a count the caller
 * made and a sentence in its language.
 *
 * TWO GRID CHILDREN, NOT ONE. It renders a fragment — the pill spanning three columns
 * and the refresh button on the fourth — because it is laid on `ControlCenterGroup`'s
 * four-point grid and the two have to be its direct children: for the widths, and for
 * the bubbles, which pop each direct child in turn.
 */

export type SetupState = 'checking' | 'ready' | 'issues' | 'failed'

export interface SetupStatusCardProps {
  state: SetupState
  /** The two words for the state. Translated — the caller knows the count. */
  label: string
  /** The pill's tooltip and accessible name: what pressing it opens. Translated. */
  openTitle: string
  onOpen: () => void
  /** The refresh button's name. Translated. */
  refreshTitle: string
  onRefresh: () => void
}

export function SetupStatusCard({ state, label, openTitle, onOpen, refreshTitle, onRefresh }: SetupStatusCardProps) {
  const checking = state === 'checking'
  return (
    <>
      <Card ground="raised" padding="none" shape="pill" className="col-span-3 h-10 w-full overflow-hidden">
        <button
          type="button"
          title={openTitle}
          aria-label={`${label}. ${openTitle}`}
          onClick={onOpen}
          className="flex h-full w-full items-center gap-2 px-3 text-left transition-[filter] hover:brightness-125"
        >
          {/* `tone="inherit"` and no `label` on the loader: the pill's own words say
              "checking", and a second voice would say it twice. */}
          {checking ? (
            <Loader variant="spin" size="sm" tone="inherit" />
          ) : state === 'ready' ? (
            <CircleCheck className="h-4 w-4 shrink-0 text-green" />
          ) : (
            <CircleX className="h-4 w-4 shrink-0 text-red" />
          )}
          <Text size="xs" weight="medium" className="min-w-0 flex-1 truncate">
            {label}
          </Text>
        </button>
      </Card>
      {/* `busy` while checking: the arrow becomes the loader and the click is blocked,
          so a re-check cannot be queued behind a re-check. */}
      <ButtonIcon icon={RefreshCw} title={refreshTitle} onClick={onRefresh} busy={checking} tone="solid" size="2xl" round />
    </>
  )
}
