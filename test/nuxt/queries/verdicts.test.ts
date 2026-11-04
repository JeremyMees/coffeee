import { describe, expect, it, vi } from 'vitest'
import { useQueryClient } from '@tanstack/vue-query'
import { useVerdictUpdate } from '~/queries/verdicts'
import { findVerdict } from '#server/utils/verdicts'
import { queryKeys } from '#imports'
import { runOn } from '../fixtures'
import { database, scenario, signIn } from '../server'

describe('useVerdictUpdate', () => {
  it('saves the verdict and refreshes every shelf and coffee', async () => {
    const sarah = await scenario.member('Sarah')
    const ayele = await scenario.coffee(sarah.shelf)
    await signIn(sarah)
    const { result, client } = await runOn('/', () => ({
      result: useVerdictUpdate(),
      client: useQueryClient(),
    }))
    const invalidate = vi.spyOn(client, 'invalidateQueries')

    await result.mutateAsync({ coffeeId: ayele.id, verdict: { rating: 4 } })

    expect(
      await findVerdict(await database(), {
        userId: sarah.id,
        coffeeId: ayele.id,
      }),
    ).toEqual({ rating: 4, wouldBuyAgain: false })
    expect(invalidate.mock.calls.map(([filters]) => filters)).toEqual([
      { queryKey: queryKeys.shelves() },
      { queryKey: queryKeys.coffees() },
    ])
  })
})
