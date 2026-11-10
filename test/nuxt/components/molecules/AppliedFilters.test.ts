import { describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import AppliedFilters from '~/components/molecules/AppliedFilters.vue'
import { tid } from '../../fixtures'

const items = [
  { key: 'DK', label: 'Country: Denmark' },
  { key: 'GB', label: 'Country: United Kingdom' },
]

async function applied() {
  const removed: unknown[] = []
  let cleared = 0
  const wrapper = await mountSuspended(AppliedFilters, {
    props: {
      items,
      testid: 'things',
      onRemove: (item: unknown) => removed.push(item),
      onClear: () => cleared++,
    },
  })

  return { wrapper, removed, cleared: () => cleared }
}

describe('AppliedFilters', () => {
  it('shows each picked value as a chip that names what it removes', async () => {
    const { wrapper } = await applied()
    const chips = wrapper.findAll(tid('things-applied-filter'))

    expect(chips.map(chip => chip.text())).toEqual([
      'Country: Denmark',
      'Country: United Kingdom',
    ])
    expect(chips[1]!.attributes('aria-label')).toBe(
      'Remove Country: United Kingdom',
    )
  })

  it('passes on the chip that was removed', async () => {
    const { wrapper, removed } = await applied()

    await wrapper.findAll(tid('things-applied-filter'))[1]!.trigger('click')

    expect(removed).toEqual([items[1]])
  })

  it('clears everything at once', async () => {
    const { wrapper, cleared } = await applied()

    await wrapper.get(tid('things-filter-clear')).trigger('click')

    expect(wrapper.get(tid('things-filter-clear')).text()).toBe('Clear all')
    expect(cleared()).toBe(1)
  })
})
