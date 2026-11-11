import { describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import CoffeeReviews from '~/components/organisms/CoffeeReviews.vue'
import { tid } from '../../fixtures'

function review(overrides: Partial<Review> = {}): Review {
  return {
    userId: 'tom',
    name: 'Tom',
    rating: 4,
    wouldBuyAgain: false,
    mine: false,
    updatedAt: '2026-10-01T10:00:00.000Z',
    ...overrides,
  }
}

describe('CoffeeReviews', () => {
  it('shows the community rating and who would buy it again', async () => {
    const reviews = await mountSuspended(CoffeeReviews, {
      props: {
        communityRating: { average: 3.5, raters: 2, wouldBuyAgain: 1 },
        reviews: [],
      },
    })

    expect(reviews.get(tid('coffee-reviews-average')).text()).toBe(
      '3.5 from 2 people',
    )
    expect(reviews.get(tid('coffee-reviews-buy-again')).text()).toBe(
      '1 person would buy it again',
    )
  })

  it('lists each review with its stars and would-buy-again, marking the viewer’s own', async () => {
    const reviews = await mountSuspended(CoffeeReviews, {
      props: {
        communityRating: { average: 4, raters: 1, wouldBuyAgain: 1 },
        reviews: [
          review({ userId: 'ana', name: 'Ana', rating: null, mine: true }),
          review({ wouldBuyAgain: true }),
        ],
      },
    })

    const ana = reviews.get(tid('review-ana'))
    const tom = reviews.get(tid('review-tom'))

    expect(ana.get(tid('rating-stars')).attributes('aria-label')).toBe(
      'Not yet rated',
    )
    expect(ana.find(tid('review-mine')).exists()).toBe(true)
    expect(ana.find(tid('review-buy-again')).exists()).toBe(false)
    expect(tom.get(tid('rating-stars')).attributes('aria-label')).toBe(
      '4 stars',
    )
    expect(tom.find(tid('review-mine')).exists()).toBe(false)
    expect(tom.find(tid('review-buy-again')).exists()).toBe(true)
  })

  it('says when nobody has rated the coffee yet', async () => {
    const reviews = await mountSuspended(CoffeeReviews, {
      props: {
        communityRating: { average: null, raters: 0, wouldBuyAgain: 0 },
        reviews: [],
      },
    })

    expect(reviews.get(tid('coffee-reviews-unrated')).text()).toBe(
      'Nobody has rated this coffee yet.',
    )
    expect(reviews.find(tid('coffee-reviews-average')).exists()).toBe(false)
    expect(reviews.find(tid('coffee-reviews-buy-again')).exists()).toBe(false)
  })
})
