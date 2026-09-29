import { useState, useCallback } from 'react'

export interface SkillInfo {
  name: string
  dirName: string
  description: string
  allowedTools: string
  argumentHint?: string
  isBuiltIn: boolean
  hasImage: boolean
  imagePath?: string
}

export interface SkillDetail extends SkillInfo {
  content: string
  isRepoSkill?: boolean
  repoName?: string
  repoColor?: string
  /** Where the file lives. Only repo skills carry it — user skills are under ~/.claude/skills. */
  filePath?: string
}

export interface RepoSkillInfo {
  name: string
  description: string
  allowedTools: string
  argumentHint?: string
  repoName: string
  repoColor?: string
  format: 'skill' | 'command'
  filePath: string
}

/**
 * One entry of the listing Claude Code injects every turn, as `skills:listingEntries`
 * reads it (see main/skills-listing.ts). Wider than `skills` + `repoSkills`: plugins count.
 */
export interface ListingEntry {
  name: string
  /** `description` and `when_to_use` joined. Uncapped. */
  text: string
  source: 'built-in' | 'custom' | 'repo' | 'plugin'
  mode: 'full' | 'name-only' | 'hidden'
  origin?: string
}

export interface ListingSettings {
  budgetFraction?: number
  maxDescChars?: number
  fixedCharBudget?: number
}

export interface Listing {
  entries: ListingEntry[]
  settings: ListingSettings
}

export function useSkills() {
  const [skills, setSkills] = useState<SkillInfo[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [repoSkills, setRepoSkills] = useState<RepoSkillInfo[]>([])
  const [repoSkillsLoading, setRepoSkillsLoading] = useState(false)

  const loadSkills = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await window.electronAPI.skills.list()
      setSkills(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }, [])

  const loadRepoSkills = useCallback(async () => {
    setRepoSkillsLoading(true)
    try {
      const result = await window.electronAPI.skills.listRepoSkills()
      setRepoSkills(result)
    } catch {
      // Silently fail — repo skills are supplementary
    } finally {
      setRepoSkillsLoading(false)
    }
  }, [])

  const getSkill = useCallback(async (name: string): Promise<SkillDetail> => {
    return window.electronAPI.skills.get(name)
  }, [])

  const getRepoSkill = useCallback(async (filePath: string): Promise<SkillDetail> => {
    return window.electronAPI.skills.getRepoSkill(filePath)
  }, [])

  const createSkill = useCallback(async (name: string, content: string, imagePath?: string) => {
    await window.electronAPI.skills.create(name, content, imagePath)
    await loadSkills()
  }, [loadSkills])

  const updateSkill = useCallback(async (name: string, content: string, imagePath?: string) => {
    await window.electronAPI.skills.update(name, content, imagePath)
    await loadSkills()
  }, [loadSkills])

  const deleteSkill = useCallback(async (name: string) => {
    await window.electronAPI.skills.delete(name)
    await loadSkills()
  }, [loadSkills])

  const getImage = useCallback(async (name: string): Promise<string | null> => {
    return window.electronAPI.skills.getImage(name)
  }, [])

  const downloadSkill = useCallback(async (name: string) => {
    return window.electronAPI.skills.download(name)
  }, [])

  const importSkill = useCallback(async (): Promise<{ success: boolean; name?: string; canceled?: boolean }> => {
    const result = await window.electronAPI.skills.import()
    if (result.success) {
      await loadSkills()
    }
    return result
  }, [loadSkills])

  const pickImage = useCallback(async (): Promise<string | null> => {
    return window.electronAPI.dialog.openFile()
  }, [])

  return {
    skills,
    loading,
    error,
    loadSkills,
    getSkill,
    createSkill,
    updateSkill,
    deleteSkill,
    getImage,
    downloadSkill,
    importSkill,
    pickImage,
    repoSkills,
    repoSkillsLoading,
    loadRepoSkills,
    getRepoSkill,
  }
}
