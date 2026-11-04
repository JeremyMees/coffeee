import { readFile } from 'node:fs/promises'
import { PGlite } from '@electric-sql/pglite'
import { pg_trgm } from '@electric-sql/pglite/contrib/pg_trgm'
import { drizzle } from 'drizzle-orm/pglite'
import { inject } from 'vitest'
import * as schema from '#server/db/schemas'
import type { TestDatabase } from '#test/support/types'

let opened: ReturnType<typeof openDatabase> | undefined

async function openDatabase() {
  const dump = await readFile(inject('migratedDatabase'))
  const client = new PGlite({
    extensions: { pg_trgm },
    loadDataDir: new Blob([dump]),
  })
  const { rows } = await client.query<{ name: string }>(
    `select tablename as name from pg_tables where schemaname = 'public'`,
  )
  const tables = rows.map(row => `"${row.name}"`)
  const seeded: string[] = []

  await client.exec('create schema seed')
  for (const table of tables) {
    const { rows: found } = await client.query(`select 1 from ${table} limit 1`)
    if (found.length === 0) continue

    await client.exec(`create table seed.${table} as select * from ${table}`)
    seeded.push(table)
  }

  const reset = [
    `truncate ${tables.join(', ')} cascade`,
    ...seeded.map(table => `insert into ${table} select * from seed.${table}`),
  ].join(';\n')

  return { db: drizzle({ client, schema }), client, reset }
}

export async function createTestDatabase() {
  opened ??= openDatabase()
  const { db, client } = await opened

  return { db, client }
}

export async function resetTestDatabase() {
  if (!opened) return

  const { client, reset } = await opened
  if (client.closed) opened = undefined
  else await client.exec(reset)
}

export async function closeTestDatabase() {
  if (!opened) return

  const { client } = await opened
  opened = undefined
  if (!client.closed) await client.close()
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
