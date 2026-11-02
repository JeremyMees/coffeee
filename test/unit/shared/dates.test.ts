import { describe, expect, it } from 'vitest'
import { localDate } from '#shared/utils/dates'

describe('localDate', () => {
  it('gives the local calendar date as an ISO date', () => {
    expect(localDate(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05')
  })
})
