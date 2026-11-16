import { describe, expect, it } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import LibrarySortPicker from '~/components/molecules/LibrarySortPicker.vue'
import { byTestId, tid } from '../../fixtures'

async function picker(
  scope: LibraryScope,
  modelValue: LibrarySort | null = null,
) {
  const picks: (LibrarySort | null)[] = []
  const wrapper = await mountSuspended(LibrarySortPicker, {
    props: {
      scope,
      modelValue,
      'onUpdate:modelValue': (sort: LibrarySort | null) => picks.push(sort),
    },
    attachTo: document.body,
  })

  return { wrapper, picks }
}

async function open(wrapper: Awaited<ReturnType<typeof picker>>['wrapper']) {
  await wrapper.get(tid('library-sort')).trigger('keydown', { key: 'Enter' })
  await flushPromises()

  return [
    ...document.querySelectorAll('[data-testid^="library-sort-option-"]'),
  ].map(option => option.textContent?.trim())
}

describe('LibrarySortPicker', () => {
  it('shows the side’s own order when nothing was picked', async () => {
    expect((await picker('all')).wrapper.text()).toContain('Newest')
    expect((await picker('bought')).wrapper.text()).toContain('Last bought')
  })

  it('shows the picked sort', async () => {
    const { wrapper } = await picker('all', {
      column: 'communityRating',
      direction: 'descending',
    })

    expect(wrapper.text()).toContain('Community rating')
  })

  it.each([
    [
      'all',
      [
        'Newest',
        'Your rating',
        'Community rating',
        'Roaster',
        'Origin',
        'Roast level',
        'Roasted for',
      ],
    ],
    [
      'bought',
      [
        'Newest',
        'Last bought',
        'Your rating',
        'Community rating',
        'Roaster',
        'Origin',
        'Roast level',
        'Roasted for',
        'Latest price',
      ],
    ],
  ] as const)('offers the sorts of the %s side', async (scope, sorts) => {
    const { wrapper } = await picker(scope)

    expect(await open(wrapper)).toEqual(sorts)
    wrapper.unmount()
  })

  it('picks a sort in its natural direction', async () => {
    const { wrapper, picks } = await picker('bought')
    await open(wrapper)

    byTestId('library-sort-option-rating')!.click()
    await flushPromises()

    expect(picks).toEqual([{ column: 'rating', direction: 'descending' }])
    wrapper.unmount()
  })

  it('picks no sort for the side’s own order', async () => {
    const { wrapper, picks } = await picker('bought', {
      column: 'rating',
      direction: 'descending',
    })
    await open(wrapper)

    byTestId('library-sort-option-lastBought')!.click()
    await flushPromises()

    expect(picks).toEqual([null])
    wrapper.unmount()
  })
})
