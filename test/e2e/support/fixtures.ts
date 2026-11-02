import { createHmac, randomBytes, randomUUID } from 'node:crypto'
import { test as base } from '@playwright/test'
import pg from 'pg'

const secret = 'a-test-secret-that-is-long-enough-to-use'

interface Member {
  id: string
  name: string
  shelfId: string
}

function databaseUrl() {
  if (!process.env.NUXT_DATABASE_URL) process.loadEnvFile('.env')

  return process.env.NUXT_DATABASE_URL
}

async function createMember(client: pg.Client, name: string) {
  const id = randomUUID()
  const shelfId = randomUUID()
  const token = randomBytes(24).toString('base64url')

  await client.query(
    `insert into "user" ("id", "name", "email", "role") values ($1, $2, $3, 'user')`,
    [id, name, `${id}@example.test`],
  )
  await client.query(
    `insert into "shelf" ("id", "name", "ownerId") values ($1, $2, $3)`,
    [shelfId, `${name}'s shelf`, id],
  )
  await client.query(
    `insert into "shelfMember" ("shelfId", "userId") values ($1, $2)`,
    [shelfId, id],
  )
  await client.query(
    `insert into "session" ("id", "token", "userId", "expiresAt", "updatedAt")
     values ($1, $2, $3, now() + interval '1 hour', now())`,
    [randomUUID(), token, id],
  )

  const signature = createHmac('sha256', secret).update(token).digest('base64')

  return { member: { id, name, shelfId }, cookie: `${token}.${signature}` }
}

async function removeMember(client: pg.Client, member: Member) {
  await client.query(`delete from "purchase" where "addedBy" = $1`, [member.id])
  await client.query(`delete from "coffee" where "createdBy" = $1`, [member.id])
  await client.query(`delete from "roaster" where "createdBy" = $1`, [
    member.id,
  ])
  await client.query(`delete from "shelf" where "ownerId" = $1`, [member.id])
  await client.query(`delete from "user" where "id" = $1`, [member.id])
}

export const test = base.extend<{ member: Member }>({
  member: [
    async ({ context, baseURL }, use) => {
      const client = new pg.Client({ connectionString: databaseUrl() })
      await client.connect()

      const { member, cookie } = await createMember(client, 'Tess')
      await context.addCookies([
        {
          name: 'better-auth.session_token',
          value: encodeURIComponent(cookie),
          url: baseURL!,
        },
      ])

      await use(member)

      await removeMember(client, member)
      await client.end()
    },
    { auto: true },
  ],
})

export function uniqueName(prefix: string) {
  return `${prefix} ${randomBytes(4).toString('hex')}`
}

export { expect } from '@playwright/test'
