import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Maximize2 } from 'lucide-react'
import { useStore } from '../../store'
import FileContentRenderer from '../file-preview/FileContentRenderer'
import { StatusPill } from './StatusPill'
import { TicketMark } from './TicketMark'
import { AgentTitleField, AgentDescriptionField, type AgentIdentity } from './AgentIdentityFields'
import { shouldAutoFollow } from './utils'
import { useT } from '../../i18n'

interface SpecPanelProps {
  /**
   * Title and description, plus their editing state. In `replace` mode this panel
   * is the ONLY card on screen, so it carries the agent's identity that TicketHeader
   * would otherwise hold — read AND editable, so replacing the ticket card takes no
   * capability away.
   */
  identity: AgentIdentity
  /**
   * Names of the repositories attached to the agent, rendered inline after the card
   * label as `SPEC • magic-slash`. The repository CARDS are gone for a planning agent
   * — it has no branch, no diff and no PR for them to show — but which repository is
   * being planned against still matters.
   */
  repoNames: string[]
  status: string
  /** Present once `/magic:plan` has created the ticket, i.e. at `planned`. */
  ticketId?: string
  ticketLink: string | null
  ticketProvider: 'github' | 'jira' | null
  /** Directory of the spec, as `splitSpecPath` returns it. */
  repoPath: string
  /** Bare file name of the spec, as `splitSpecPath` returns it. */
  filePath: string
  /** From `usePlanSpec`; every bump re-reads the file in place. */
  refreshToken: number
  onStatusChange?: (status: string) => void
}

/**
 * The `/magic:plan` spec, live, in the info sidebar.
 *
 * Reads the LOCAL file at the agent's `metadata.specPath` through `config:readFile`
 * — never a cloud row — so it works with sync off and with no network. The signal
 * to re-read is the `plan:specChanged` IPC ping (see `usePlanSpec`); nothing here
 * watches the filesystem.
 *
 * It is a panel in the sidebar and NOT a modal on purpose: the terminal beside it
 * stays fully usable while the spec is being written, which a backdrop would take
 * away. The expand control hands the same file to the existing FilePreviewPanel
 * drawer for the moments a wider read is wanted.
 *
 * Give it `key={specPath}` so a new file starts fresh: expanded, and pinned to the
 * bottom of the NEW spec rather than wherever the previous one had been left.
 */
