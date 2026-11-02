import { createApp, createRouter, toWebHandler } from 'h3'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import authHandler from '#server/api/auth/[...all]'
import meHandler from '#server/api/me.get'
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
    .use('/api/auth/**', authHandler)
  const app = createApp().use(router)

  return toWebHandler(app)(new Request(`http://localhost:3000${path}`, init))
}

describe('GET /api/me', () => {
  it('refuses anonymous requests', async () => {
    const response = await request('/api/me')

    expect(response.status).toBe(401)
  })

  it('returns the signed-in user', async () => {
    const user = await createTestUser(db, { email: 'sarah@example.com' })
    const headers = await testAuth.signIn(user.id)

    const response = await request('/api/me', { headers })

    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({
      email: 'sarah@example.com',
      role: 'user',
      shelves: [],
    })
  })

  it('refuses requests after signing out', async () => {
    const user = await createTestUser(db)
    const headers = await testAuth.signIn(user.id)
    headers.set('origin', 'http://localhost:3000')

    const signOut = await request('/api/auth/sign-out', {
      method: 'POST',
      headers,
    })
    const response = await request('/api/me', { headers })

    expect(signOut.status).toBe(200)
    expect(response.status).toBe(401)
  })
})
