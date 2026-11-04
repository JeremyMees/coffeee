import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { useQueryClient } from '@tanstack/vue-query'
import FilterPicker from '~/components/FilterPicker.vue'
import { queryKeys, useNuxtApp } from '#imports'
import type { Member } from '#test/support/types'
import { allByTestId, byTestId, click, tid, type } from '../fixtures'
import { scenario, signIn } from '../server'

let sarah: Member

beforeEach(async () => {
  sarah = await scenario.member('Sarah')
  await signIn(sarah)
})

async function threeRoasters() {
  await scenario.coffee(sarah.shelf, { roaster: 'Tim Wendelboe' })
  await scenario.coffee(sarah.shelf, { roaster: 'Square Mile' })
  await scenario.coffee(sarah.shelf, { roaster: 'La Cabra' })

  return { laCabra: await scenario.roaster(sarah, 'La Cabra') }
}

async function picker(picked: LibraryOption | null = null) {
  const changes: (LibraryOption | null)[] = []
  const wrapper = await mountSuspended(FilterPicker, {
    props: {
      modelValue: picked,
      'onUpdate:modelValue': (changed: LibraryOption | null) =>
        changes.push(changed),
      shelfId: sarah.shelf.id,
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

  it('loads no options until it is opened', async () => {
    await threeRoasters()
    await picker()
    await flushPromises()

    const queries = useNuxtApp().vueApp.runWithContext(() => useQueryClient())

    expect(
      queries.getQueryData(
        queryKeys.filterOptions(sarah.shelf.id, 'library', 'roasters', ''),
      ),
    ).toBeUndefined()
  })

  it('offers the shelf’s roasters by name when opened', async () => {
    await threeRoasters()
    await picker()

    await open()

    expect(options()).toEqual(['La Cabra', 'Square Mile', 'Tim Wendelboe'])
    expect(byTestId('library-filter-more')).toBeNull()
  })

  it('loads the next page of options', async () => {
    for (let number = 1; number <= 21; number++) {
      await scenario.coffee(sarah.shelf, {
        name: `Coffee ${number}`,
        roaster: `Roaster ${String(number).padStart(2, '0')}`,
      })
    }
    await picker()
    await open()
    expect(options()).toHaveLength(20)

    await click('library-filter-more')

    await vi.waitFor(() => expect(options()).toHaveLength(21))
    expect(options().at(-1)).toBe('Roaster 21')
    expect(byTestId('library-filter-more')).toBeNull()
  })

  it('narrows the options to what was typed', async () => {
    await threeRoasters()
    await picker()
    await open()

    await type('library-filter-roasters-search', 'wendel')

    await vi.waitFor(() => expect(options()).toEqual(['Tim Wendelboe']))
  })

  it('says when nothing matches what was typed', async () => {
    await threeRoasters()
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
    const { laCabra } = await threeRoasters()
    const { changes } = await picker()
    await open()

    await click('library-filter-option')

    expect(changes).toEqual([{ value: laCabra, label: 'La Cabra' }])
  })

  it('goes back to any roaster', async () => {
    const { laCabra } = await threeRoasters()
    const { changes } = await picker({ value: laCabra, label: 'La Cabra' })
    await open()

    await click('library-filter-any')

    expect(changes).toEqual([null])
  })

  it('offers the options of the catalog under its own name', async () => {
    await mountSuspended(FilterPicker, {
      props: {
        modelValue: null,
        shelfId: sarah.shelf.id,
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
      ).toEqual(['Light', 'Medium', 'Medium-Dark', 'Dark']),
    )
    await type('catalog-filter-roast-levels-search', 'nope')

    await vi.waitFor(() =>
      expect(byTestId('catalog-filter-none')!.textContent).toContain(
        'Nothing in the catalog matches “nope”',
      ),
    )
  })
})
