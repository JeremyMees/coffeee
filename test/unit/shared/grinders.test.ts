import { describe, expect, it } from 'vitest'
import { grinderName, groupedByGrinder } from '#shared/utils/grinders'

describe('grinderName', () => {
  it('names a grinder by its brand and model', () => {
    expect(grinderName({ brand: 'Fellow', model: 'Opus Gen 2' })).toBe(
      'Fellow Opus Gen 2',
    )
  })
})

describe('groupedByGrinder', () => {
  it('groups settings per grinder, keeping their order', () => {
    const settings = [
      { grinderId: 'opus', setting: '12' },
      { grinderId: 'c40', setting: '20' },
      { grinderId: 'opus', setting: '4' },
    ]

    expect(groupedByGrinder(settings)).toEqual([
      [
        { grinderId: 'opus', setting: '12' },
        { grinderId: 'opus', setting: '4' },
      ],
      [{ grinderId: 'c40', setting: '20' }],
    ])
  })
})
