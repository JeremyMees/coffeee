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

async function picker(picked: LibraryOption[] = []) {
  const changes: LibraryOption[][] = []
  const wrapper = await mountSuspended(FilterPicker, {
    props: {
      modelValue: picked,
      'onUpdate:modelValue': (changed: LibraryOption[]) =>
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

  it('keeps its name and counts what was picked, naming the picks for screen readers', async () => {
    const one = await picker([{ value: 'r1', label: 'La Cabra' }])
    const three = await picker([
      { value: 'r1', label: 'La Cabra' },
      { value: 'r2', label: 'Square Mile' },
      { value: 'r3', label: 'Tim Wendelboe' },
    ])
    const chip = three.wrapper.get(tid('library-filter-roasters'))

    expect(one.wrapper.get(tid('library-filter-roasters-count')).text()).toBe(
      '1',
    )
    expect(chip.text()).toBe('Roaster3')
    expect(three.wrapper.get(tid('library-filter-roasters-count')).text()).toBe(
      '3',
    )
    expect(chip.attributes('aria-label')).toBe(
      'Roaster: La Cabra, Square Mile, Tim Wendelboe',
    )
  })

  it('shows no count until something is picked', async () => {
    const { wrapper } = await picker()

    expect(wrapper.find(tid('library-filter-roasters-count')).exists()).toBe(
      false,
    )
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

  it('picks an option and stays open for the next', async () => {
    const { laCabra } = await threeRoasters()
    const { changes } = await picker()
    await open()

    await click('library-filter-option')

    expect(changes).toEqual([[{ value: laCabra, label: 'La Cabra' }]])
    expect(byTestId('library-filter-roasters-list')).not.toBeNull()
  })

  it('adds an option to the ones already picked, and takes a picked one off', async () => {
    const { laCabra } = await threeRoasters()
    const picked = { value: laCabra, label: 'La Cabra' }
    const { changes } = await picker([picked])
    await open()
    await vi.waitFor(() => expect(options()).toHaveLength(3))
    const [cabra, squareMile] = allByTestId('library-filter-option')

    squareMile!.click()
    await vi.waitFor(() => expect(changes).toHaveLength(1))
    cabra!.click()
    await vi.waitFor(() => expect(changes).toHaveLength(2))

    expect(changes[0]).toEqual([
      picked,
      { value: expect.any(String), label: 'Square Mile' },
    ])
    expect(changes[1]).toEqual([])
  })

  it('keeps what was typed while picking', async () => {
    await threeRoasters()
    await picker()
    await open()
    await type('library-filter-roasters-search', 'a')
    await vi.waitFor(() =>
      expect(options()).toEqual(['La Cabra', 'Square Mile']),
    )

    await click('library-filter-option')

    expect(
      (byTestId('library-filter-roasters-search') as HTMLInputElement).value,
    ).toBe('a')
  })

  it('lists what was picked first when opened, and keeps it there while unpicking', async () => {
    const { laCabra } = await threeRoasters()
    const timWendelboe = await scenario.roaster(sarah, 'Tim Wendelboe')
    const { changes } = await picker([
      { value: timWendelboe, label: 'Tim Wendelboe' },
      { value: laCabra, label: 'La Cabra' },
    ])

    await click('library-filter-roasters')
    await vi.waitFor(() => expect(options()).toHaveLength(3))

    expect(options()).toEqual(['Tim Wendelboe', 'La Cabra', 'Square Mile'])
    expect(byTestId('library-filter-pinned-end')).not.toBeNull()

    await click('library-filter-option')

    expect(changes).toEqual([[{ value: laCabra, label: 'La Cabra' }]])
    expect(options()).toEqual(['Tim Wendelboe', 'La Cabra', 'Square Mile'])
  })

  it('lists the options in their own order while searching', async () => {
    const { laCabra } = await threeRoasters()
    await picker([{ value: laCabra, label: 'La Cabra' }])
    await click('library-filter-roasters')
    await vi.waitFor(() => expect(options()).toHaveLength(3))

    await type('library-filter-roasters-search', 'a')

    await vi.waitFor(() =>
      expect(options()).toEqual(['La Cabra', 'Square Mile']),
    )
    expect(byTestId('library-filter-pinned-end')).toBeNull()
  })

  it('goes back to any roaster', async () => {
    const { laCabra } = await threeRoasters()
    const { changes } = await picker([
      { value: laCabra, label: 'La Cabra' },
      { value: 'r2', label: 'Square Mile' },
    ])
    await open()

    await click('library-filter-any')

    expect(changes).toEqual([[]])
  })

  it('offers the options of the catalog under its own name', async () => {
    await mountSuspended(FilterPicker, {
      props: {
        modelValue: [],
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