export function SpecPanel({
  identity,
  repoNames,
  status,
  ticketId,
  ticketLink,
  ticketProvider,
  repoPath,
  filePath,
  refreshToken,
  onStatusChange,
}: SpecPanelProps) {
  const t = useT()
  const setSelectedFile = useStore(s => s.setSelectedFile)

  const bodyRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  // The panel does not collapse. It is the only card a planning agent has, and the
  // spec being on screen without a click is the whole point — a fold would put the
  // one thing worth reading one interaction away.
  const [isFollowing, setIsFollowing] = useState(true)

  const pinToBottom = useCallback(() => {
    const body = bodyRef.current
    if (!body) return
    body.scrollTop = body.scrollHeight
  }, [])

  // Pin before the browser paints when the panel opens. The content itself lands
  // later, when the read resolves — that is what the observer below is for.
  useLayoutEffect(() => {
    if (!isFollowing) return
    pinToBottom()
  }, [isFollowing, pinToBottom])

  // The read is asynchronous, so the height that matters arrives after the effect
  // above has run. Observing our own wrapper — a node that survives every swap
  // FileContentRenderer makes between spinner, error and content — is what keeps
  // the view pinned as Claude Code appends to the file.
  useEffect(() => {
    const content = contentRef.current
    if (!content || !isFollowing) return

    const observer = new ResizeObserver(pinToBottom)
    observer.observe(content)
    return () => observer.disconnect()
  }, [isFollowing, pinToBottom])

  // Scrolling up releases the follow; scrolling back to the bottom re-arms it.
  const handleScroll = useCallback(() => {
    const body = bodyRef.current
    if (!body) return
    setIsFollowing(shouldAutoFollow({
      scrollTop: body.scrollTop,
      scrollHeight: body.scrollHeight,
      clientHeight: body.clientHeight,
    }))
  }, [])

  const handleExpand = useCallback(() => {
    // Empty status on purpose: the spec is not a git change, and any of the
    // `modified`/`added`/… values would send the read down the `git diff HEAD`
    // path in config:readFile and badge the file in the drawer.
    setSelectedFile({ repoPath, path: filePath, status: '' })
  }, [setSelectedFile, repoPath, filePath])

  return (
    // No `overflow-hidden` on the card: StatusPill's picker is an absolutely
    // positioned dropdown and would be clipped by it. The body rounds its own
    // bottom corners instead.
    <div className="bg-surface rounded-xl flex flex-col flex-1 min-h-0">
      {/* Same padding and rhythm as TicketHeader — p-4, mb-3 under the top row, mt-3
          between the fields — so the spec card and the ticket card read as one family
          rather than two. */}
      <div className="p-4 flex-shrink-0">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-text-secondary/50 flex-shrink-0">
              {t('agentInfo.spec.title')}
            </span>
            {/* `SPEC • magic-slash`. The repository cards are gone for a planning
                agent, so this is the only thing left saying what is being planned
                against — and it costs one line rather than a card. */}
            {repoNames.length > 0 && (
              <span className="text-[10px] text-text-secondary/50 truncate">
                • {repoNames.join(', ')}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {/* The ticket appears here at `planned`. TicketHeader never comes back for
                a planning agent, so without this the ticket `/magic:plan` just created
                would be unreachable from the sidebar. */}
            {ticketId && (
              ticketLink ? (
                <button
                  onClick={() => window.electronAPI.shell.openExternal(ticketLink)}
                  className="group flex items-center gap-1 text-ink text-xs font-semibold cursor-pointer bg-transparent border-none p-0"
                >
                  <TicketMark provider={ticketProvider} />
                  <span className="group-hover:underline">{ticketId}</span>
                </button>
              ) : (
                <span className="flex items-center gap-1 text-ink text-xs font-semibold">
                  <TicketMark provider={ticketProvider} />
                  {ticketId}
                </span>
              )
            )}
            {/* TicketHeader is not on screen for a planning agent, and it is the only
                other place that renders the status — without this the panel would
                REMOVE the marker that tells a planning agent from an implementation
                one. */}
            <StatusPill status={status} agentType="planner" onStatusChange={onStatusChange} />
            <button
              onClick={handleExpand}
              title={t('agentInfo.spec.open')}
              aria-label={t('agentInfo.spec.open')}
              className="-mr-1.5 p-1.5 rounded-md text-text-secondary hover:text-ink hover:bg-surface-strong transition-colors border-none cursor-pointer bg-transparent"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* The agent's identity, carried here because the spec card replaces the
            ticket card that normally holds it. */}
        <AgentTitleField identity={identity} />
        <div className="mt-3">
          <AgentDescriptionField identity={identity} />
        </div>
      </div>

      <div className="relative flex flex-col flex-1 min-h-0">
          <div
            ref={bodyRef}
            onScroll={handleScroll}
            className="overflow-y-auto rounded-b-xl border-t border-line flex-1 min-h-0"
          >
            <div ref={contentRef}>
              <FileContentRenderer
                repoPath={repoPath}
                filePath={filePath}
                status=""
                refreshToken={refreshToken}
                notFoundLabel={t('agentInfo.spec.drafting')}
              />
            </div>
          </div>
          {!isFollowing && (
            <button
              onClick={() => {
                setIsFollowing(true)
                pinToBottom()
              }}
              className="absolute bottom-3 right-3 z-10 bg-ink/15 hover:bg-ink/25 text-ink/70 px-3 py-1 rounded-full text-[10px] transition-all duration-200 border-none cursor-pointer"
            >
              {t('terminalView.scrollToBottom')}
            </button>
        )}
      </div>
    </div>
  )
}
