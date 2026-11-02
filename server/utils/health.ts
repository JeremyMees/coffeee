import { sql } from 'drizzle-orm'
import type { Health, Queryable } from '#server/types/health'

export async function checkHealth(db: Queryable): Promise<Health> {
  try {
    await db.execute(sql`select 1`)

    return { status: 'ok', database: 'reachable' }
  } catch (error) {
    console.error('Database health check failed', error)

    return { status: 'error', database: 'unreachable' }
  }
}
