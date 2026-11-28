import { AsyncLocalStorage } from 'node:async_hooks'
import { setResponseHeader } from 'h3'
import type { EventHandler, H3Event } from 'h3'
import type { QueryTally } from '#server/types/query-tally'

type Method = (...args: unknown[]) => unknown

const tallies = new AsyncLocalStorage<QueryTally>()

export function newTally(): QueryTally {
  return { queries: 0, milliseconds: 0 }
}

export function tallyQueries<T>(tally: QueryTally, run: () => T) {
  return tallies.run(tally, run)
}

async function timed(query: () => unknown) {
  const tally = tallies.getStore()
  if (!tally) return query()

  const started = performance.now()

  try {
    return await query()
  } finally {
    tally.queries += 1
    tally.milliseconds += performance.now() - started
  }
}

export function talliedClient<T extends object>(client: T): T {
  return new Proxy(client, {
    get(target, key) {
      const value: unknown = Reflect.get(target, key, target)
      if (typeof value !== 'function') return value

      const method = value as Method

      if (key === 'query') {
        return (...args: unknown[]) => timed(() => method.apply(target, args))
      }

      if (key === 'connect') {
        return async (...args: unknown[]) => {
          const connected = await method.apply(target, args)

          return connected && typeof connected === 'object'
            ? talliedClient(connected)
            : connected
        }
      }

      if (key === 'transaction') {
        return (run: Method, ...rest: unknown[]) =>
          method.call(target, (tx: object) => run(talliedClient(tx)), ...rest)
      }

      return method.bind(target)
    },
  })
}

export function serverTiming({ queries, milliseconds }: QueryTally) {
  const counted = `${queries} ${queries === 1 ? 'query' : 'queries'}`

  return `db;dur=${milliseconds.toFixed(1)};desc="${counted}"`
}

function isApiRequest(event: H3Event) {
  return event.path.startsWith('/api/')
}

export function reportQueries(event: H3Event) {
  const tally = event.context.queryTally
  if (!tally || event.node.res.headersSent) return

  setResponseHeader(event, 'Server-Timing', serverTiming(tally))
}

export function withQueryTally(handler: EventHandler): EventHandler {
  return async event => {
    if (!isApiRequest(event)) return handler(event)

    const tally = newTally()
    event.context.queryTally = tally

    try {
      return await tallyQueries(tally, () => handler(event))
    } catch (error) {
      reportQueries(event)
      throw error
    }
  }
}
