import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { useQueryClient } from '@tanstack/vue-query'
import {
  useRoaster,
  useRoasterLogoRemoval,
  useRoasterPages,
  useRoasterLogoUpdate,
  useRoasterUpdate,
} from '~/queries/roasters'
import type { RoasterDetails } from '#imports'
import { queryKeys } from '#imports'
import { api, fakeApi, listedRoasters, resetApi } from '../fake-api'
import { runOn } from '../fixtures'

fakeApi()

const { compressPhoto } = vi.hoisted(() => ({
  compressPhoto: vi.fn(async () => new Blob(['small'], { type: 'image/webp' })),
}))

mockNuxtImport('compressPhoto', () => compressPhoto)

beforeEach(resetApi)

async function withClient<T>(use: () => T) {
  const { result, client } = await runOn('/', () => ({
    result: use(),
    client: useQueryClient(),
  }))
  const invalidate = vi.spyOn(client, 'invalidateQueries')

  return { result, invalidated: () => invalidate.mock.calls.map(([f]) => f) }
}

const refreshed = [
  { queryKey: queryKeys.shelf('home') },
  { queryKey: queryKeys.coffees() },
  { queryKey: queryKeys.roasters() },
  { queryKey: queryKeys.lists() },
  { queryKey: queryKeys.admin() },
]

describe('useRoasterPages', () => {
  it('loads the roasters of the shelf with the query', async () => {
    api.roasters = listedRoasters()
    const pages = await runOn('/', () =>
      useRoasterPages('home', { boughtFrom: 'true' }),
    )

    await pages.suspense()

    expect(api.roasterQueries).toEqual([{ boughtFrom: 'true', page: '0' }])
    expect(
      pages.data.value?.pages[0]?.roasters.map(found => found.name),
    ).toEqual(['Square Mile'])
    expect(pages.hasNextPage.value).toBe(false)
  })
})

describe('useRoaster', () => {
  it('loads a roaster by its id', async () => {
    const roaster = await runOn('/', () => useRoaster('r2'))

    await roaster.suspense()

    expect(roaster.data.value).toMatchObject({ id: 'r2', name: 'Square Mile' })
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

    await result.mutateAsync({ shelfId: 'home', roasterId: 'r2', details })

    expect(api.roasterCalls).toEqual([{ edit: details }])
    expect(invalidated()).toEqual(refreshed)
  })
})

describe('useRoasterLogoUpdate', () => {
  it('shrinks the logo, uploads it and refreshes the shelf', async () => {
    const { result, invalidated } = await withClient(useRoasterLogoUpdate)
    const logo = new Blob(['huge'], { type: 'image/png' })

    await result.mutateAsync({ shelfId: 'home', roasterId: 'r2', logo })

    expect(compressPhoto).toHaveBeenCalledWith(logo)
    expect(api.roasterCalls).toEqual(['logo uploaded'])
    expect(invalidated()).toEqual(refreshed)
  })
})

describe('useRoasterLogoRemoval', () => {
  it('removes the logo and refreshes the shelf', async () => {
    const { result, invalidated } = await withClient(useRoasterLogoRemoval)

    await result.mutateAsync({ shelfId: 'home', roasterId: 'r2' })

    expect(api.roasterCalls).toEqual(['logo removed'])
    expect(invalidated()).toEqual(refreshed)
  })
})
