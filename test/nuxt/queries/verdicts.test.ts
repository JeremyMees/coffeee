import { describe, expect, it } from 'vitest'
import { useProfileStats } from '~/queries/account'
import { useCoffeeReviews, useCoffeeVerdict } from '~/queries/coffees'
import { useVerdictUpdate } from '~/queries/verdicts'
import { findVerdict } from '#server/utils/verdicts'
import { runOn } from '../fixtures'
import { database, scenario, signIn } from '../server'

describe('useVerdictUpdate', () => {
  it('saves the verdict and shows it on the coffee and in the stats', async () => {
    const sarah = await scenario.member('Sarah')
    const ayele = await scenario.coffee(sarah.shelf)
    await signIn(sarah)
    const { result, stats, verdict, reviews } = await runOn('/', () => ({
      result: useVerdictUpdate(),
      stats: useProfileStats(),
      verdict: useCoffeeVerdict(ayele.id),
      reviews: useCoffeeReviews(ayele.id),
    }))
    await Promise.all([
      stats.suspense(),
      verdict.suspense(),
      reviews.suspense(),
    ])

    await result.mutateAsync({ coffeeId: ayele.id, verdict: { rating: 4 } })

    expect(
      await findVerdict(await database(), {
        userId: sarah.id,
        coffeeId: ayele.id,
      }),
    ).toEqual({ rating: 4, wouldBuyAgain: false })
    expect(verdict.data.value).toMatchObject({ rating: 4 })
    expect(reviews.data.value).toMatchObject({
      communityRating: { average: 4, raters: 1 },
    })
    expect(stats.data.value).toMatchObject({ rated: 1, averageRating: 4 })
  })
})
