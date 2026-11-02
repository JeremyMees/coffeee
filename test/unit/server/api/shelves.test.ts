import { createApp, createRouter, toWebHandler } from 'h3'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import meHandler from '#server/api/me.get'
import showHandler from '#server/api/shelves/[shelfId].get'
import createHandler from '#server/api/shelves/index.post'
import { createShelf } from '#server/utils/shelves'
import { createTestAuth } from '#test/support/auth'
import { createTestDatabase, createTestUser } from '#test/support/database'

type TestAuth = Awaited<ReturnType<typeof createTestAuth>>

const current = vi.hoisted(() => ({
  auth: undefined as unknown,
  db: undefined as unknown,
}))

vi.mock('#server/utils/auth', async importOriginal => ({
  ...(await importOriginal<object>()),
  useAuth: () => (current.auth as TestAuth).auth,
}))

vi.mock('#server/utils/db', () => ({
  useDb: () => current.db,
}))

let testAuth: TestAuth
let db: Awaited<ReturnType<typeof createTestDatabase>>['db']

beforeEach(async () => {
  db = (await createTestDatabase()).db
  testAuth = await createTestAuth(db)
  current.auth = testAuth
  current.db = db
})

function request(path: string, init: RequestInit = {}) {
  const router = createRouter()
    .get('/api/me', meHandler)
    .post('/api/shelves', createHandler)
    .get('/api/shelves/:shelfId', showHandler)
  const app = createApp().use(router)

  return toWebHandler(app)(new Request(`http://localhost:3000${path}`, init))
}

async function signIn() {
  const user = await createTestUser(db)
  const headers = await testAuth.signIn(user.id)
  headers.set('content-type', 'application/json')

  return { user, headers }
}

function post(headers: Headers, body: unknown) {
  return request('/api/shelves', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })
}

describe('POST /api/shelves', () => {
  it('refuses anonymous requests', async () => {
    const response = await request('/api/shelves', {
      method: 'POST',
      body: JSON.stringify({ name: 'Work' }),
    })

    expect(response.status).toBe(401)
  })

  it('creates a shelf owned by the signed-in user', async () => {
    const { user, headers } = await signIn()

    const response = await post(headers, { name: '  Work  ' })
    const me = await request('/api/me', { headers })

    expect(response.status).toBe(201)
    expect(await response.json()).toMatchObject({
      name: 'Work',
      ownerId: user.id,
    })
    expect((await me.json()).shelves).toMatchObject([{ name: 'Work' }])
  })

  it.each([{}, { name: '   ' }, { name: 'x'.repeat(41) }])(
    'refuses a shelf without a usable name: %j',
    async body => {
      const { headers } = await signIn()

      const response = await post(headers, body)

      expect(response.status).toBe(400)
    },
  )
})

describe('GET /api/shelves/:shelfId', () => {
  it('refuses anonymous requests', async () => {
    const owner = await createTestUser(db)
    const shelf = await createShelf(db, { name: 'Home', ownerId: owner.id })

    const response = await request(`/api/shelves/${shelf.id}`)

    expect(response.status).toBe(401)
  })

  it('shows a shelf to its members', async () => {
    const { user, headers } = await signIn()
    const shelf = await createShelf(db, { name: 'Home', ownerId: user.id })

    const response = await request(`/api/shelves/${shelf.id}`, { headers })

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      id: shelf.id,
      name: 'Home',
      ownerId: user.id,
    })
  })

  it('gives someone who is not a member nothing', async () => {
    const owner = await createTestUser(db)
    const shelf = await createShelf(db, { name: 'Home', ownerId: owner.id })
    const { headers } = await signIn()

    const response = await request(`/api/shelves/${shelf.id}`, { headers })

    expect(response.status).toBe(404)
    expect(JSON.stringify(await response.json())).not.toContain('Home')
  })
})
