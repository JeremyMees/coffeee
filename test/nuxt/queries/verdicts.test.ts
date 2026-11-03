import { describe, expect, it, vi } from 'vitest'
import { registerEndpoint } from '@nuxt/test-utils/runtime'
import { useQueryClient } from '@tanstack/vue-query'
import { readBody } from 'h3'
import { useVerdictUpdate } from '~/queries/verdicts'
import { queryKeys } from '#imports'
import { runOn } from '../fixtures'

const calls: unknown[] = []

registerEndpoint('/api/coffees/c1/verdict', {
  method: 'PATCH',
  handler: async event => {
    calls.push(await readBody(event))

    return { rating: 4, wouldBuyAgain: false }
  },
})

describe('useVerdictUpdate', () => {
  it('saves the verdict and refreshes every shelf and coffee', async () => {
    const { result, client } = await runOn('/', () => ({
      result: useVerdictUpdate(),
      client: useQueryClient(),
    }))
    const invalidate = vi.spyOn(client, 'invalidateQueries')

    await result.mutateAsync({ coffeeId: 'c1', verdict: { rating: 4 } })

    expect(calls).toEqual([{ rating: 4 }])
    expect(invalidate.mock.calls.map(([filters]) => filters)).toEqual([
      { queryKey: queryKeys.shelves() },
      { queryKey: queryKeys.coffees() },
    ])
  })
})
