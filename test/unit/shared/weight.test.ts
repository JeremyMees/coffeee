import { describe, expect, it } from 'vitest'
import { formatWeight } from '#shared/utils/weight'

describe('formatWeight', () => {
  it('keeps less than a kilo in grams', () => {
    expect(formatWeight(750, 'en')).toBe('750 g')
  })

  it('shows a kilo or more in kilos, to a tenth', () => {
    expect(formatWeight(1000, 'en')).toBe('1 kg')
    expect(formatWeight(2250, 'en')).toBe('2.3 kg')
    expect(formatWeight(2250, 'nl-BE')).toBe('2,3 kg')
  })
})
