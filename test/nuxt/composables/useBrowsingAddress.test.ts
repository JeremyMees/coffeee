import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useBrowsingAddress, useRouter } from '#imports'
import type { Member } from '#test/support/types'
import { runOn } from '../fixtures'
import { failRequest, scenario, signIn } from '../server'

let sarah: Member

beforeEach(async () => {
  sarah = await scenario.member('Sarah')
  await signIn(sarah)
})

describe('useBrowsingAddress', () => {
  it('starts from the address, naming its filters', async () => {
    const laCabra = await scenario.roaster(sarah, 'La Cabra')
    const address = await runOn(
      `/shelves/${sarah.shelf.id}/discover?q=lime&roasterId=${laCabra}`,
      () => useBrowsingAddress(sarah.shelf.id, catalogAddress),
    )

    expect(await address.start()).toEqual({
      search: 'lime',
      filter: {
        ...emptyCatalogFilter(),
        roaster: { value: laCabra, label: 'La Cabra' },
      },
      sort: 'newest',
    })
  })

  it('keeps the state in the address and remembers the names it picked', async () => {
    const address = await runOn(`/shelves/${sarah.shelf.id}/discover`, () =>
      useBrowsingAddress(sarah.shelf.id, catalogAddress),
    )
    const state = {
      search: 'lime',
      filter: {
        ...emptyCatalogFilter(),
        roaster: { value: 'r1', label: 'La Cabra' },
      },
      sort: 'newest' as const,
    }

    await address.keep(state)
    await vi.waitFor(() =>
      expect(useRouter().currentRoute.value.query).toEqual({
        q: 'lime',
        roasterId: 'r1',
      }),
    )
    failRequest('GET', `/api/shelves/${sarah.shelf.id}/filter-labels`, {
      status: 500,
      message: 'The names are out of reach',
    })
    const back = await runOn(
      `/shelves/${sarah.shelf.id}/discover?q=lime&roasterId=r1`,
      () => useBrowsingAddress(sarah.shelf.id, catalogAddress),
    )

    expect(await back.start()).toEqual(state)
  })
})
