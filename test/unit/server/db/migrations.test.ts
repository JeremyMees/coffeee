import { readFileSync } from 'node:fs'
import { PGlite } from '@electric-sql/pglite'
import { pg_trgm } from '@electric-sql/pglite/contrib/pg_trgm'
import { describe, expect, it } from 'vitest'

async function migrateTo(client: PGlite, tag: string) {
  await client.exec(readFileSync(`server/db/migrations/${tag}.sql`, 'utf8'))
}

describe('the shelves migration', () => {
  it('gives every existing user a shelf of their own', async () => {
    const client = new PGlite({ extensions: { pg_trgm } })
    await migrateTo(client, '0000_pg_trgm')
    await migrateTo(client, '0001_auth_and_invites')
    await client.exec(`
      insert into "user" ("id", "name", "email")
      values ('user-1', 'Sarah Jones', 'sarah@example.com'),
             ('user-2', 'Tom', 'tom@example.com')
    `)

    await migrateTo(client, '0002_shelves')

    const { rows } = await client.query(`
      select "shelf"."name", "shelf"."ownerId", "shelfMember"."userId"
      from "shelf"
      join "shelfMember" on "shelfMember"."shelfId" = "shelf"."id"
      order by "shelf"."ownerId"
    `)

    expect(rows).toEqual([
      { name: "Sarah's shelf", ownerId: 'user-1', userId: 'user-1' },
      { name: "Tom's shelf", ownerId: 'user-2', userId: 'user-2' },
    ])
  })
})
