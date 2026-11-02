import { describe, expect, it } from 'vitest'
import { formatDate, localDate } from '#shared/utils/dates'

describe('localDate', () => {
  it('gives the local calendar date as an ISO date', () => {
    expect(localDate(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05')
  })
})

describe('formatDate', () => {
  it('shows the day itself, whatever the time zone', () => {
    const formatted = formatDate('2026-01-05')

    expect(formatted).toMatch(/\b5\b/)
    expect(formatted).toContain('2026')
  })
})
