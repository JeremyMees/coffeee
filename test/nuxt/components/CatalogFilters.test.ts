import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import CatalogFilters from '~/components/CatalogFilters.vue'
import type { Member } from '#test/support/types'
import { allByTestId, click, tid } from '../fixtures'
import { scenario, signIn } from '../server'

let sarah: Member

beforeEach(async () => {
  sarah = await scenario.member('Sarah')
  await signIn(sarah)
})

const laCabra = { value: 'r1', label: 'La Cabra' }

async function filters(filter: Partial<CatalogFilter> = {}) {
  const changes: CatalogFilter[] = []
  const wrapper = await mountSuspended(CatalogFilters, {
    props: {
      modelValue: { ...emptyCatalogFilter(), ...filter },
      'onUpdate:modelValue': (changed: CatalogFilter) => changes.push(changed),
      shelfId: sarah.shelf.id,
    },
    attachTo: document.body,
  })

  return { wrapper, changes }
}

describe('CatalogFilters', () => {
  it('turns Mine on and shows it as on', async () => {
    const { wrapper, changes } = await filters()

    await wrapper.get(tid('catalog-filter-mine')).trigger('click')

    expect(changes).toEqual([{ ...emptyCatalogFilter(), mine: true }])
    expect(
      (await filters({ mine: true })).wrapper
        .get(tid('catalog-filter-mine'))
        .attributes('aria-pressed'),
    ).toBe('true')
  })

  it('has a chip for flavor note, origin, roaster, process, roast level and roasted for', async () => {
    const { wrapper } = await filters()

    expect(
      catalogFilters.map(kind =>
        wrapper.get(tid(`catalog-filter-${kind}`)).text(),
      ),
    ).toEqual([
      'Flavor note',
      'Origin',
      'Roaster',
      'Process',
      'Roast level',
      'Roasted for',
    ])
  })

  it('combines a picked chip with the others', async () => {
    const { changes } = await filters({ mine: true, roaster: laCabra })

    await click('catalog-filter-roasted-for')
    const option = await vi.waitFor(() => {
      const found = allByTestId('catalog-filter-option').find(
        element => element.textContent?.trim() === 'Espresso',
      )
      if (!found) throw new Error('No Espresso option')

      return found
    })
    option.click()

    await vi.waitFor(() =>
      expect(changes).toEqual([
        {
          ...emptyCatalogFilter(),
          mine: true,
          roaster: laCabra,
          roastedFor: { value: 'espresso', label: 'Espresso' },
        },
      ]),
    )
  })

  it('clears every filter, and only offers to when one is on', async () => {
    const { wrapper } = await filters()
    expect(wrapper.find(tid('catalog-filter-clear')).exists()).toBe(false)

    const filtered = await filters({ mine: true, roaster: laCabra })
    await filtered.wrapper.get(tid('catalog-filter-clear')).trigger('click')

    expect(filtered.changes).toEqual([emptyCatalogFilter()])
  })
})
