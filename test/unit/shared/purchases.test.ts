import { describe, expect, it } from 'vitest'
import {
  buyAgainValues,
  lastBought,
  latestPrice,
  latestRoastDate,
  priceCents,
  pricePerGram,
  purchaseFormValues,
  timesBought,
} from '#shared/utils/purchases'
import { localDate } from '#shared/utils/dates'
import type { PurchaseRecord } from '#shared/types/purchases'

function bought(
  purchasedOn: string,
  overrides: Partial<PurchaseRecord> = {},
): PurchaseRecord {
  return {
    purchasedOn,
    roastedOn: null,
    sizeGrams: null,
    priceCents: null,
    ...overrides,
  }
}

const history = [
  bought('2026-09-01', {
    roastedOn: '2026-08-28',
    sizeGrams: 250,
    priceCents: 1500,
  }),
  bought('2026-11-01'),
  bought('2026-10-01', {
    roastedOn: '2026-09-25',
    sizeGrams: 1000,
    priceCents: 5200,
  }),
]

describe('lastBought', () => {
  it('is the purchase date of the most recent purchase', () => {
    expect(lastBought(history)).toBe('2026-11-01')
  })

  it('is nothing for a coffee never bought', () => {
    expect(lastBought([])).toBeNull()
  })
})

describe('latestRoastDate', () => {
  it('is the roast date of the most recent purchase that has one', () => {
    expect(latestRoastDate(history)).toBe('2026-09-25')
  })

  it('is nothing when no purchase has a roast date', () => {
    expect(latestRoastDate([bought('2026-11-01')])).toBeNull()
  })
})

describe('latestPrice', () => {
  it('is the price of the most recent purchase that has one', () => {
    expect(latestPrice(history)).toBe(5200)
  })

  it('is nothing when no purchase has a price', () => {
    expect(latestPrice([bought('2026-11-01')])).toBeNull()
  })
})

describe('pricePerGram', () => {
  it('divides the latest price by the size of that purchase', () => {
    expect(pricePerGram(history)).toBe(5.2)
  })

  it('is nothing when the latest priced purchase has no size', () => {
    expect(
      pricePerGram([...history, bought('2026-12-01', { priceCents: 1800 })]),
    ).toBeNull()
  })

  it('is nothing when no purchase has a price', () => {
    expect(pricePerGram([])).toBeNull()
  })
})

describe('timesBought', () => {
  it('counts every purchase, finished or not', () => {
    expect(timesBought(history)).toBe(3)
    expect(timesBought([])).toBe(0)
  })
})

describe('priceCents', () => {
  it('turns a price in euros into whole cents', () => {
    expect(priceCents(16.5)).toBe(1650)
    expect(priceCents(16.499)).toBe(1650)
    expect(priceCents(null)).toBeNull()
  })
})

describe('purchaseFormValues', () => {
  it('fills the purchase form from a purchase', () => {
    expect(purchaseFormValues(history[0])).toEqual({
      purchasedOn: '2026-09-01',
      roastedOn: '2026-08-28',
      sizeGrams: '250',
      price: '15.00',
    })
  })

  it('starts an empty purchase on today', () => {
    expect(purchaseFormValues(undefined)).toEqual({
      purchasedOn: localDate(),
      roastedOn: '',
      sizeGrams: '',
      price: '',
    })
  })
})

describe('buyAgainValues', () => {
  it('copies the size and price of the last purchase onto today', () => {
    const today = new Date(2026, 10, 2)

    expect(
      buyAgainValues(
        [
          ...history,
          bought('2026-11-02', { sizeGrams: 500, priceCents: 2950 }),
        ],
        today,
      ),
    ).toEqual({
      purchasedOn: '2026-11-02',
      roastedOn: '',
      sizeGrams: '500',
      price: '29.50',
    })
  })

  it('starts empty for a coffee the shelf never bought', () => {
    expect(buyAgainValues([], new Date(2026, 10, 2))).toEqual({
      purchasedOn: '2026-11-02',
      roastedOn: '',
      sizeGrams: '',
      price: '',
    })
  })
})
