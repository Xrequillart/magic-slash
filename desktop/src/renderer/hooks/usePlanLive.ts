import { useEffect, useRef, useState } from 'react'
import type { PlanPresenceMember } from '../../types'

/**
 * The open plan, live (#306): who else has it open, and a call whenever its spec or its
 * comments move.
 *
 * THE CHANNELS ARE THE MAIN PROCESS'S. This asks for the plan on mount (`plans.live.open`)
 * and gives it back on unmount; main joins, tracks the reader, and relays. Nothing here
 * holds a socket or a token, which is the whole point of the split.
 *
 * PAYLOAD-BLIND, like the channel: `onSpecChanged` and `onCommentsChanged` say "read it
 * again", and the page re-reads through the channels it opened the plan with. A comment
 * DELETE cannot be scoped to one plan by the database, so it arrives with the comment's id
 * and the page decides whether it is one of its own.
 *
 * Keyed on the SESSION the detail read came back with, like the comments: a plan that turned
 * out not to be visible has no session, and joining its channel would be refused anyway.
 *
 * The channel health is not returned: `LiveIndicator` reads it from main itself, since it
 * sits in the modal's header, outside this page.
 */
export interface PlanLiveHandlers {
  /** The session row moved: its spec, its status, who may edit it. */
  onSpecChanged: () => void
  /** A comment was written or edited, or `deletedId` was deleted (on this plan or another). */
  onCommentsChanged: (deletedId?: string) => void
}

export function usePlanLive(sessionId: string | undefined, handlers: PlanLiveHandlers): PlanPresenceMember[] {
  const [members, setMembers] = useState<PlanPresenceMember[]>([])
  /**
   * The latest handlers, read at the moment an event lands. A ref rather than a dependency:
   * the page rebuilds them on every render, and re-joining the plan's channels each time
   * would be a leave and a join per keystroke.
   */
  const handlersRef = useRef(handlers)
  handlersRef.current = handlers

  useEffect(() => {
    setMembers([])
    if (!sessionId) return
    const live = window.electronAPI.plans.live
    // Every event names its plan: one about the plan just left must not land on this one.
    const offPresence = live.onPresence((presence) => {
      if (presence.sessionId === sessionId) setMembers(presence.members)
    })
    const offChanged = live.onChanged((change) => {
      if (change.sessionId !== sessionId) return
      if (change.kind === 'spec') handlersRef.current.onSpecChanged()
      else handlersRef.current.onCommentsChanged(change.deletedId)
    })
    live.open(sessionId).catch(() => { /* the page still works without the live view */ })
    return () => {
      offPresence()
      offChanged()
      live.close(sessionId).catch(() => {})
    }
  }, [sessionId])

  return members
}
