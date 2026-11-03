import { createApp, createRouter, toWebHandler } from 'h3'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import listHandler from '#server/api/brew-methods/index.get'
import { createTestAuth } from '#test/support/auth'
import type { TestAuth, TestDatabase } from '#test/support/types'
import { createTestDatabase, createTestUser } from '#test/support/database'

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
let db: TestDatabase

beforeEach(async () => {
  db = (await createTestDatabase()).db
  testAuth = await createTestAuth(db)
  current.auth = testAuth
  current.db = db
})

function request(init: RequestInit = {}) {
  const router = createRouter().get('/api/brew-methods', listHandler)
  const app = createApp().use(router)

  return toWebHandler(app)(
    new Request('http://localhost:3000/api/brew-methods', init),
  )
}

async function signInAs(role: 'admin' | 'user') {
  const user = await createTestUser(db, { role })
  const headers = await testAuth.signIn(user.id)
  headers.set('content-type', 'application/json')

  return headers
}

describe('/api/brew-methods', () => {
  it('lists the brew methods for anyone signed in', async () => {
    const headers = await signInAs('user')

    const response = await request({ headers })

    expect(response.status).toBe(200)
    const methods = await response.json()
    expect(methods[0]).toEqual({ id: expect.any(String), name: 'Espresso' })
    expect(methods).toHaveLength(7)
  })

  it('asks to sign in first', async () => {
    expect((await request()).status).toBe(401)
  })
})
