import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockNuxtImport, registerEndpoint } from '@nuxt/test-utils/runtime'
import { useQueryClient } from '@tanstack/vue-query'
import { readBody, readMultipartFormData } from 'h3'
import {
  useCoffee,
  useCoffeeCreate,
  useCoffeeDelete,
  useCoffeePhotoRemoval,
  useCoffeePhotoUpdate,
  useCoffeeUpdate,
  useShelfCoffee,
  useStock,
} from '~/queries/coffees'
import { queryKeys } from '#imports'
import { runOn } from '../fixtures'

const calls = {
  stock: 0,
  posted: [] as unknown[],
  patched: [] as unknown[],
  photos: [] as unknown[],
  deleted: [] as string[],
}

mockNuxtImport(
  'compressPhoto',
  () => async () => new Blob(['small'], { type: 'image/webp' }),
)

registerEndpoint('/api/shelves/cellar/coffees/c1/photo', {
  method: 'PUT',
  handler: async event => {
    const [photo] = (await readMultipartFormData(event)) ?? []
    calls.photos.push({
      name: photo?.name,
      filename: photo?.filename,
      type: photo?.type,
      content: photo?.data.toString(),
    })

    return { photoUrl: '/api/photos/coffees/a.webp' }
  },
})

registerEndpoint('/api/shelves/cellar/coffees/c1/photo', {
  method: 'DELETE',
  handler: () => {
    calls.photos.push('removed')

    return { photoUrl: null }
  },
})

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

registerEndpoint('/api/coffees/c9', {
  method: 'DELETE',
  handler: () => {
    calls.deleted.push('c9')

    return null
  },
})

registerEndpoint('/api/coffees/c1', () => ({
  id: 'c1',
  name: 'Ayele Fulasa',
}))

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
  calls.photos = []
  calls.deleted = []
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

describe('useCoffee', () => {
  it('fetches a coffee outside any shelf', async () => {
    const { data, suspense } = await runOn('/', () => useCoffee('c1'))

    await suspense()

    expect(data.value).toMatchObject({ id: 'c1', name: 'Ayele Fulasa' })
  })
})

describe('useCoffeeCreate', () => {
  it('adds the coffee and refreshes that shelf, every coffee and every list', async () => {
    const { result, invalidated } = await withClient(useCoffeeCreate)

    await result.mutateAsync({
      shelfId: 'cellar',
      coffee: { name: 'Halo' } as NewCoffee,
    })

    expect(calls.posted).toEqual([{ name: 'Halo' }])
    expect(invalidated()).toEqual([
      { queryKey: queryKeys.shelf('cellar') },
      { queryKey: queryKeys.coffees() },
      { queryKey: queryKeys.lists() },
      { queryKey: queryKeys.admin() },
    ])
  })
})

describe('useCoffeeUpdate', () => {
  it('saves the details and refreshes that shelf, every coffee and every list', async () => {
    const { result, invalidated } = await withClient(useCoffeeUpdate)

    await result.mutateAsync({
      shelfId: 'cellar',
      coffeeId: 'c1',
      details: { name: 'Halo' } as CoffeeDetails,
    })

    expect(calls.patched).toEqual([{ name: 'Halo' }])
    expect(invalidated()).toEqual([
      { queryKey: queryKeys.shelf('cellar') },
      { queryKey: queryKeys.coffees() },
      { queryKey: queryKeys.lists() },
      { queryKey: queryKeys.admin() },
    ])
  })
})

describe('useCoffeePhotoUpdate', () => {
  it('uploads the shrunk photo and refreshes that shelf', async () => {
    const { result, invalidated } = await withClient(useCoffeePhotoUpdate)

    const saved = await result.mutateAsync({
      shelfId: 'cellar',
      coffeeId: 'c1',
      photo: new Blob(['huge'], { type: 'image/jpeg' }),
    })

    expect(saved).toEqual({ photoUrl: '/api/photos/coffees/a.webp' })
    expect(calls.photos).toEqual([
      {
        name: 'photo',
        filename: 'blob',
        type: 'image/webp',
        content: 'small',
      },
    ])
    expect(invalidated()).toContainEqual({
      queryKey: queryKeys.shelf('cellar'),
    })
  })
})

describe('useCoffeePhotoRemoval', () => {
  it('removes the photo and refreshes that shelf', async () => {
    const { result, invalidated } = await withClient(useCoffeePhotoRemoval)

    await result.mutateAsync({ shelfId: 'cellar', coffeeId: 'c1' })

    expect(calls.photos).toEqual(['removed'])
    expect(invalidated()).toContainEqual({
      queryKey: queryKeys.shelf('cellar'),
    })
  })
})

describe('useCoffeeDelete', () => {
  it('deletes the coffee and refreshes every shelf, coffee and admin list', async () => {
    const { result, invalidated } = await withClient(useCoffeeDelete)

    await result.mutateAsync('c9')

    expect(calls.deleted).toEqual(['c9'])
    expect(invalidated()).toEqual([
      { queryKey: queryKeys.shelves() },
      { queryKey: queryKeys.coffees() },
      { queryKey: queryKeys.admin() },
    ])
  })
})
