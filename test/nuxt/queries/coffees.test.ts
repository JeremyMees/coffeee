import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { useQueryClient } from '@tanstack/vue-query'
import { eq } from 'drizzle-orm'
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
import { coffeeDetailsSchema, newCoffeeSchema } from '#shared/utils/schemas'
import { coffee } from '#server/db/schemas'
import { listStock } from '#server/utils/coffees'
import { storages } from '#test/support/nitro'
import type { Member } from '#test/support/types'
import { queryKeys } from '#imports'
import { runOn } from '../fixtures'
import { database, scenario, signIn } from '../server'

mockNuxtImport(
  'compressPhoto',
  () => async () => new Blob(['small'], { type: 'image/webp' }),
)

let sarah: Member
let ayele: Awaited<ReturnType<typeof scenario.coffee>>

beforeEach(async () => {
  sarah = await scenario.member('Sarah')
  ayele = await scenario.coffee(sarah.shelf, { name: 'Ayele Fulasa' })
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

async function stored() {
  const db = await database()
  const [found] = await db.select().from(coffee).where(eq(coffee.id, ayele.id))

  return found
}

async function stockNames() {
  const stock = await listStock(await database(), {
    shelfId: sarah.shelf.id,
    userId: sarah.id,
  })

  return stock.map(found => found.name)
}

function savedShelf() {
  return [
    { queryKey: queryKeys.shelf(sarah.shelf.id) },
    { queryKey: queryKeys.coffees() },
    { queryKey: queryKeys.lists() },
    { queryKey: queryKeys.admin() },
  ]
}

const halo = {
  name: 'Halo',
  roaster: 'Square Mile',
  roastLevel: 'light',
  roastedFor: 'filter',
  origins: ['ET'],
  processes: ['Washed'],
}

describe('useStock', () => {
  it('fetches the stock of a shelf once and reuses it', async () => {
    const first = await runOn('/', () => useStock(sarah.shelf.id))
    await vi.waitFor(() =>
      expect(first.data.value?.map(found => found.name)).toEqual([
        'Ayele Fulasa',
      ]),
    )
    await scenario.coffee(sarah.shelf, { name: 'Halo' })

    const second = await runOn('/', () => useStock(sarah.shelf.id))

    expect(second.data.value?.map(found => found.name)).toEqual([
      'Ayele Fulasa',
    ])
  })
})

describe('useShelfCoffee', () => {
  it('fetches a coffee on a shelf', async () => {
    const { data, suspense } = await runOn('/', () =>
      useShelfCoffee(sarah.shelf.id, ayele.id),
    )

    await suspense()

    expect(data.value).toMatchObject({ id: ayele.id, name: 'Ayele Fulasa' })
  })
})

describe('useCoffee', () => {
  it('fetches a coffee outside any shelf', async () => {
    const { data, suspense } = await runOn('/', () => useCoffee(ayele.id))

    await suspense()

    expect(data.value).toMatchObject({ id: ayele.id, name: 'Ayele Fulasa' })
  })
})

describe('useCoffeeCreate', () => {
  it('adds the coffee and refreshes that shelf, every coffee and every list', async () => {
    const { result, invalidated } = await withClient(useCoffeeCreate)

    await result.mutateAsync({
      shelfId: sarah.shelf.id,
      coffee: newCoffeeSchema.parse({
        ...halo,
        purchasedOn: '2026-11-02',
        roastedOn: null,
        sizeGrams: 250,
        price: null,
      }),
    })

    expect(await stockNames()).toEqual(
      expect.arrayContaining(['Ayele Fulasa', 'Halo']),
    )
    expect(invalidated()).toEqual(savedShelf())
  })
})

describe('useCoffeeUpdate', () => {
  it('saves the details and refreshes that shelf, every coffee and every list', async () => {
    const { result, invalidated } = await withClient(useCoffeeUpdate)

    await result.mutateAsync({
      shelfId: sarah.shelf.id,
      coffeeId: ayele.id,
      details: coffeeDetailsSchema.parse(halo),
    })

    expect((await stored())?.name).toBe('Halo')
    expect(invalidated()).toEqual(savedShelf())
  })
})

describe('useCoffeePhotoUpdate', () => {
  it('uploads the shrunk photo and refreshes that shelf', async () => {
    const { result, invalidated } = await withClient(useCoffeePhotoUpdate)

    await result.mutateAsync({
      shelfId: sarah.shelf.id,
      coffeeId: ayele.id,
      photo: new Blob(['huge'], { type: 'image/jpeg' }),
    })

    const photoUrl = (await stored())?.photoUrl ?? ''
    expect(photoUrl).toMatch(/^\/api\/photos\/coffees\/[\w-]+\.webp$/)
    const pathname = photoUrl.replace('/api/photos/', '')
    expect(String(storages.get('photos')?.get(pathname))).toBe('small')
    expect(invalidated()).toContainEqual({
      queryKey: queryKeys.shelf(sarah.shelf.id),
    })
  })
})

describe('useCoffeePhotoRemoval', () => {
  it('removes the photo and refreshes that shelf', async () => {
    const db = await database()
    await db
      .update(coffee)
      .set({ photoUrl: '/api/photos/coffees/old.webp' })
      .where(eq(coffee.id, ayele.id))
    const { result, invalidated } = await withClient(useCoffeePhotoRemoval)

    await result.mutateAsync({ shelfId: sarah.shelf.id, coffeeId: ayele.id })

    expect((await stored())?.photoUrl).toBeNull()
    expect(invalidated()).toContainEqual({
      queryKey: queryKeys.shelf(sarah.shelf.id),
    })
  })
})

describe('useCoffeeDelete', () => {
  it('deletes the coffee and refreshes every shelf, coffee and admin list', async () => {
    const { result, invalidated } = await withClient(useCoffeeDelete)

    await result.mutateAsync(ayele.id)

    expect(await stored()).toBeUndefined()
    expect(invalidated()).toEqual([
      { queryKey: queryKeys.shelves() },
      { queryKey: queryKeys.coffees() },
      { queryKey: queryKeys.admin() },
    ])
  })
})
