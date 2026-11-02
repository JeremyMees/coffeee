import { readFile } from 'node:fs/promises'
import { PGlite } from '@electric-sql/pglite'
import { pg_trgm } from '@electric-sql/pglite/contrib/pg_trgm'
import { drizzle } from 'drizzle-orm/pglite'
import { inject } from 'vitest'
import * as schema from '#server/db/schemas'
import type { TestDatabase } from '#test/support/types'

let migrated: Promise<PGlite> | undefined

async function loadMigrated() {
  const dump = await readFile(inject('migratedDatabase'))

  const template = new PGlite({
    extensions: { pg_trgm },
    loadDataDir: new Blob([dump]),
  })
  await template.waitReady

  return template
}

export async function createTestDatabase() {
  migrated ??= loadMigrated()
  const client = (await (await migrated).clone()) as PGlite
  const db = drizzle({ client, schema })

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
