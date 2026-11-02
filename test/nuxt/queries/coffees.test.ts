import { beforeEach, describe, expect, it, vi } from 'vitest'
import { registerEndpoint } from '@nuxt/test-utils/runtime'
import { useQueryClient } from '@tanstack/vue-query'
import { readBody } from 'h3'
import {
  useCoffeeCreate,
  useCoffeeUpdate,
  useShelfCoffee,
  useStock,
} from '~/queries/coffees'
import { queryKeys } from '#imports'
import { runOn } from '../fixtures'

const calls = { stock: 0, posted: [] as unknown[], patched: [] as unknown[] }

registerEndpoint('/api/shelves/cellar/stock', () => {
  calls.stock++

  return [{ id: 'c1', name: 'Ayele Fulasa' }]
})

registerEndpoint('/api/shelves/cellar/coffees/c1', {
  method: 'GET',
  handler: () => ({ id: 'c1', name: 'Ayele Fulasa', purchases: [] }),
})

registerEndpoint('/api/shelves/cellar/coffees/c1', {
  method: 'PATCH',
  handler: async event => {
    calls.patched.push(await readBody(event))

    return { id: 'c1' }
  },
})

registerEndpoint('/api/shelves/cellar/coffees', {
  method: 'POST',
  handler: async event => {
    calls.posted.push(await readBody(event))

    return { coffee: { id: 'c1' } }
  },
})

beforeEach(() => {
  calls.stock = 0
  calls.posted = []
  calls.patched = []
})

async function withClient<T>(use: () => T) {
  const { result, client } = await runOn('/', () => ({
    result: use(),
    client: useQueryClient(),
  }))
  const invalidate = vi.spyOn(client, 'invalidateQueries')

  return { result, invalidated: () => invalidate.mock.calls.map(([f]) => f) }
}

describe('useStock', () => {
  it('fetches the stock of a shelf once and reuses it', async () => {
    const first = await runOn('/', () => useStock('cellar'))
    await vi.waitFor(() =>
      expect(first.data.value).toEqual([{ id: 'c1', name: 'Ayele Fulasa' }]),
    )

    const second = await runOn('/', () => useStock('cellar'))

    expect(second.data.value).toEqual([{ id: 'c1', name: 'Ayele Fulasa' }])
    expect(calls.stock).toBe(1)
  })
})

describe('useShelfCoffee', () => {
  it('fetches a coffee on a shelf', async () => {
    const { data, suspense } = await runOn('/', () =>
      useShelfCoffee('cellar', 'c1'),
    )

    await suspense()

    expect(data.value).toMatchObject({ id: 'c1', name: 'Ayele Fulasa' })
  })
})

describe('useCoffeeCreate', () => {
  it('adds the coffee and refreshes that shelf and every list', async () => {
    const { result, invalidated } = await withClient(useCoffeeCreate)

    await result.mutateAsync({
      shelfId: 'cellar',
      coffee: { name: 'Halo' } as NewCoffee,
    })

    expect(calls.posted).toEqual([{ name: 'Halo' }])
    expect(invalidated()).toEqual([
      { queryKey: queryKeys.shelf('cellar') },
      { queryKey: queryKeys.lists() },
    ])
  })
})

describe('useCoffeeUpdate', () => {
  it('saves the details and refreshes that shelf and every list', async () => {
    const { result, invalidated } = await withClient(useCoffeeUpdate)

    await result.mutateAsync({
      shelfId: 'cellar',
      coffeeId: 'c1',
      details: { name: 'Halo' } as CoffeeDetails,
    })

    expect(calls.patched).toEqual([{ name: 'Halo' }])
    expect(invalidated()).toEqual([
      { queryKey: queryKeys.shelf('cellar') },
      { queryKey: queryKeys.lists() },
    ])
  })
})
