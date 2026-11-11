import { describe, expect, it } from 'vitest'
import {
  formatDate,
  formatDateTime,
  formatDayMonth,
  localDate,
} from '#shared/utils/dates'

describe('localDate', () => {
  it('gives the local calendar date as an ISO date', () => {
    expect(localDate(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05')
  })
})

describe('formatDate', () => {
  it('shows the day itself, whatever the time zone', () => {
    const formatted = formatDate('2026-01-05', 'en-US')

    expect(formatted).toMatch(/\b5\b/)
    expect(formatted).toContain('2026')
  })

  it('orders the date the way the locale does', () => {
    expect(formatDate('2026-11-10', 'en-US')).toBe('Nov 10, 2026')
    expect(formatDate('2026-11-10', 'en-GB')).toBe('10 Nov 2026')
  })
})

describe('formatDayMonth', () => {
  it('shows the day and month without the year', () => {
    expect(formatDayMonth('2026-11-10T12:00:00', 'en-GB')).toBe('10 Nov')
  })
})

describe('formatDateTime', () => {
  it('shows the day, month and time', () => {
    const formatted = formatDateTime('2026-11-10T14:05:00', 'en-GB')

    expect(formatted).toContain('10 Nov')
    expect(formatted).toContain('14:05')
  })
})
