import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useQueryClient } from '@tanstack/vue-query'
import { asc, eq } from 'drizzle-orm'
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
import { queryKeys } from '#imports'
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

async function withClient<T>(use: () => T) {
  const { result, client } = await runOn('/', () => ({
    result: use(),
    client: useQueryClient(),
  }))
  const invalidate = vi.spyOn(client, 'invalidateQueries')

  return { result, invalidated: () => invalidate.mock.calls.map(([f]) => f) }
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

function refreshed() {
  return [
    { queryKey: queryKeys.shelf(sarah.shelf.id) },
    { queryKey: queryKeys.coffees() },
  ]
}

describe('useBuyAgain', () => {
  it('adds a purchase and refreshes that shelf', async () => {
    const { result, invalidated } = await withClient(useBuyAgain)

    await result.mutateAsync({ ...target, purchase: bag })

    expect(await bags()).toEqual([
      expect.objectContaining({ purchasedOn: '2026-11-01' }),
      expect.objectContaining({
        purchasedOn: '2026-11-02',
        sizeGrams: 250,
        priceCents: 1650,
      }),
    ])
    expect(invalidated()).toEqual(refreshed())
  })
})

describe('useCoffeeFinish', () => {
  it('finishes the coffee and refreshes that shelf', async () => {
    const { result, invalidated } = await withClient(useCoffeeFinish)

    await result.mutateAsync(target)

    expect(await bags()).toEqual([
      expect.objectContaining({ finishedAt: expect.any(Date) }),
    ])
    expect(invalidated()).toEqual(refreshed())
  })
})

describe('usePurchaseUpdate', () => {
  it('saves the purchase and refreshes that shelf', async () => {
    const { result, invalidated } = await withClient(usePurchaseUpdate)

    await result.mutateAsync({ ...target, purchaseId, purchase: bag })

    expect(await bags()).toEqual([
      expect.objectContaining({
        id: purchaseId,
        purchasedOn: '2026-11-02',
        priceCents: 1650,
      }),
    ])
    expect(invalidated()).toEqual(refreshed())
  })
})

describe('usePurchaseFinish', () => {
  it('finishes the purchase and refreshes that shelf', async () => {
    const { result, invalidated } = await withClient(usePurchaseFinish)

    await result.mutateAsync({ ...target, purchaseId })

    expect(await bags()).toEqual([
      expect.objectContaining({ id: purchaseId, finishedAt: expect.any(Date) }),
    ])
    expect(invalidated()).toEqual(refreshed())
  })
})

describe('usePurchaseRemoval', () => {
  it('deletes the purchase and refreshes that shelf', async () => {
    const { result, invalidated } = await withClient(usePurchaseRemoval)

    await result.mutateAsync({ ...target, purchaseId })

    expect(await bags()).toEqual([])
    expect(invalidated()).toEqual(refreshed())
  })
})
