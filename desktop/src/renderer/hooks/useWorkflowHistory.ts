import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { EMPTY_WORKFLOW_HISTORY, type WorkflowHistoryRead } from '../../types'

const BRIDGE_FAILED: WorkflowHistoryRead = { ...EMPTY_WORKFLOW_HISTORY, failed: true }

/**
 * A repository's workflow history, read only while the editor's panel is open.
 *
 * `usePlanHistory`'s shape: `read` is `null` while the FIRST read for this repository is in
 * flight, and an answer for a repository the reader has since left is dropped. `version`
 * is the editor saying something changed (a save of the flow, a change of the start
 * settings): the history is read again QUIETLY, what is on screen staying until the new
 * answer replaces it.
 */
export function useWorkflowHistory(repoName: string, open: boolean, version: string) {
  const [read, setRead] = useState<WorkflowHistoryRead | null>(null)
  const repoRef = useRef(repoName)
  repoRef.current = repoName
  const latestRef = useRef(0)

  const load = useCallback(async (name: string) => {
    const request = ++latestRef.current
    const next = await window.electronAPI.config.getRepositoryWorkflowHistory(name).catch(() => BRIDGE_FAILED)
    if (repoRef.current === name && latestRef.current === request) setRead(next)
  }, [])

  // Opened, or another repository: start from nothing, loudly.
  useEffect(() => {
    setRead(null)
    if (open) void load(repoName)
  }, [repoName, open, load])

  // Something changed while it is open: read again, quietly.
  const seenVersion = useRef(version)
  useEffect(() => {
    if (seenVersion.current === version) return
    seenVersion.current = version
    if (open) void load(repoRef.current)
  }, [version, open, load])

  const retry = useCallback(() => {
    setRead(null)
    void load(repoRef.current)
  }, [load])

  return useMemo(() => ({ read, retry }), [read, retry])
}
