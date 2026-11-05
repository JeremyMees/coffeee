import { beforeEach, describe, expect, it } from 'vitest'
import { asc, eq } from 'drizzle-orm'
import { useProfileStats } from '~/queries/account'
import { useShelfCoffee, useStock } from '~/queries/coffees'
import {
  useBuyAgain,
  useCoffeeFinish,
  usePurchaseFinish,
  usePurchaseRemoval,
  usePurchaseUpdate,
} from '~/queries/purchases'
import { purchase } from '#server/db/schemas'
import { purchaseColumns } from '#server/utils/purchases'
import type { Member } from '#test/support/types'
import { runOn } from '../fixtures'
import { database, scenario, signIn } from '../server'

let sarah: Member
let target: { shelfId: string; coffeeId: string }
let purchaseId: string

beforeEach(async () => {
  sarah = await scenario.member('Sarah')
  const ayele = await scenario.coffee(sarah.shelf, {
    purchasedOn: '2026-11-01',
    sizeGrams: 250,
    price: 15,
  })
  target = { shelfId: sarah.shelf.id, coffeeId: ayele.id }
  purchaseId = ayele.purchaseId
  await signIn(sarah)
})

async function watching<T>(use: () => T) {
  const { result, stats, stock, coffee } = await runOn('/', () => ({
    result: use(),
    stats: useProfileStats(),
    stock: useStock(target.shelfId),
    coffee: useShelfCoffee(target.shelfId, target.coffeeId),
  }))
  await Promise.all([stats.suspense(), stock.suspense(), coffee.suspense()])

  return {
    result,
    stats: () => stats.data.value,
    inStock: () => stock.data.value?.map(found => found.id),
    purchases: () => coffee.data.value?.purchases,
  }
}

async function bags() {
  const db = await database()

  return db
    .select(purchaseColumns)
    .from(purchase)
    .where(eq(purchase.coffeeId, target.coffeeId))
    .orderBy(asc(purchase.purchasedOn))
}

const bag = {
  purchasedOn: '2026-11-02',
  roastedOn: null,
  sizeGrams: 250,
  price: 16.5,
}

describe('useBuyAgain', () => {
  it('adds a purchase and shows it on the coffee and in the stats', async () => {
    const { result, stats, purchases } = await watching(useBuyAgain)

    await result.mutateAsync({ ...target, purchase: bag })

    expect(await bags()).toEqual([
      expect.objectContaining({ purchasedOn: '2026-11-01' }),
      expect.objectContaining({
        purchasedOn: '2026-11-02',
        sizeGrams: 250,
        priceCents: 1650,
      }),
    ])
    expect(purchases()).toHaveLength(2)
    expect(stats()).toMatchObject({ bags: 2, grams: 500, spentCents: 3150 })
  })
})

describe('useCoffeeFinish', () => {
  it('finishes the coffee and takes it out of the stock', async () => {
    const { result, inStock } = await watching(useCoffeeFinish)

    await result.mutateAsync(target)

    expect(await bags()).toEqual([
      expect.objectContaining({ finishedAt: expect.any(Date) }),
    ])
    expect(inStock()).toEqual([])
  })
})

describe('usePurchaseUpdate', () => {
  it('saves the purchase and shows the new price in the stats', async () => {
    const { result, stats } = await watching(usePurchaseUpdate)

    await result.mutateAsync({ ...target, purchaseId, purchase: bag })

    expect(await bags()).toEqual([
      expect.objectContaining({
        id: purchaseId,
        purchasedOn: '2026-11-02',
        priceCents: 1650,
      }),
    ])
    expect(stats()).toMatchObject({ bags: 1, spentCents: 1650 })
  })
})

describe('usePurchaseFinish', () => {
  it('finishes the purchase and takes the coffee out of the stock', async () => {
    const { result, inStock } = await watching(usePurchaseFinish)

    await result.mutateAsync({ ...target, purchaseId })

    expect(await bags()).toEqual([
      expect.objectContaining({ id: purchaseId, finishedAt: expect.any(Date) }),
    ])
    expect(inStock()).toEqual([])
  })
})

describe('usePurchaseRemoval', () => {
  it('deletes the purchase and takes it out of the stats', async () => {
    const { result, stats } = await watching(usePurchaseRemoval)

    await result.mutateAsync({ ...target, purchaseId })

    expect(await bags()).toEqual([])
    expect(stats()).toMatchObject({ bags: 0, spentCents: 0 })
  })
})
