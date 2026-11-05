import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
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

async function watching<T>(use: () => T) {
  const { result, found } = await runOn('/', () => ({
    result: use(),
    found: useRoaster(squareMile),
  }))
  await found.suspense()

  return { result, shown: () => found.data.value }
}

async function stored() {
  const db = await database()
  const [found] = await db
    .select()
    .from(roaster)
    .where(eq(roaster.id, squareMile))

  return found!
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
  it('saves the roaster and shows the new details', async () => {
    const { result, shown } = await watching(useRoasterUpdate)
    const details: RoasterDetails = {
      name: 'Square Mile',
      website: null,
      countryCode: 'GB',
      city: 'London',
    }

    await result.mutateAsync({ roasterId: squareMile, details })

    expect(await stored()).toMatchObject(details)
    expect(shown()).toMatchObject(details)
  })
})

describe('useRoasterLogoUpdate', () => {
  it('shrinks the logo, uploads it and shows it', async () => {
    const { result, shown } = await watching(useRoasterLogoUpdate)
    const logo = new Blob(['huge'], { type: 'image/png' })

    await result.mutateAsync({ roasterId: squareMile, logo })

    expect(compressPhoto).toHaveBeenCalledWith(logo)
    expect((await stored()).logoUrl).toMatch(
      /^\/api\/photos\/roasters\/[\w-]+\.webp$/,
    )
    expect(shown()?.logoUrl).toBe((await stored()).logoUrl)
  })
})

describe('useRoasterLogoRemoval', () => {
  it('removes the logo and drops it from the roaster', async () => {
    const db = await database()
    await db
      .update(roaster)
      .set({ logoUrl: '/api/photos/roasters/old.webp' })
      .where(eq(roaster.id, squareMile))
    const { result, shown } = await watching(useRoasterLogoRemoval)

    await result.mutateAsync({ roasterId: squareMile })

    expect((await stored()).logoUrl).toBeNull()
    expect(shown()?.logoUrl).toBeNull()
  })
})
