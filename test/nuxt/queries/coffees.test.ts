import { useQueryClient } from '@tanstack/vue-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { eq } from 'drizzle-orm'
import { useProfileStats } from '~/queries/account'
import { useCatalogPages } from '~/queries/catalog'
import { useLibraryPage } from '~/queries/library'
import {
  useCoffee,
  useCoffeeCreate,
  useCoffeeDelete,
  useCoffeePreview,
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

async function watching<T>(use: () => T) {
  const { result, stats, stock, shown } = await runOn('/', () => ({
    result: use(),
    stats: useProfileStats(),
    stock: useStock(sarah.shelf.id),
    shown: useCoffee(ayele.id),
  }))
  await Promise.all([stats.suspense(), stock.suspense(), shown.suspense()])

  return {
    result,
    bags: () => stats.data.value?.bags,
    stock: () => stock.data.value?.map(found => found.name),
    shown: () => shown.data.value,
  }
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

describe('useCoffeePreview', () => {
  it('knows a coffee from the stock the shelf already loaded', async () => {
    const { stock, preview } = await runOn('/', () => ({
      stock: useStock(sarah.shelf.id),
      preview: useCoffeePreview(sarah.shelf.id, ayele.id),
    }))

    await vi.waitFor(() => expect(stock.data.value).toHaveLength(1))

    expect(preview.value).toEqual({
      id: ayele.id,
      name: 'Ayele Fulasa',
      roaster: 'Square Mile',
      photoUrl: null,
    })
  })

  it('knows a coffee from a page of the library or the catalog', async () => {
    const { client, library, catalog, fromLibrary, fromCatalog } = await runOn(
      '/',
      () => ({
        client: useQueryClient(),
        library: useLibraryPage(sarah.shelf.id, {}, 0),
        catalog: useCatalogPages(sarah.shelf.id, {}),
        fromLibrary: useCoffeePreview(sarah.shelf.id, ayele.id),
        fromCatalog: useCoffeePreview(sarah.shelf.id, ayele.id),
      }),
    )
    await vi.waitFor(() => {
      expect(library.data.value?.coffees).toHaveLength(1)
      expect(catalog.data.value?.pages).toHaveLength(1)
    })

    expect(fromLibrary.value).toMatchObject({ name: 'Ayele Fulasa' })

    client.removeQueries({ queryKey: ['shelves', sarah.shelf.id, 'library'] })

    expect(fromCatalog.value).toMatchObject({ name: 'Ayele Fulasa' })
  })

  it('does not know a coffee no list has shown', async () => {
    const { preview } = await runOn('/', () => ({
      preview: useCoffeePreview(sarah.shelf.id, 'unknown'),
    }))

    expect(preview.value).toBeUndefined()
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
  it('adds the coffee and shows it in the stock and the stats', async () => {
    const { result, stock, bags } = await watching(useCoffeeCreate)

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
    expect(stock()).toEqual(expect.arrayContaining(['Ayele Fulasa', 'Halo']))
    expect(bags()).toBe(2)
  })
})

describe('useCoffeeUpdate', () => {
  it('saves the details and shows them on the coffee and in the stock', async () => {
    const { result, stock, shown } = await watching(useCoffeeUpdate)

    await result.mutateAsync({
      shelfId: sarah.shelf.id,
      coffeeId: ayele.id,
      details: coffeeDetailsSchema.parse(halo),
    })

    expect((await stored())?.name).toBe('Halo')
    expect(shown()?.name).toBe('Halo')
    expect(stock()).toEqual(['Halo'])
  })
})

describe('useCoffeePhotoUpdate', () => {
  it('uploads the shrunk photo and shows it on the coffee', async () => {
    const { result, shown } = await watching(useCoffeePhotoUpdate)

    await result.mutateAsync({
      shelfId: sarah.shelf.id,
      coffeeId: ayele.id,
      photo: new Blob(['huge'], { type: 'image/jpeg' }),
    })

    const photoUrl = (await stored())?.photoUrl ?? ''
    expect(photoUrl).toMatch(/^\/api\/photos\/coffees\/[\w-]+\.webp$/)
    const pathname = photoUrl.replace('/api/photos/', '')
    expect(String(storages.get('photos')?.get(pathname))).toBe('small')
    expect(shown()?.photoUrl).toBe(photoUrl)
  })
})

describe('useCoffeePhotoRemoval', () => {
  it('removes the photo and drops it from the coffee', async () => {
    const db = await database()
    await db
      .update(coffee)
      .set({ photoUrl: '/api/photos/coffees/old.webp' })
      .where(eq(coffee.id, ayele.id))
    const { result, shown } = await watching(useCoffeePhotoRemoval)

    await result.mutateAsync({ shelfId: sarah.shelf.id, coffeeId: ayele.id })

    expect((await stored())?.photoUrl).toBeNull()
    expect(shown()?.photoUrl).toBeNull()
  })
})

describe('useCoffeeDelete', () => {
  it('deletes the coffee and takes it out of the stock and the stats', async () => {
    const { result, stock, bags } = await watching(useCoffeeDelete)

    await result.mutateAsync(ayele.id)

    expect(await stored()).toBeUndefined()
    expect(stock()).toEqual([])
    expect(bags()).toBe(0)
  })
})
