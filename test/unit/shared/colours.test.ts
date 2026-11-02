import { describe, expect, it } from 'vitest'
import { bagColours, inkOn } from '#shared/utils/colours'

describe('inkOn', () => {
  it('uses off-white text on dark bags', () => {
    expect(inkOn('#1d1d1f')).toBe('#fffaf5')
    expect(inkOn('#2f6f4f')).toBe('#fffaf5')
  })

  it('handles the darkest colours too', () => {
    expect(inkOn('#000000')).toBe('#fffaf5')
    expect(inkOn('#0a0a0a')).toBe('#fffaf5')
  })

  it('switches to dark text on light bags', () => {
    expect(inkOn('#f2c14e')).toBe('#1d1d1f')
    expect(inkOn('#f4c7c3')).toBe('#1d1d1f')
  })

  it('keeps every bag colour readable', () => {
    for (const colour of bagColours) {
      expect(contrast(colour, inkOn(colour))).toBeGreaterThanOrEqual(4.5)
    }
  })
})

function luminance(hex: string) {
  const [r, g, b] = [1, 3, 5].map(i => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255

    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })

  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!
}

function contrast(a: string, b: string) {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x)

  return (light! + 0.05) / (dark! + 0.05)
}
