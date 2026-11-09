import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useBrowsingAddress, useRouter } from '#imports'
import type { Member } from '#test/support/types'
import { runOn } from '../fixtures'
import { failRequest, holdRequest, scenario, signIn } from '../server'

let sarah: Member

beforeEach(async () => {
  sarah = await scenario.member('Sarah')
  await signIn(sarah)
})

describe('useBrowsingAddress', () => {
  it('starts from the address straight away and names its filters once known', async () => {
    const laCabra = await scenario.roaster(sarah, 'La Cabra')
    const address = await runOn(
      `/shelves/${sarah.shelf.id}/discover?q=lime&roasterId=${laCabra}`,
      () => useBrowsingAddress(sarah.shelf.id, catalogAddress),
    )
    const named = vi.fn()

    expect(address.initial).toEqual({
      search: 'lime',
      filter: {
        ...emptyBrowsingFilter(),
        roaster: [{ value: laCabra, label: '' }],
      },
      sort: 'newest',
    })

    address.whenNamed(named)

    await vi.waitFor(() =>
      expect(named).toHaveBeenCalledWith({
        ...emptyBrowsingFilter(),
        roaster: [{ value: laCabra, label: 'La Cabra' }],
      }),
    )
    expect(named).toHaveBeenCalledTimes(1)
  })

  it('keeps the state in the address and remembers the names it picked', async () => {
    const address = await runOn(`/shelves/${sarah.shelf.id}/discover`, () =>
      useBrowsingAddress(sarah.shelf.id, catalogAddress),
    )
    const state = {
      search: 'lime',
      filter: {
        ...emptyBrowsingFilter(),
        roaster: [{ value: 'r1', label: 'La Cabra' }],
        flavorNote: [
          { value: 'n1', label: 'Lime' },
          { value: 'n2', label: 'Jasmine' },
        ],
      },
      sort: 'newest' as const,
    }

    await address.keep(state)
    await vi.waitFor(() =>
      expect(useRouter().currentRoute.value.query).toEqual({
        q: 'lime',
        flavorNoteId: ['n1', 'n2'],
        roasterId: 'r1',
      }),
    )
    failRequest('GET', `/api/shelves/${sarah.shelf.id}/filter-labels`, {
      status: 500,
      message: 'The names are out of reach',
    })
    const back = await runOn(
      `/shelves/${sarah.shelf.id}/discover?q=lime&flavorNoteId=n1&flavorNoteId=n2&roasterId=r1`,
      () => useBrowsingAddress(sarah.shelf.id, catalogAddress),
    )

    const named = vi.fn()
    back.whenNamed(named)

    expect(back.initial).toEqual(state)
    expect(named).not.toHaveBeenCalled()
  })

  it('remembers no names before it knows them', async () => {
    const laCabra = await scenario.roaster(sarah, 'La Cabra')
    const route = `/shelves/${sarah.shelf.id}/discover?roasterId=${laCabra}`
    const hold = holdRequest(
      'GET',
      `/api/shelves/${sarah.shelf.id}/filter-labels`,
    )
    const address = await runOn(route, () =>
      useBrowsingAddress(sarah.shelf.id, catalogAddress),
    )

    await address.keep({ ...address.initial, search: 'lime' })
    hold.release()
    const named = vi.fn()
    address.whenNamed(named)

    await vi.waitFor(() =>
      expect(named).toHaveBeenCalledWith({
        ...emptyBrowsingFilter(),
        roaster: [{ value: laCabra, label: 'La Cabra' }],
      }),
    )
  })
})
