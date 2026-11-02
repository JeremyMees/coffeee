import { describe, expect, it } from 'vitest'
import { nameKey } from '#shared/utils/names'

describe('nameKey', () => {
  it('gives names that differ only in case, spacing or hyphens one key', () => {
    expect(nameKey('costa rica')).toBe('costa rica')
    expect(nameKey('Costa  Rica')).toBe('costa rica')
    expect(nameKey('COSTA-RICA')).toBe('costa rica')
  })

  it('strips accents', () => {
    expect(nameKey('Café Señor')).toBe('cafe senor')
  })

  it('ignores spaces around a name', () => {
    expect(nameKey('  Square Mile ')).toBe('square mile')
  })

  it('keeps different names apart', () => {
    expect(nameKey('Costa Rica')).not.toBe(nameKey('Costa Rican'))
  })
})
