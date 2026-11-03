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

describe('the personal verdicts migrations', () => {
  it('moves each shelf verdict to the member who last changed it', async () => {
    const client = new PGlite({ extensions: { pg_trgm } })

    for (const tag of [
      '0000_pg_trgm',
      '0001_auth_and_invites',
      '0002_shelves',
      '0003_coffees_and_purchases',
      '0004_origins_regions_and_altitude',
      '0005_producers_farms_and_washing_stations',
      '0006_processes_varietals_and_link',
      '0007_flavor_notes',
      '0008_coffee_photo',
      '0009_rating_and_would_buy_again',
      '0010_grinders_brew_methods_and_grind_settings',
      '0011_roaster_details',
    ]) {
      await migrateTo(client, tag)
    }

    await client.exec(`
      insert into "user" ("id", "name", "email")
      values ('sarah', 'Sarah', 'sarah@example.com'),
             ('tom', 'Tom', 'tom@example.com');
      insert into "shelf" ("id", "name", "ownerId")
      values ('home', 'Home', 'sarah'), ('work', 'Work', 'sarah');
      insert into "roaster" ("id", "name", "nameKey")
      values ('mok', 'Mok', 'mok');
      insert into "coffee" ("id", "roasterId", "name", "nameKey", "roastLevel", "roastedFor", "colour")
      values ('gascon', 'mok', 'Finca Gascon', 'finca gascon', 'light', 'filter', '#e4572e'),
             ('lajas', 'mok', 'Las Lajas', 'las lajas', 'light', 'filter', '#e4572e');
      insert into "coffeeVerdict" ("shelfId", "coffeeId", "rating", "wouldBuyAgain", "updatedBy", "updatedAt")
      values ('home', 'gascon', 5, true, 'tom', '2026-01-01'),
             ('work', 'gascon', 3, false, null, '2026-01-02'),
             ('home', 'lajas', 4, false, 'sarah', '2026-01-03'),
             ('work', 'lajas', 2, true, 'sarah', '2026-01-04');
    `)

    await migrateTo(client, '0012_personal_verdicts')
    await migrateTo(client, '0013_verdicts_belong_to_users')

    const { rows } = await client.query(`
      select "userId", "coffeeId", "rating", "wouldBuyAgain"
      from "coffeeVerdict"
      order by "userId", "coffeeId"
    `)

    expect(rows).toEqual([
      { userId: 'sarah', coffeeId: 'gascon', rating: 3, wouldBuyAgain: false },
      { userId: 'sarah', coffeeId: 'lajas', rating: 2, wouldBuyAgain: true },
      { userId: 'tom', coffeeId: 'gascon', rating: 5, wouldBuyAgain: true },
    ])
  }, 30_000)
})
