import { describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import CommunityRating from '~/components/atoms/CommunityRating.vue'
import { tid } from '../../fixtures'

describe('CommunityRating', () => {
  it('shows the average and how many people rated it', async () => {
    const rating = await mountSuspended(CommunityRating, {
      props: { rating: { average: 4.25, raters: 4 } },
    })
    const shown = rating.get(tid('community-rating'))

    expect(shown.attributes('aria-label')).toBe(
      'Community rating 4.3 from 4 people',
    )
    expect(shown.text()).toContain('4.3')
    expect(shown.text()).toContain('(4)')
  })

  it('says when nobody rated the coffee yet', async () => {
    const rating = await mountSuspended(CommunityRating, {
      props: { rating: { average: null, raters: 0 } },
    })

    expect(rating.get(tid('community-rating')).text()).toBe('No ratings yet')
  })
})
