import { afterEach, describe, expect, it } from 'vitest'
import { h } from 'vue'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import FilterBar from '~/components/templates/FilterBar.vue'
import { allByTestId, byTestId, click, setViewport } from '../../fixtures'

function mountBar(count = 0) {
  return mountSuspended(FilterBar, {
    props: { count, testid: 'things' },
    slots: {
      default: () => h('button', { 'data-testid': 'a-filter' }, 'Colour'),
      applied: () => h('p', { 'data-testid': 'picked' }, 'Colour: Red'),
    },
    attachTo: document.body,
  })
}

afterEach(() => {
  setViewport(1024, 768)
})

describe('FilterBar', () => {
  it('shows its filters and what is picked in a row', async () => {
    await mountBar()

    expect(byTestId('things-filters', 'a-filter')!.textContent).toBe('Colour')
    expect(byTestId('picked')!.textContent).toBe('Colour: Red')
    expect(byTestId('things-filters-sheet')).toBeNull()
  })

  it('names the button Filters with no count when nothing is picked', async () => {
    await mountBar()

    const button = byTestId('things-filters-open')!

    expect(button.textContent?.trim()).toBe('Filters')
    expect(button.getAttribute('aria-label')).toBe('Filters')
    expect(button.getAttribute('aria-expanded')).toBe('false')
    expect(byTestId('things-filters-count')).toBeNull()
  })

  it('counts what is picked on the button', async () => {
    await mountBar(3)

    expect(byTestId('things-filters-count')!.textContent?.trim()).toBe('3')
    expect(byTestId('things-filters-open')!.getAttribute('aria-label')).toBe(
      'Filters, 3 picked',
    )
  })

  it('opens the filters in a sheet from the bottom on phones', async () => {
    setViewport(390, 844)
    await mountBar(1)

    await click('things-filters-open')

    expect(byTestId('things-filters-sheet')!.dataset.side).toBe('bottom')
    expect(byTestId('form-sheet-title')!.textContent?.trim()).toBe('Filters')
    expect(allByTestId('a-filter')).toHaveLength(1)
    expect(
      byTestId('things-filters-sheet', 'things-filters', 'a-filter'),
    ).not.toBeNull()
    expect(byTestId('things-filters-sheet', 'picked')).not.toBeNull()
    expect(byTestId('things-filters-open')!.getAttribute('aria-expanded')).toBe(
      'true',
    )
  })

  it('closes the sheet with Done and puts the row back', async () => {
    setViewport(390, 844)
    await mountBar()
    await click('things-filters-open')

    await click('things-filters-done')

    expect(byTestId('things-filters-sheet')).toBeNull()
    expect(byTestId('things-filters', 'a-filter')).not.toBeNull()
  })
})
