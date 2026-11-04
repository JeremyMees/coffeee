import { readdirSync, readFileSync } from 'node:fs'
import { PGlite } from '@electric-sql/pglite'
import { pg_trgm } from '@electric-sql/pglite/contrib/pg_trgm'
import { describe, expect, it } from 'vitest'

const migrationTags = readdirSync('server/db/migrations')
  .filter(file => file.endsWith('.sql'))
  .map(file => file.slice(0, -'.sql'.length))
  .sort()

async function migrateTo(client: PGlite, tag: string) {
  await client.exec(readFileSync(`server/db/migrations/${tag}.sql`, 'utf8'))
}

async function migrateThrough(client: PGlite, last: string) {
  for (const tag of migrationTags.slice(0, migrationTags.indexOf(last) + 1)) {
    await migrateTo(client, tag)
  }
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

    await migrateThrough(client, '0011_roaster_details')

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

describe('the personal grind settings migrations', () => {
  it('moves each shelf grind setting to the member who last changed it', async () => {
    const client = new PGlite({ extensions: { pg_trgm } })
    await migrateThrough(client, '0013_verdicts_belong_to_users')
    await client.exec(`
      insert into "user" ("id", "name", "email")
      values ('sarah', 'Sarah', 'sarah@example.com'),
             ('tom', 'Tom', 'tom@example.com');
      insert into "shelf" ("id", "name", "ownerId")
      values ('home', 'Home', 'sarah'), ('work', 'Work', 'sarah'),
             ('cabin', 'Cabin', 'sarah');
      insert into "roaster" ("id", "name", "nameKey")
      values ('mok', 'Mok', 'mok');
      insert into "coffee" ("id", "roasterId", "name", "nameKey", "roastLevel", "roastedFor", "colour")
      values ('gascon', 'mok', 'Finca Gascon', 'finca gascon', 'light', 'filter', '#e4572e');
      insert into "grinderBrand" ("id", "name", "nameKey")
      values ('fellow', 'Fellow', 'fellow');
      insert into "grinder" ("id", "name", "nameKey", "brandId")
      values ('opus', 'Opus Gen 2', 'opus gen 2', 'fellow');
      insert into "grindSetting" ("shelfId", "coffeeId", "grinderId", "brewMethodId", "setting", "updatedBy", "updatedAt")
      select 'home', 'gascon', 'opus', "id", '12', 'tom', '2026-01-01'::timestamp
      from "brewMethod" where "nameKey" = 'espresso'
      union all
      select 'work', 'gascon', 'opus', "id", '9', null, '2026-01-02'::timestamp
      from "brewMethod" where "nameKey" = 'espresso'
      union all
      select 'cabin', 'gascon', 'opus', "id", '4', 'sarah', '2026-01-03'::timestamp
      from "brewMethod" where "nameKey" = 'espresso';
    `)

    await migrateTo(client, '0014_personal_grind_settings')
    await migrateTo(client, '0015_grind_settings_belong_to_users')

    const { rows } = await client.query(`
      select "userId", "setting" from "grindSetting" order by "userId"
    `)

    expect(rows).toEqual([
      { userId: 'sarah', setting: '4' },
      { userId: 'tom', setting: '12' },
    ])
  }, 30_000)
})

describe('the short ids migration', () => {
  it('gives shelves, coffees and roasters short ids and keeps what points at them', async () => {
    const client = new PGlite({ extensions: { pg_trgm } })

    await migrateThrough(client, '0020_notification_emails')

    await client.exec(`
      insert into "user" ("id", "name", "email")
      values ('sarah', 'Sarah', 'sarah@example.com');
      insert into "shelf" ("id", "name", "ownerId")
      values ('2a32bc78-fe77-46c0-9f5c-c51cbed7bc88', 'Home', 'sarah');
      insert into "shelfMember" ("shelfId", "userId")
      values ('2a32bc78-fe77-46c0-9f5c-c51cbed7bc88', 'sarah');
      insert into "roaster" ("id", "name", "nameKey")
      values ('8a1f3e52-7c41-4f0e-9d2b-3b6f5a0c9e11', 'Mok', 'mok');
      insert into "coffee" ("id", "roasterId", "name", "nameKey", "roastLevel", "roastedFor")
      values ('2199c26e-d7bf-443c-ac42-a4cc02ceaed9', '8a1f3e52-7c41-4f0e-9d2b-3b6f5a0c9e11', 'Finca Gascon', 'finca gascon', 'light', 'filter');
      insert into "purchase" ("id", "shelfId", "coffeeId", "purchasedOn")
      values ('bag', '2a32bc78-fe77-46c0-9f5c-c51cbed7bc88', '2199c26e-d7bf-443c-ac42-a4cc02ceaed9', '2026-11-01');
    `)

    await migrateTo(client, '0021_short_ids')

    const { rows } = await client.query<Record<string, string>>(`
      select "shelf"."id" as "shelfId", "coffee"."id" as "coffeeId",
             "roaster"."id" as "roasterId", "shelfMember"."userId"
      from "purchase"
      join "shelf" on "shelf"."id" = "purchase"."shelfId"
      join "shelfMember" on "shelfMember"."shelfId" = "shelf"."id"
      join "coffee" on "coffee"."id" = "purchase"."coffeeId"
      join "roaster" on "roaster"."id" = "coffee"."roasterId"
    `)

    expect(rows).toEqual([
      {
        shelfId: expect.stringMatching(/^[a-z0-9]{8}$/),
        coffeeId: expect.stringMatching(/^[a-z0-9]{8}$/),
        roasterId: expect.stringMatching(/^[a-z0-9]{8}$/),
        userId: 'sarah',
      },
    ])
  }, 30_000)
})
