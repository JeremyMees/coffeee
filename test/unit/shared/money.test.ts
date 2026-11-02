import { describe, expect, it } from 'vitest'
import { formatPrice, formatPricePerGram } from '#shared/utils/money'

describe('formatPrice', () => {
  it('shows cents as euros', () => {
    expect(formatPrice(1650)).toMatch(/^€\s?16\.50$/)
  })
})

describe('formatPricePerGram', () => {
  it('shows a price per gram to a tenth of a cent', () => {
    expect(formatPricePerGram(6.6)).toMatch(/^€\s?0\.066\/g$/)
  })
})
