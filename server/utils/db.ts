import { attachDatabasePool } from '@vercel/functions'
import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import { useRuntimeConfig } from 'nitropack/runtime'
import * as schema from '../db/schemas'

let db: ReturnType<typeof createDb> | undefined

function createDb() {
  const pool = new Pool({ connectionString: useRuntimeConfig().databaseUrl })

  pool.on('error', error =>
    console.error('Idle database connection failed', error),
  )

  attachDatabasePool(pool)

  return drizzle({ client: pool, schema })
}

export function useDb() {
  db ??= createDb()
  return db
}
