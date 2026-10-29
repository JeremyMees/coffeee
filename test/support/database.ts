import { PGlite } from '@electric-sql/pglite'
import { pg_trgm } from '@electric-sql/pglite/contrib/pg_trgm'
import { drizzle } from 'drizzle-orm/pglite'
import { migrate } from 'drizzle-orm/pglite/migrator'

export async function createTestDatabase() {
  const client = new PGlite({ extensions: { pg_trgm } })
  const db = drizzle({ client })

  await migrate(db, { migrationsFolder: 'server/db/migrations' })

  return { db, client }
}
