import { sql } from 'drizzle-orm'
import type { SQL } from 'drizzle-orm'

interface Queryable {
  execute: (query: SQL) => PromiseLike<unknown>
}

export type Health =
  | { status: 'ok'; database: 'reachable' }
  | { status: 'error'; database: 'unreachable' }

export async function checkHealth(db: Queryable): Promise<Health> {
  try {
    await db.execute(sql`select 1`)

    return { status: 'ok', database: 'reachable' }
  } catch {
    return { status: 'error', database: 'unreachable' }
  }
}
