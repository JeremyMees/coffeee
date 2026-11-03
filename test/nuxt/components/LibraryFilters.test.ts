import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import LibraryFilters from '~/components/LibraryFilters.vue'
import { fakeApi, resetApi } from '../fake-api'
import { allByTestId, click, tid } from '../fixtures'

fakeApi()

beforeEach(() => {
  resetApi()
})

const laCabra = { value: 'r1', label: 'La Cabra' }

async function filters(filter: Partial<LibraryFilter> = {}) {
  const changes: LibraryFilter[] = []
  const wrapper = await mountSuspended(LibraryFilters, {
    props: {
      modelValue: { ...emptyLibraryFilter(), ...filter },
      'onUpdate:modelValue': (changed: LibraryFilter) => changes.push(changed),
      shelfId: 'home',
    },
    attachTo: document.body,
  })

  return { wrapper, changes }
}

describe('LibraryFilters', () => {
  it('turns Favourites on', async () => {
    const { wrapper, changes } = await filters()

    await wrapper.get(tid('library-filter-favourites')).trigger('click')

    expect(changes).toEqual([{ ...emptyLibraryFilter(), favourites: true }])
  })

  it('shows Favourites as on', async () => {
    const { wrapper } = await filters({ favourites: true })

    expect(
      wrapper.get(tid('library-filter-favourites')).attributes('aria-pressed'),
    ).toBe('true')
  })

  it('has a searchable picker for roasters, flavor notes and origins', async () => {
    const { wrapper } = await filters()

    expect(
      ['roasters', 'flavor-notes', 'origins'].map(kind =>
        wrapper.get(tid(`library-filter-${kind}`)).text(),
      ),
    ).toEqual(['Roaster', 'Flavor note', 'Origin'])
  })

  it('keeps the other filters when picking one', async () => {
    const { changes } = await filters({ favourites: true })

    await click('library-filter-origins')
    await vi.waitFor(() =>
      expect(allByTestId('library-filter-option')).toHaveLength(2),
    )
    await click('library-filter-option')

    expect(changes).toEqual([
      {
        ...emptyLibraryFilter(),
        favourites: true,
        origin: { value: 'CO', label: 'Colombia' },
      },
    ])
  })

  it('clears every filter at once', async () => {
    const { wrapper, changes } = await filters({
      favourites: true,
      roaster: laCabra,
    })

    await wrapper.get(tid('library-filter-clear')).trigger('click')

    expect(changes).toEqual([emptyLibraryFilter()])
  })

  it('offers no clearing without a filter', async () => {
    const { wrapper } = await filters()

    expect(wrapper.find(tid('library-filter-clear')).exists()).toBe(false)
  })
})
