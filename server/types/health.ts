import type { SQL } from 'drizzle-orm'

export interface Queryable {
  execute: (query: SQL) => PromiseLike<unknown>
}

export type Health =
  | { status: 'ok'; database: 'reachable' }
  | { status: 'error'; database: 'unreachable' }
