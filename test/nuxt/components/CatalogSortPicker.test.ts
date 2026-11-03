import { describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import CatalogSortPicker from '~/components/CatalogSortPicker.vue'
import { tid } from '../fixtures'

describe('CatalogSortPicker', () => {
  it('offers newest and community rating, marking the picked one', async () => {
    const picker = await mountSuspended(CatalogSortPicker, {
      props: { modelValue: 'newest' },
    })

    expect(picker.get(tid('catalog-sort')).text()).toBe(
      'NewestCommunity rating',
    )
    expect(
      picker.get(tid('catalog-sort-newest')).attributes('aria-pressed'),
    ).toBe('true')
    expect(
      picker
        .get(tid('catalog-sort-communityRating'))
        .attributes('aria-pressed'),
    ).toBe('false')
  })

  it('picks another sort', async () => {
    const picker = await mountSuspended(CatalogSortPicker, {
      props: { modelValue: 'newest' },
    })

    await picker.get(tid('catalog-sort-communityRating')).trigger('click')

    expect(picker.emitted('update:modelValue')).toEqual([['communityRating']])
  })
})
