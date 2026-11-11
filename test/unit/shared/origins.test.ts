import { describe, expect, it } from 'vitest'
import {
  formatAltitude,
  isOriginCode,
  originCodes,
  originName,
  origins,
} from '#shared/utils/origins'

describe('origins', () => {
  it('lists every country by its ISO code', () => {
    expect(originCodes).toHaveLength(249)
    expect(origins.CO).toBe('Colombia')
    expect(origins.CD).toBe('DR Congo')
  })

  it('knows which codes are countries', () => {
    expect(isOriginCode('ET')).toBe(true)
    expect(isOriginCode('XX')).toBe(false)
    expect(isOriginCode('toString')).toBe(false)
  })

  it('names a country by its code', () => {
    expect(originName('ET')).toBe('Ethiopia')
    expect(originName('XX')).toBe('XX')
  })
})

describe('formatAltitude', () => {
  it('shows a range, a single height or nothing', () => {
    expect(formatAltitude(1700, 2100, 'en')).toBe('1,700–2,100 m')
    expect(formatAltitude(1850, 1850, 'en')).toBe('1,850 m')
    expect(formatAltitude(null, null, 'en')).toBeNull()
  })
})
