import { describe, it, expect } from 'vitest'
import { foldForSearch, searchSettings } from './settingsSearch'

const item = (key: string, label: string, page = 'Page', help = '', options: string[] = []) => ({
  key,
  label,
  page,
  help,
  options,
})

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

describe('searchSettings, by choice', () => {
  const items = [
    item('theme', 'Theme', 'Appearance', '', ['Dark', 'Midnight', 'Espresso']),
    item('mode', 'Launch mode', 'Sessions', 'Accept edits without asking', ['Plan', 'Accept edits']),
  ]

  it('finds a setting by one of its choices, and says which', () => {
    expect(searchSettings(items, 'midnight')).toEqual([{ ...items[0], option: 'Midnight' }])
  })

  it('lets the words span the name and the choice', () => {
    expect(searchSettings(items, 'theme espresso')).toEqual([{ ...items[0], option: 'Espresso' }])
    expect(searchSettings(items, 'mode plan').map((hit) => hit.option)).toEqual(['Plan'])
  })

  it('ranks a choice ahead of the help line', () => {
    expect(searchSettings(items, 'accept edits')[0].option).toBe('Accept edits')
  })
})
