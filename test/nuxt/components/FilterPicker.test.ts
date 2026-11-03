import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import FilterPicker from '~/components/FilterPicker.vue'
import { api, fakeApi, resetApi } from '../fake-api'
import { allByTestId, byTestId, click, tid, type } from '../fixtures'

fakeApi()

beforeEach(() => {
  resetApi()
})

async function picker(picked: LibraryOption | null = null) {
  const changes: (LibraryOption | null)[] = []
  const wrapper = await mountSuspended(FilterPicker, {
    props: {
      modelValue: picked,
      'onUpdate:modelValue': (changed: LibraryOption | null) =>
        changes.push(changed),
      shelfId: 'home',
      area: 'library',
      kind: 'roasters',
      label: 'Roaster',
    },
    attachTo: document.body,
  })

  return { wrapper, changes }
}

function options() {
  return allByTestId('library-filter-option').map(option =>
    option.textContent?.trim(),
  )
}

async function open() {
  await click('library-filter-roasters')
  await vi.waitFor(() => expect(options()).not.toEqual([]))
}

describe('FilterPicker', () => {
  it('shows the filter name until something is picked', async () => {
    const { wrapper } = await picker()
    const chip = wrapper.get(tid('library-filter-roasters'))

    expect(chip.text()).toBe('Roaster')
    expect(chip.attributes('aria-label')).toBe('Roaster')
  })

  it('shows what was picked and names the filter for screen readers', async () => {
    const { wrapper } = await picker({ value: 'r1', label: 'La Cabra' })
    const chip = wrapper.get(tid('library-filter-roasters'))

    expect(chip.text()).toBe('La Cabra')
    expect(chip.attributes('aria-label')).toBe('Roaster: La Cabra')
  })

  it('asks for nothing until it is opened', async () => {
    await picker()
    await flushPromises()

    expect(api.libraryFilterQueries).toEqual([])
  })

  it('offers the first page of options when opened', async () => {
    await picker()

    await open()

    expect(options()).toEqual(['La Cabra', 'Square Mile'])
    expect(api.libraryFilterQueries[0]).toMatchObject({
      kind: 'roasters',
      search: '',
      page: '0',
    })
  })

  it('loads the next page of options', async () => {
    await picker()
    await open()

    await click('library-filter-more')

    await vi.waitFor(() =>
      expect(options()).toEqual(['La Cabra', 'Square Mile', 'Tim Wendelboe']),
    )
    expect(byTestId('library-filter-more')).toBeNull()
  })

  it('narrows the options to what was typed', async () => {
    await picker()
    await open()

    await type('library-filter-roasters-search', 'wendel')

    await vi.waitFor(() => expect(options()).toEqual(['Tim Wendelboe']))
    expect(api.libraryFilterQueries).toContainEqual(
      expect.objectContaining({ search: 'wendel' }),
    )
  })

  it('says when nothing matches what was typed', async () => {
    await picker()
    await open()

    await type('library-filter-roasters-search', 'nope')

    await vi.waitFor(() =>
      expect(byTestId('library-filter-none')!.textContent).toContain(
        'Nothing in your library matches “nope”',
      ),
    )
  })

  it('picks an option', async () => {
    const { changes } = await picker()
    await open()

    await click('library-filter-option')

    expect(changes).toEqual([{ value: 'r1', label: 'La Cabra' }])
  })

  it('goes back to any roaster', async () => {
    const { changes } = await picker({ value: 'r1', label: 'La Cabra' })
    await open()

    await click('library-filter-any')

    expect(changes).toEqual([null])
  })

  it('offers the options of the catalog under its own name', async () => {
    await mountSuspended(FilterPicker, {
      props: {
        modelValue: null,
        shelfId: 'home',
        area: 'catalog',
        kind: 'roast-levels',
        label: 'Roast level',
      },
      attachTo: document.body,
    })

    await click('catalog-filter-roast-levels')
    expect(
      byTestId('catalog-filter-roast-levels-search')!.getAttribute(
        'placeholder',
      ),
    ).toBe('Search roast levels')
    await vi.waitFor(() =>
      expect(
        allByTestId('catalog-filter-option').map(option =>
          option.textContent?.trim(),
        ),
      ).toEqual(['Light', 'Medium']),
    )
    await type('catalog-filter-roast-levels-search', 'dark')

    await vi.waitFor(() =>
      expect(byTestId('catalog-filter-none')!.textContent).toContain(
        'Nothing in the catalog matches “dark”',
      ),
    )
    expect(api.catalogFilterQueries[0]).toMatchObject({ kind: 'roast-levels' })
    expect(api.libraryFilterQueries).toEqual([])
  })
})
