import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { useQueryClient } from '@tanstack/vue-query'
import { eq } from 'drizzle-orm'
import {
  useRoaster,
  useRoasterLogoRemoval,
  useRoasterPages,
  useRoasterLogoUpdate,
  useRoasterUpdate,
} from '~/queries/roasters'
import { roaster } from '#server/db/schemas'
import type { Member } from '#test/support/types'
import type { RoasterDetails } from '#imports'
import { queryKeys } from '#imports'
import { runOn } from '../fixtures'
import { database, scenario, signIn } from '../server'

const { compressPhoto } = vi.hoisted(() => ({
  compressPhoto: vi.fn(async () => new Blob(['small'], { type: 'image/webp' })),
}))

mockNuxtImport('compressPhoto', () => compressPhoto)

let sarah: Member
let squareMile: string

beforeEach(async () => {
  compressPhoto.mockClear()
  sarah = await scenario.member('Sarah')
  await scenario.coffee(sarah.shelf, { roaster: 'Square Mile' })
  squareMile = await scenario.roaster(sarah, 'Square Mile')
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
  const [found] = await db
    .select()
    .from(roaster)
    .where(eq(roaster.id, squareMile))

  return found!
}

function refreshed() {
  return [
    { queryKey: queryKeys.shelf(sarah.shelf.id) },
    { queryKey: queryKeys.coffees() },
    { queryKey: queryKeys.roasters() },
    { queryKey: queryKeys.lists() },
    { queryKey: queryKeys.admin() },
  ]
}

describe('useRoasterPages', () => {
  it('loads the roasters of the shelf with the query', async () => {
    await scenario.roaster(sarah, 'La Cabra')
    const pages = await runOn('/', () =>
      useRoasterPages(sarah.shelf.id, { boughtFrom: 'true' }),
    )

    await pages.suspense()

    expect(
      pages.data.value?.pages[0]?.roasters.map(found => found.name),
    ).toEqual(['Square Mile'])
    expect(pages.hasNextPage.value).toBe(false)
  })
})

describe('useRoaster', () => {
  it('loads a roaster by its id', async () => {
    const found = await runOn('/', () => useRoaster(squareMile))

    await found.suspense()

    expect(found.data.value).toMatchObject({
      id: squareMile,
      name: 'Square Mile',
    })
  })
})

describe('useRoasterUpdate', () => {
  it('saves the roaster and refreshes the shelf and the lists', async () => {
    const { result, invalidated } = await withClient(useRoasterUpdate)
    const details: RoasterDetails = {
      name: 'Square Mile',
      website: null,
      countryCode: 'GB',
      city: 'London',
    }

    await result.mutateAsync({
      shelfId: sarah.shelf.id,
      roasterId: squareMile,
      details,
    })

    expect(await stored()).toMatchObject(details)
    expect(invalidated()).toEqual(refreshed())
  })
})

describe('useRoasterLogoUpdate', () => {
  it('shrinks the logo, uploads it and refreshes the shelf', async () => {
    const { result, invalidated } = await withClient(useRoasterLogoUpdate)
    const logo = new Blob(['huge'], { type: 'image/png' })

    await result.mutateAsync({
      shelfId: sarah.shelf.id,
      roasterId: squareMile,
      logo,
    })

    expect(compressPhoto).toHaveBeenCalledWith(logo)
    expect((await stored()).logoUrl).toMatch(
      /^\/api\/photos\/roasters\/[\w-]+\.webp$/,
    )
    expect(invalidated()).toEqual(refreshed())
  })
})

describe('useRoasterLogoRemoval', () => {
  it('removes the logo and refreshes the shelf', async () => {
    const db = await database()
    await db
      .update(roaster)
      .set({ logoUrl: '/api/photos/roasters/old.webp' })
      .where(eq(roaster.id, squareMile))
    const { result, invalidated } = await withClient(useRoasterLogoRemoval)

    await result.mutateAsync({ shelfId: sarah.shelf.id, roasterId: squareMile })

    expect((await stored()).logoUrl).toBeNull()
    expect(invalidated()).toEqual(refreshed())
  })
})
