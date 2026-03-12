import { useMemo } from 'react'
import { useStore } from '../store'
import type { TerminalInfo } from '../../types'

export interface MultiProjectTerminal extends TerminalInfo {
  matchingProjects: string[]
}

export function useGroupedTerminals() {
  const { terminals, config } = useStore()

  return useMemo(() => {
    const noProject: TerminalInfo[] = []
    const multiProject: MultiProjectTerminal[] = []
    const byProject: Record<string, TerminalInfo[]> = {}
    const projectNames: string[] = []

    // Initialize projects
    if (config) {
      for (const repoName of Object.keys(config.repositories)) {
        byProject[repoName] = []
        projectNames.push(repoName)
      }
    }

    // Group terminals by project
    for (const terminal of terminals) {
      const repos = terminal.repositories || []
      const matchingProjects: string[] = []

      if (config) {
        for (const [repoName, repoConfig] of Object.entries(config.repositories)) {
          const matchesProject = repos.some(repo => repo.startsWith(repoConfig.path))
          if (matchesProject) {
            matchingProjects.push(repoName)
          }
        }
      }

      if (matchingProjects.length === 0) {
        noProject.push(terminal)
      } else if (matchingProjects.length === 1) {
        byProject[matchingProjects[0]].push(terminal)
      } else {
        // Multi-project agent
        multiProject.push({ ...terminal, matchingProjects })
      }
    }

    // Flattened visual order for navigation (deduplicate terminals)
    const seenIds = new Set<string>()
    const flatVisualOrder: TerminalInfo[] = []

    for (const terminal of noProject) {
      if (!seenIds.has(terminal.id)) {
        seenIds.add(terminal.id)
        flatVisualOrder.push(terminal)
      }
    }

    for (const terminal of multiProject) {
      if (!seenIds.has(terminal.id)) {
        seenIds.add(terminal.id)
        flatVisualOrder.push(terminal)
      }
    }

    for (const projectTerminals of Object.values(byProject)) {
      for (const terminal of projectTerminals) {
        if (!seenIds.has(terminal.id)) {
          seenIds.add(terminal.id)
          flatVisualOrder.push(terminal)
        }
      }
    }

    return { noProject, multiProject, byProject, projectNames, flatVisualOrder }
  }, [terminals, config])
}
