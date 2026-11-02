import { createHmac, randomBytes, randomUUID } from 'node:crypto'
import { test as base } from '@playwright/test'
import type { BrowserContext } from '@playwright/test'
import pg from 'pg'

const secret = 'a-test-secret-that-is-long-enough-to-use'

interface Member {
  id: string
  name: string
  email: string
  shelfId: string
}

type Role = 'user' | 'admin'

interface People {
  signIn: (name: string, role?: Role) => Promise<Member>
  joinShelf: (member: Member, shelfId: string) => Promise<void>
}

function databaseUrl() {
  if (!process.env.NUXT_DATABASE_URL) process.loadEnvFile('.env')

  return process.env.NUXT_DATABASE_URL
}

async function createMember(client: pg.Client, name: string, role: Role) {
  const id = randomUUID()
  const email = `${id}@example.test`
  const shelfId = randomUUID()
  const token = randomBytes(24).toString('base64url')

  await client.query(
    `insert into "user" ("id", "name", "email", "role") values ($1, $2, $3, $4)`,
    [id, name, email, role],
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

  return {
    member: { id, name, email, shelfId },
    cookie: `${token}.${signature}`,
  }
}

async function removeMember(client: pg.Client, member: Member) {
  await client.query(`delete from "purchase" where "addedBy" = $1`, [member.id])
  await client.query(`delete from "coffee" where "createdBy" = $1`, [member.id])
  for (const list of [
    'region',
    'farm',
    'washingStation',
    'producer',
    'process',
    'varietal',
  ]) {
    await client.query(`delete from "${list}" where "createdBy" = $1`, [
      member.id,
    ])
  }
  await client.query(`delete from "roaster" where "createdBy" = $1`, [
    member.id,
  ])
  await client.query(`delete from "shelf" where "ownerId" = $1`, [member.id])
  await client.query(`delete from "user" where "id" = $1`, [member.id])
}

async function useCookie(context: BrowserContext, url: string, cookie: string) {
  await context.clearCookies()
  await context.addCookies([
    {
      name: 'better-auth.session_token',
      value: encodeURIComponent(cookie),
      url,
    },
  ])
}

export const test = base.extend<{ member: Member; people: People }>({
  page: async ({ page }, use) => {
    const goto = page.goto.bind(page)

    page.goto = async (url, options) => {
      const response = await goto(url, options)
      await page.waitForFunction(() =>
        Boolean(
          (
            document.querySelector('#__nuxt') as {
              __vue_app__?: unknown
            } | null
          )?.__vue_app__,
        ),
      )

      return response
    }

    await use(page)
  },
  people: async ({ context, baseURL }, use) => {
    const database = new pg.Client({ connectionString: databaseUrl() })
    await database.connect()
    const created: Member[] = []

    await use({
      async signIn(name, role = 'user') {
        const { member, cookie } = await createMember(database, name, role)
        created.push(member)
        await useCookie(context, baseURL!, cookie)

        return member
      },
      async joinShelf(member, shelfId) {
        await database.query(
          `insert into "shelfMember" ("shelfId", "userId") values ($1, $2)`,
          [shelfId, member.id],
        )
      },
    })

    for (const member of created.reverse()) {
      await removeMember(database, member)
    }
    await database.end()
  },
  member: [
    async ({ people }, use) => {
      await use(await people.signIn('Tess'))
    },
    { auto: true },
  ],
})

export function uniqueName(prefix: string) {
  return `${prefix} ${randomBytes(4).toString('hex')}`
}

export { expect } from '@playwright/test'
