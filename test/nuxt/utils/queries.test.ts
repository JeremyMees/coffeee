import { describe, expect, it } from 'vitest'
import { combineQueries } from '#imports'

type Status = 'fetching' | 'paused' | 'idle'

function query<Data>(state: {
  data?: Data
  isError?: boolean
  fetchStatus?: Status
}) {
  const refetched: number[] = []

  return {
    refetched,
    data: ref(state.data),
    isError: ref(state.isError ?? false),
    fetchStatus: ref<Status>(state.fetchStatus ?? 'fetching'),
    refetch: () => refetched.push(1),
  }
}

describe('combineQueries', () => {
  it('has data only once every query has its data', () => {
    const grinders = query({ data: ['Opus'] })
    const methods = query<string[]>({})

    const combined = combineQueries({ grinders, methods })

    expect(combined.data.value).toBeUndefined()

    methods.data.value = ['Espresso']

    expect(combined.data.value).toEqual({
      grinders: ['Opus'],
      methods: ['Espresso'],
    })
  })

  it('fails when a query that has no data failed', () => {
    const combined = combineQueries({
      grinders: query({ data: ['Opus'] }),
      methods: query<string[]>({ isError: true, fetchStatus: 'idle' }),
    })

    expect(combined.isError.value).toBe(true)
  })

  it('does not fail for a refresh of a query that has its data', () => {
    const combined = combineQueries({
      grinders: query({ data: ['Opus'], isError: true }),
    })

    expect(combined.isError.value).toBe(false)
  })

  it('is paused when a query without data is waiting for the network', () => {
    const combined = combineQueries({
      grinders: query({ data: ['Opus'], fetchStatus: 'paused' }),
      methods: query<string[]>({ fetchStatus: 'paused' }),
    })

    expect(combined.fetchStatus.value).toBe('paused')
  })

  it('is fetching while a query without data is loading, idle otherwise', () => {
    const methods = query<string[]>({})
    const combined = combineQueries({ methods })

    expect(combined.fetchStatus.value).toBe('fetching')

    methods.data.value = ['Espresso']

    expect(combined.fetchStatus.value).toBe('idle')
  })

  it('retries only the queries that have no data', async () => {
    const grinders = query({ data: ['Opus'] })
    const methods = query<string[]>({ isError: true, fetchStatus: 'idle' })

    await combineQueries({ grinders, methods }).refetch()

    expect(grinders.refetched).toEqual([])
    expect(methods.refetched).toEqual([1])
  })
})
