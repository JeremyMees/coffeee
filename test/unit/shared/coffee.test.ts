import { describe, expect, it } from 'vitest'
import { daysOffRoast, freshness } from '#shared/utils/coffee'

describe('daysOffRoast', () => {
  it('counts whole days since the roast date', () => {
    const today = new Date(2026, 10, 2, 23, 30)

    expect(daysOffRoast('2026-10-30', today)).toBe(3)
    expect(daysOffRoast('2026-11-02', today)).toBe(0)
  })

  it('counts across a change to summer time', () => {
    expect(daysOffRoast('2026-03-28', new Date(2026, 2, 30, 0, 30))).toBe(2)
  })
})

describe('freshness', () => {
  it.each([
    ['filter', 6, 'Resting'],
    ['filter', 7, 'Peak'],
    ['filter', 30, 'Peak'],
    ['filter', 31, 'Past peak'],
    ['omni', 9, 'Resting'],
    ['omni', 10, 'Peak'],
    ['omni', 36, 'Past peak'],
    ['espresso', 13, 'Resting'],
    ['espresso', 14, 'Peak'],
    ['espresso', 45, 'Peak'],
    ['espresso', 46, 'Past peak'],
  ] as const)('calls a %s roast %i days old %s', (roastedFor, days, label) => {
    expect(freshness(days, roastedFor)).toBe(label)
  })
})
