import { createApp, createRouter, toWebHandler } from 'h3'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import revokeHandler from '#server/api/invites/[id].delete'
import listHandler from '#server/api/invites/index.get'
import createHandler from '#server/api/invites/index.post'
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

function request(path: string, init: RequestInit = {}) {
  const router = createRouter()
    .get('/api/invites', listHandler)
    .post('/api/invites', createHandler)
    .delete('/api/invites/:id', revokeHandler)
  const app = createApp().use(router)

  const headers = new Headers(init.headers)
  headers.set('host', 'localhost:3000')

  return toWebHandler(app)(
    new Request(`http://localhost:3000${path}`, { ...init, headers }),
  )
}

async function signInAs(role: 'admin' | 'user') {
  const user = await createTestUser(db, { role })
  const headers = await testAuth.signIn(user.id)
  headers.set('content-type', 'application/json')

  return headers
}

function post(headers: Headers, body: unknown) {
  return request('/api/invites', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })
}

describe('invite routes', () => {
  it('refuses anonymous requests', async () => {
    const response = await request('/api/invites')

    expect(response.status).toBe(401)
  })

  it('refuses users who are not admins', async () => {
    const headers = await signInAs('user')

    const list = await request('/api/invites', { headers })
    const create = await post(headers, { email: 'sarah@example.com' })

    expect(list.status).toBe(403)
    expect(create.status).toBe(403)
  })

  it('lets an admin allow an email and see it pending', async () => {
    const headers = await signInAs('admin')

    const created = await post(headers, { email: 'Sarah@example.com' })
    const list = await request('/api/invites', { headers })

    expect(created.status).toBe(201)
    expect(await list.json()).toMatchObject([{ email: 'sarah@example.com' }])
  })

  it('refuses to allow the same email twice', async () => {
    const headers = await signInAs('admin')
    await post(headers, { email: 'sarah@example.com' })

    const again = await post(headers, { email: 'sarah@example.com' })

    expect(again.status).toBe(409)
  })

  it('refuses an invalid email', async () => {
    const headers = await signInAs('admin')

    const response = await post(headers, { email: 'not an email' })

    expect(response.status).toBe(400)
  })

  it('gives an admin a single-use invite link', async () => {
    const headers = await signInAs('admin')

    const response = await post(headers, { link: true })
    const { url } = await response.json()

    expect(response.status).toBe(201)
    expect(url).toMatch(/^http:\/\/localhost:3000\/invite\/[\w-]{43}$/)
  })

  it('lets an admin revoke a pending invite', async () => {
    const headers = await signInAs('admin')
    const created = await post(headers, { email: 'sarah@example.com' })
    const { id } = await created.json()

    const revoked = await request(`/api/invites/${id}`, {
      method: 'DELETE',
      headers,
    })
    const list = await request('/api/invites', { headers })

    expect(revoked.status).toBe(204)
    expect(await list.json()).toEqual([])
  })

  it('says when there is no pending invite to revoke', async () => {
    const headers = await signInAs('admin')

    const response = await request('/api/invites/unknown', {
      method: 'DELETE',
      headers,
    })

    expect(response.status).toBe(404)
  })
})
