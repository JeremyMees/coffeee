import { afterEach, describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import BrowsingSearch from '~/components/molecules/BrowsingSearch.vue'
import { setViewport, tid } from '../../fixtures'

function searchBox(
  props: { shortcut?: boolean; shortPlaceholder?: string } = {},
) {
  const typed: string[] = []
  const mounted = mountSuspended(BrowsingSearch, {
    props: {
      modelValue: '',
      'onUpdate:modelValue': (value: string) => typed.push(value),
      label: 'Search your library',
      placeholder: 'Coffee, roaster…',
      ...props,
    },
    attachTo: document.body,
  })

  return { typed, mounted }
}

afterEach(() => {
  setViewport(1024, 768)
})

describe('BrowsingSearch', () => {
  it('passes on what is typed, under its label', async () => {
    const { typed, mounted } = searchBox()
    const wrapper = await mounted

    await wrapper.get(tid('search-input')).setValue('lime')

    expect(typed).toEqual(['lime'])
    expect(wrapper.text()).toContain('Search your library')
    expect(wrapper.find('kbd').exists()).toBe(false)
  })

  it('shows the shortcut and can be focused', async () => {
    const wrapper = await searchBox({ shortcut: true }).mounted

    ;(wrapper.vm as unknown as { focus: () => void }).focus()

    expect(wrapper.find('kbd').text()).toBe('⌘K')
    expect(document.activeElement).toBe(
      wrapper.get(tid('search-input')).element,
    )
  })

  it('shows the full placeholder on wider screens', async () => {
    const wrapper = await searchBox({ shortPlaceholder: 'Search coffees' })
      .mounted

    expect(wrapper.get(tid('search-input')).attributes('placeholder')).toBe(
      'Coffee, roaster…',
    )
  })

  it('shows the short placeholder on phones', async () => {
    setViewport(390, 844)
    const wrapper = await searchBox({ shortPlaceholder: 'Search coffees' })
      .mounted

    expect(wrapper.get(tid('search-input')).attributes('placeholder')).toBe(
      'Search coffees',
    )
  })

  it('keeps the full placeholder on phones without a short one', async () => {
    setViewport(390, 844)
    const wrapper = await searchBox().mounted

    expect(wrapper.get(tid('search-input')).attributes('placeholder')).toBe(
      'Coffee, roaster…',
    )
  })
})
