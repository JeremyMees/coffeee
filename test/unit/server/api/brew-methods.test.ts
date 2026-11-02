import { createApp, createRouter, toWebHandler } from 'h3'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import listHandler from '#server/api/brew-methods/index.get'
import addHandler from '#server/api/brew-methods/index.post'
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
  const router = createRouter()
    .get('/api/brew-methods', listHandler)
    .post('/api/brew-methods', addHandler)
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

function add(headers: Headers, body: unknown) {
  return request({ method: 'POST', headers, body: JSON.stringify(body) })
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

  it('lets an admin add a brew method', async () => {
    const headers = await signInAs('admin')

    const response = await add(headers, { name: 'Siphon' })

    expect(response.status).toBe(201)
    expect(await response.json()).toEqual({
      id: expect.any(String),
      name: 'Siphon',
    })
    const methods = await (await request({ headers })).json()
    expect(methods.at(-1).name).toBe('Siphon')
  })

  it('refuses users who are not admins', async () => {
    const headers = await signInAs('user')

    const response = await add(headers, { name: 'Siphon' })

    expect(response.status).toBe(403)
    expect(await (await request({ headers })).json()).toHaveLength(7)
  })

  it('explains a brew method that is already on the list', async () => {
    const headers = await signInAs('admin')

    const response = await add(headers, { name: 'espresso' })

    expect(response.status).toBe(409)
    expect((await response.json()).data.errors).toEqual({
      name: 'espresso is already a brew method',
    })
  })

  it('asks for a name', async () => {
    const headers = await signInAs('admin')

    const response = await add(headers, { name: '' })

    expect(response.status).toBe(400)
    expect((await response.json()).data.errors).toEqual({
      name: 'Give the brew method a name',
    })
  })

  it('asks to sign in first', async () => {
    expect((await request()).status).toBe(401)
  })
})
