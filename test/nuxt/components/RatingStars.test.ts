import { describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import RatingStars from '~/components/RatingStars.vue'
import { tid } from '../fixtures'

describe('RatingStars', () => {
  it('fills as many stars as the rating', async () => {
    const stars = await mountSuspended(RatingStars, { props: { rating: 3 } })
    const shown = stars.get(tid('rating-stars'))

    expect(shown.attributes('aria-label')).toBe('3 stars')
    expect(shown.findAll('svg.fill-current')).toHaveLength(3)
    expect(shown.findAll('svg')).toHaveLength(5)
  })

  it('says when the coffee is not yet rated', async () => {
    const stars = await mountSuspended(RatingStars, { props: { rating: null } })

    expect(stars.get(tid('rating-stars')).text()).toBe('Not yet rated')
    expect(stars.find('svg').exists()).toBe(false)
  })
})
