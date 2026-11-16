import { describe, expect, it } from 'vitest'
import { daysOffRoast, freshness, isFrozen } from '#shared/utils/coffee'

describe('daysOffRoast', () => {
  it('counts whole days since the roast date', () => {
    const today = new Date(2026, 10, 2, 23, 30)

    expect(daysOffRoast({ roastedOn: '2026-10-30' }, today)).toBe(3)
    expect(daysOffRoast({ roastedOn: '2026-11-02' }, today)).toBe(0)
  })

  it('counts across a change to summer time', () => {
    expect(
      daysOffRoast({ roastedOn: '2026-03-28' }, new Date(2026, 2, 30, 0, 30)),
    ).toBe(2)
  })

  it('stops counting while the coffee is in the freezer', () => {
    const roast = { roastedOn: '2026-10-01', frozenOn: '2026-10-13' }

    expect(daysOffRoast(roast, new Date(2026, 10, 2))).toBe(12)
    expect(daysOffRoast(roast, new Date(2026, 11, 25))).toBe(12)
  })

  it('counts on from the day the coffee was thawed', () => {
    const roast = {
      roastedOn: '2026-10-01',
      frozenOn: '2026-10-13',
      thawedOn: '2026-10-30',
    }

    expect(daysOffRoast(roast, new Date(2026, 9, 30))).toBe(12)
    expect(daysOffRoast(roast, new Date(2026, 10, 2))).toBe(15)
  })

  it('counts every day of a coffee frozen and thawed on the same day', () => {
    const roast = {
      roastedOn: '2026-10-30',
      frozenOn: '2026-10-31',
      thawedOn: '2026-10-31',
    }

    expect(daysOffRoast(roast, new Date(2026, 10, 2))).toBe(3)
  })

  it('ignores freezer days before the roast or after today', () => {
    const today = new Date(2026, 10, 2)

    expect(
      daysOffRoast({ roastedOn: '2026-10-30', frozenOn: '2026-10-20' }, today),
    ).toBe(0)
    expect(
      daysOffRoast({ roastedOn: '2026-10-30', frozenOn: '2026-11-10' }, today),
    ).toBe(3)
    expect(
      daysOffRoast(
        {
          roastedOn: '2026-10-30',
          frozenOn: '2026-11-01',
          thawedOn: '2026-11-20',
        },
        today,
      ),
    ).toBe(2)
  })
})

describe('isFrozen', () => {
  it('is frozen from the freeze date until it is thawed', () => {
    expect(isFrozen({ frozenOn: '2026-10-13', thawedOn: null })).toBe(true)
    expect(isFrozen({ frozenOn: '2026-10-13', thawedOn: '2026-10-30' })).toBe(
      false,
    )
    expect(isFrozen({ frozenOn: null, thawedOn: null })).toBe(false)
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
