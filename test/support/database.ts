import { PGlite } from '@electric-sql/pglite'
import { pg_trgm } from '@electric-sql/pglite/contrib/pg_trgm'
import { drizzle } from 'drizzle-orm/pglite'
import { migrate } from 'drizzle-orm/pglite/migrator'
import * as schema from '#server/db/schemas'
import type { TestDatabase } from '#test/support/types'

export async function createTestDatabase() {
  const client = new PGlite({ extensions: { pg_trgm } })
  const db = drizzle({ client, schema })
  await migrate(db, { migrationsFolder: 'server/db/migrations' })

  return { db, client }
}

export async function createTestUser(
  db: TestDatabase,
  overrides: Partial<typeof schema.user.$inferInsert> = {},
) {
  const [created] = await db
    .insert(schema.user)
    .values({
      id: crypto.randomUUID(),
      name: 'Jeremy',
      email: `${crypto.randomUUID()}@example.com`,
      role: 'user',
      ...overrides,
    })
    .returning()

  return created!
}
