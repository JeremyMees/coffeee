import { attachDatabasePool } from '@vercel/functions'
import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import { useRuntimeConfig } from 'nitropack/runtime'
import * as schema from '#server/db/schemas'

let db: ReturnType<typeof connectDb> | undefined

export function connectDb(connectionString: string) {
  const pool = new Pool({ connectionString })

  pool.on('error', error =>
    console.error('Idle database connection failed', error),
  )

  attachDatabasePool(pool)

  return drizzle({ client: pool, schema })
}

export function useDb() {
  db ??= connectDb(useRuntimeConfig().databaseUrl)
  return db
}
