import { describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import PurchaseSummary from '~/components/PurchaseSummary.vue'
import { ayele } from '../fake-api'
import { tid } from '../fixtures'

async function summary(purchases: ShelfPurchase[]) {
  const wrapper = await mountSuspended(PurchaseSummary, {
    props: { purchases },
  })

  return (key: string) => wrapper.get(tid(`summary-${key}`)).text()
}

describe('PurchaseSummary', () => {
  it('sums up what the shelf bought', async () => {
    const value = await summary(ayele().purchases)

    expect(value('last-bought')).toBe(formatDate('2026-11-01'))
    expect(value('latest-roast')).toBe(formatDate('2026-10-28'))
    expect(value('latest-price')).toMatch(/^€\s?16\.50$/)
    expect(value('price-per-gram')).toMatch(/^€\s?0\.066\/g$/)
    expect(value('times-bought')).toBe('2 times')
  })

  it('says what nobody wrote down', async () => {
    const [, unknown] = ayele().purchases
    const value = await summary([unknown!])

    expect(value('latest-roast')).toBe('Unknown')
    expect(value('latest-price')).toBe('Unknown')
    expect(value('price-per-gram')).toBe('Unknown')
    expect(value('times-bought')).toBe('Once')
  })

  it('says when the shelf never bought it', async () => {
    const value = await summary([])

    expect(value('last-bought')).toBe('Never')
    expect(value('times-bought')).toBe('0 times')
  })
})
