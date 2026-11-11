import { describe, expect, it } from 'vitest'
import { formatNumber, pickLocale } from '#shared/utils/locale'

describe('pickLocale', () => {
  it('takes the first language the browser prefers', () => {
    expect(pickLocale('nl-BE,nl;q=0.9,en;q=0.8')).toBe('nl-BE')
  })

  it('skips tags it cannot use', () => {
    expect(pickLocale('*,not a tag,en-GB')).toBe('en-GB')
  })

  it('falls back to English without a preference', () => {
    expect(pickLocale(undefined)).toBe('en')
    expect(pickLocale('')).toBe('en')
  })
})

describe('formatNumber', () => {
  it('writes the number the way the locale does', () => {
    expect(formatNumber(1234.5, 'en')).toBe('1,234.5')
    expect(formatNumber(1234.5, 'de')).toBe('1.234,5')
  })
})
