import { beforeEach, describe, expect, it, vi } from 'vitest'
import { registerEndpoint } from '@nuxt/test-utils/runtime'
import { useQueryClient } from '@tanstack/vue-query'
import { readBody } from 'h3'
import type { H3Event } from 'h3'
import {
  useBuyAgain,
  useCoffeeFinish,
  usePurchaseFinish,
  usePurchaseRemoval,
  usePurchaseUpdate,
} from '~/queries/purchases'
import { queryKeys } from '#imports'
import { runOn } from '../fixtures'

const calls: unknown[] = []
const coffee = '/api/shelves/cellar/coffees/c1'
const purchase = `${coffee}/purchases/p1`

function record(name: string, withBody = false) {
  return async (event: H3Event) => {
    calls.push(withBody ? { [name]: await readBody(event) } : name)

    return { id: 'p1' }
  }
}

registerEndpoint(`${coffee}/purchases`, {
  method: 'POST',
  handler: record('bought', true),
})
registerEndpoint(`${coffee}/finish`, {
  method: 'POST',
  handler: record('coffee finished'),
})
registerEndpoint(purchase, {
  method: 'PATCH',
  handler: record('edited', true),
})
registerEndpoint(`${purchase}/finish`, {
  method: 'POST',
  handler: record('purchase finished'),
})
registerEndpoint(purchase, { method: 'DELETE', handler: record('deleted') })

beforeEach(() => {
  calls.length = 0
})

async function withClient<T>(use: () => T) {
  const { result, client } = await runOn('/', () => ({
    result: use(),
    client: useQueryClient(),
  }))
  const invalidate = vi.spyOn(client, 'invalidateQueries')

  return { result, invalidated: () => invalidate.mock.calls.map(([f]) => f) }
}

const bag = {
  purchasedOn: '2026-11-02',
  roastedOn: null,
  sizeGrams: 250,
  price: 16.5,
}
const target = { shelfId: 'cellar', coffeeId: 'c1' }
const refreshed = [{ queryKey: queryKeys.shelf('cellar') }]

describe('useBuyAgain', () => {
  it('adds a purchase and refreshes that shelf', async () => {
    const { result, invalidated } = await withClient(useBuyAgain)

    await result.mutateAsync({ ...target, purchase: bag })

    expect(calls).toEqual([{ bought: bag }])
    expect(invalidated()).toEqual(refreshed)
  })
})

describe('useCoffeeFinish', () => {
  it('finishes the coffee and refreshes that shelf', async () => {
    const { result, invalidated } = await withClient(useCoffeeFinish)

    await result.mutateAsync(target)

    expect(calls).toEqual(['coffee finished'])
    expect(invalidated()).toEqual(refreshed)
  })
})

describe('usePurchaseUpdate', () => {
  it('saves the purchase and refreshes that shelf', async () => {
    const { result, invalidated } = await withClient(usePurchaseUpdate)

    await result.mutateAsync({ ...target, purchaseId: 'p1', purchase: bag })

    expect(calls).toEqual([{ edited: bag }])
    expect(invalidated()).toEqual(refreshed)
  })
})

describe('usePurchaseFinish', () => {
  it('finishes the purchase and refreshes that shelf', async () => {
    const { result, invalidated } = await withClient(usePurchaseFinish)

    await result.mutateAsync({ ...target, purchaseId: 'p1' })

    expect(calls).toEqual(['purchase finished'])
    expect(invalidated()).toEqual(refreshed)
  })
})

describe('usePurchaseRemoval', () => {
  it('deletes the purchase and refreshes that shelf', async () => {
    const { result, invalidated } = await withClient(usePurchaseRemoval)

    await result.mutateAsync({ ...target, purchaseId: 'p1' })

    expect(calls).toEqual(['deleted'])
    expect(invalidated()).toEqual(refreshed)
  })
})
