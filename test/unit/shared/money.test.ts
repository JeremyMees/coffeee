import { describe, expect, it } from 'vitest'
import {
  formatAmount,
  formatPrice,
  formatPricePerGram,
} from '#shared/utils/money'

describe('formatPrice', () => {
  it('shows cents as euros', () => {
    expect(formatPrice(1650, 'en')).toMatch(/^€\s?16\.50$/)
  })

  it('keeps euros in a locale that uses another currency', () => {
    expect(formatPrice(1650, 'en-US')).toMatch(/^€\s?16\.50$/)
  })

  it('writes the price the way the locale does', () => {
    expect(formatPrice(1650, 'nl-BE')).toMatch(/^€\s?16,50$/)
  })
})

describe('formatPricePerGram', () => {
  it('shows a price per gram to a tenth of a cent', () => {
    expect(formatPricePerGram(6.6, 'en')).toMatch(/^€\s?0\.066\/g$/)
  })
})

describe('formatAmount', () => {
  it('gives the amount without a currency or grouping', () => {
    expect(formatAmount(123450, 'en')).toBe('1234.50')
    expect(formatAmount(123450, 'nl-BE')).toBe('1234,50')
  })
})
