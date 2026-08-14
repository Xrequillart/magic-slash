'use client'

import { createContext, useContext } from 'react'
import type { UserSettings, UserSettingsPatch } from '@/lib/settings'

/**
 * The settings the Application tabs read and write.
 *
 * A context rather than props because each tab is now its OWN ROUTE: the layout
 * owns the row, the fetch and the write queue, and the pages under it are what
 * Next renders into `children` — there is no call site to pass props at. It also
 * means switching tabs costs nothing, since the layout does not remount.
 *
 * No default value: a `useAppSettings()` outside the provider is a bug (a tab
 * rendered somewhere other than under /application), and it should say so rather
 * than hand back an empty object that silently saves nothing.
 */
export interface SettingsContextValue {
  settings: UserSettings
  /** Saves one changed setting; optimistic, queued, and rolled back on failure. */
  patch: (patch: UserSettingsPatch) => void
}

const SettingsContext = createContext<SettingsContextValue | null>(null)

export const SettingsProvider = SettingsContext.Provider

export function useAppSettings(): SettingsContextValue {
  const value = useContext(SettingsContext)
  if (!value) throw new Error('useAppSettings must be used inside the /application layout')
  return value
}
