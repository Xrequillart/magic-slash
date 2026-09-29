import { describe, it, expect } from 'vitest'
import { en } from '../../i18n/en'
import { fr } from '../../i18n/fr'
import { SETTINGS_SEARCH_ENTRIES, foldForSearch, searchSettings } from './settingsSearch'

const item = (key: string, label: string, page = 'Page', help = '') => ({ key, label, page, help })

describe('foldForSearch', () => {
  it('folds case and accents', () => {
    expect(foldForSearch('Thème Réglé')).toBe('theme regle')
  })
})

describe('searchSettings', () => {
  const items = [
    item('a', 'Sidebar layout', 'Application', 'Where the agents list sits'),
    item('b', 'Theme', 'Appearance'),
    item('c', 'Agent waiting', 'Notifications', 'When an agent needs you'),
    item('d', 'Agent completed', 'Notifications'),
  ]

  it('finds nothing for a blank query', () => {
    expect(searchSettings(items, '   ')).toEqual([])
  })

  it('requires every word, anywhere in the name, page or help line', () => {
    expect(searchSettings(items, 'agent notif').map((i) => i.key)).toEqual(['c', 'd'])
    expect(searchSettings(items, 'agent completed').map((i) => i.key)).toEqual(['d'])
  })

  it('ranks a name match ahead of a help-line match', () => {
    expect(searchSettings(items, 'agent').map((i) => i.key)).toEqual(['c', 'd', 'a'])
  })

  it('ignores accents typed or not', () => {
    expect(searchSettings([item('x', 'Thème')], 'theme').map((i) => i.key)).toEqual(['x'])
  })
})

describe('SETTINGS_SEARCH_ENTRIES', () => {
  it('names only keys that both catalogues translate', () => {
    for (const { labelKey, helpKey } of SETTINGS_SEARCH_ENTRIES) {
      for (const key of [labelKey, helpKey].filter(Boolean) as (keyof typeof en)[]) {
        expect(en[key], key).toBeTruthy()
        expect(fr[key], key).toBeTruthy()
      }
    }
  })
})
