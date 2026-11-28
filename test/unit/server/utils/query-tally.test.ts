import { createApp, createError, eventHandler, toWebHandler } from 'h3'
import { describe, expect, it } from 'vitest'
import {
  newTally,
  reportQueries,
  serverTiming,
  talliedClient,
  tallyQueries,
  withQueryTally,
} from '#server/utils/query-tally'

function fakeClient() {
  return {
    name: 'fake',
    async query(sql: string, wait = 0) {
      await new Promise(resolve => setTimeout(resolve, wait))

      return sql
    },
    async connect() {
      return fakeClient()
    },
    async end() {},
    async transaction<T>(run: (tx: ReturnType<typeof fakeClient>) => T) {
      return run(fakeClient())
    },
  }
}

describe('talliedClient', () => {
  it('counts and times the queries made inside a tally', async () => {
    const client = talliedClient(fakeClient())
    const tally = newTally()

    const answers = await tallyQueries(tally, async () => [
      await client.query('select 1', 5),
      await client.query('select 2'),
    ])

    expect(answers).toEqual(['select 1', 'select 2'])
    expect(tally.queries).toBe(2)
    expect(tally.milliseconds).toBeGreaterThan(0)
  })

  it('counts nothing outside a tally', async () => {
    const client = talliedClient(fakeClient())
    const tally = newTally()

    await client.query('select 1')

    expect(tally).toEqual({ queries: 0, milliseconds: 0 })
  })

  it('counts a query that fails', async () => {
    const client = talliedClient({
      query: () => Promise.reject(new Error('broken')),
    })
    const tally = newTally()

    await expect(tallyQueries(tally, () => client.query())).rejects.toThrow(
      'broken',
    )
    expect(tally.queries).toBe(1)
  })

  it('keeps the counts of requests running at the same time apart', async () => {
    const client = talliedClient(fakeClient())
    const first = newTally()
    const second = newTally()

    await Promise.all([
      tallyQueries(first, async () => {
        await client.query('a', 10)
        await client.query('b', 10)
        await client.query('c', 10)
      }),
      tallyQueries(second, async () => {
        await client.query('d', 5)
      }),
    ])

    expect(first.queries).toBe(3)
    expect(second.queries).toBe(1)
  })

  it('counts the queries of a connection taken from a pool', async () => {
    const pool = talliedClient(fakeClient())
    const tally = newTally()

    await tallyQueries(tally, async () => {
      const connection = await pool.connect()
      await connection.query('begin')
      await connection.query('commit')
    })

    expect(tally.queries).toBe(2)
  })

  it('leaves a connect that returns nothing alone', async () => {
    const client = talliedClient({ connect: async () => undefined })

    expect(await client.connect()).toBeUndefined()
  })

  it('counts the queries inside a transaction', async () => {
    const client = talliedClient(fakeClient())
    const tally = newTally()

    await tallyQueries(tally, () =>
      client.transaction(async tx => {
        await tx.query('insert')
        await tx.query('update')
      }),
    )

    expect(tally.queries).toBe(2)
  })

  it('passes other methods and values through', async () => {
    const client = talliedClient(fakeClient())

    expect(client.name).toBe('fake')
    await expect(client.end()).resolves.toBeUndefined()
  })
})

describe('serverTiming', () => {
  it('reports the database time and the number of queries', () => {
    expect(serverTiming({ queries: 4, milliseconds: 12.345 })).toBe(
      'db;dur=12.3;desc="4 queries"',
    )
  })

  it('says query for a single one', () => {
    expect(serverTiming({ queries: 1, milliseconds: 2 })).toBe(
      'db;dur=2.0;desc="1 query"',
    )
  })
})

describe('withQueryTally', () => {
  const client = talliedClient(fakeClient())

  function serve(handler: Parameters<typeof eventHandler>[0]) {
    const app = createApp({ onBeforeResponse: reportQueries }).use(
      eventHandler(handler),
    )
    app.handler = withQueryTally(app.handler)

    return (path: string) =>
      toWebHandler(app)(new Request(`http://localhost:3000${path}`))
  }

  it('adds the queries of an API request to its response', async () => {
    const request = serve(async () => {
      await client.query('select 1')
      await client.query('select 2')

      return { ok: true }
    })

    const response = await request('/api/coffees')

    expect(response.headers.get('server-timing')).toMatch(
      /^db;dur=\d+\.\d;desc="2 queries"$/,
    )
  })

  it('adds the queries to an API request that fails', async () => {
    const request = serve(async () => {
      await client.query('select 1')

      throw createError({ statusCode: 401 })
    })

    const response = await request('/api/me')

    expect(response.status).toBe(401)
    expect(response.headers.get('server-timing')).toMatch(/desc="1 query"$/)
  })

  it('leaves pages alone', async () => {
    const request = serve(async () => {
      await client.query('select 1')

      return 'page'
    })

    const response = await request('/shelves')

    expect(response.headers.get('server-timing')).toBeNull()
  })
})
