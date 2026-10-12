import { describe, expect, it } from 'vitest'
import { placeQuickSetting } from './quickSettingsOrder'

const IDS = ['a', 'b', 'c', 'd']

describe('placeQuickSetting', () => {
  it('moves a tile one place to the right (dropped past its neighbour)', () => {
    expect(placeQuickSetting(IDS, 'a', 2)).toEqual(['b', 'a', 'c', 'd'])
  })

  it('moves a tile to the front and to the end', () => {
    expect(placeQuickSetting(IDS, 'c', 0)).toEqual(['c', 'a', 'b', 'd'])
    expect(placeQuickSetting(IDS, 'a', 4)).toEqual(['b', 'c', 'd', 'a'])
  })

  it('leaves the order alone when dropped on its own place', () => {
    expect(placeQuickSetting(IDS, 'b', 1)).toEqual(IDS)
    expect(placeQuickSetting(IDS, 'b', 2)).toEqual(IDS)
  })

  it('adds a tile that was not on the sheet where it lands', () => {
    expect(placeQuickSetting(IDS, 'e', 1)).toEqual(['a', 'e', 'b', 'c', 'd'])
    expect(placeQuickSetting([], 'e', 0)).toEqual(['e'])
  })

  it('clamps an index outside the list', () => {
    expect(placeQuickSetting(IDS, 'e', 99)).toEqual(['a', 'b', 'c', 'd', 'e'])
  })
})
