import { eq } from 'drizzle-orm'
import { createApp, createRouter, toWebHandler } from 'h3'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import authHandler from '#server/api/auth/[...all]'
import deleteHandler from '#server/api/me.delete'
import meHandler from '#server/api/me.get'
import patchHandler from '#server/api/me.patch'
import ownedShelvesHandler from '#server/api/me/owned-shelves.get'
import statsHandler from '#server/api/me/stats.get'
import { session, shelf, shelfMember, user } from '#server/db/schemas'
import { createShelf } from '#server/utils/shelves'
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
    .get('/api/me', meHandler)
    .delete('/api/me', deleteHandler)
    .patch('/api/me', patchHandler)
    .get('/api/me/owned-shelves', ownedShelvesHandler)
    .get('/api/me/stats', statsHandler)
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

  it('shows a new name straight away although sessions are cached', async () => {
    const sarah = await createTestUser(db, { name: 'Sarah' })
    const headers = await testAuth.signIn(sarah.id)

    await request('/api/me', { headers })
    await db
      .update(user)
      .set({ name: 'Sarah Mees' })
      .where(eq(user.id, sarah.id))
    const response = await request('/api/me', { headers })

    expect(await response.json()).toMatchObject({ name: 'Sarah Mees' })
  })

  it('hands out a refreshed session cookie', async () => {
    const sarah = await createTestUser(db)
    const headers = await testAuth.signIn(sarah.id)

    const response = await request('/api/me', { headers })

    expect(response.headers.getSetCookie().join(';')).toContain('session_data')
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

describe('the session cache', () => {
  it('keeps other requests working without looking the session up again', async () => {
    const sarah = await createTestUser(db)
    const headers = await testAuth.signIn(sarah.id)
    const first = await request('/api/me', { headers })
    const cookies = [
      headers.get('cookie'),
      ...first.headers.getSetCookie().map(cookie => cookie.split(';')[0]),
    ]
    headers.set('cookie', cookies.join('; '))
    await db.delete(session)

    const cached = await request('/api/me/owned-shelves', { headers })
    const fresh = await request('/api/me', { headers })

    expect(cached.status).toBe(200)
    expect(fresh.status).toBe(401)
  })
})

describe('PATCH /api/me', () => {
  function rename(name: unknown, headers = new Headers()) {
    headers.set('content-type', 'application/json')

    return request('/api/me', {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ name }),
    })
  }

  it('refuses anonymous requests', async () => {
    const response = await rename('Sarah')

    expect(response.status).toBe(401)
  })

  it('changes the name of the signed-in user', async () => {
    const sarah = await createTestUser(db, { name: 'Sarah' })
    const headers = await testAuth.signIn(sarah.id)

    const response = await rename('  Sarah Mees ', headers)

    const [found] = await db.select().from(user).where(eq(user.id, sarah.id))
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ name: 'Sarah Mees' })
    expect(found?.name).toBe('Sarah Mees')
  })

  it('refuses an empty name', async () => {
    const sarah = await createTestUser(db, { name: 'Sarah' })
    const headers = await testAuth.signIn(sarah.id)

    const response = await rename('   ', headers)

    expect(response.status).toBe(400)
  })
})

describe('GET /api/me/stats', () => {
  it('refuses anonymous requests', async () => {
    const response = await request('/api/me/stats')

    expect(response.status).toBe(401)
  })

  it('returns the stats of the signed-in user', async () => {
    const user = await createTestUser(db)
    const headers = await testAuth.signIn(user.id)

    const response = await request('/api/me/stats', { headers })

    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ bags: 0, rated: 0 })
  })
})

describe('deleting an account', () => {
  async function setup() {
    await createTestUser(db, { name: 'Jeremy', role: 'admin' })
    const sarah = await createTestUser(db, { name: 'Sarah' })
    const tom = await createTestUser(db, { name: 'Tom' })
    const home = await createShelf(db, { name: 'Home', ownerId: sarah.id })
    await db.insert(shelfMember).values({ shelfId: home.id, userId: tom.id })
    const headers = await testAuth.signIn(sarah.id)
    headers.set('content-type', 'application/json')

    return { sarah, tom, home, headers }
  }

  function remove(headers: Headers, heirs: Record<string, string>) {
    return request('/api/me', {
      method: 'DELETE',
      headers,
      body: JSON.stringify({ heirs }),
    })
  }

  it('refuses anonymous requests', async () => {
    const owned = await request('/api/me/owned-shelves')
    const removed = await request('/api/me', { method: 'DELETE' })

    expect(owned.status).toBe(401)
    expect(removed.status).toBe(401)
  })

  it('lists the shelves to hand over', async () => {
    const { tom, home, headers } = await setup()

    const response = await request('/api/me/owned-shelves', { headers })

    expect(await response.json()).toEqual([
      { id: home.id, name: 'Home', members: [{ id: tom.id, name: 'Tom' }] },
    ])
  })

  it('asks who takes over a shared shelf', async () => {
    const { sarah, headers } = await setup()

    const response = await remove(headers, {})

    expect(response.status).toBe(400)
    expect(response.statusText).toBe('Choose who takes over Home')
    expect(
      await db.select().from(user).where(eq(user.id, sarah.id)),
    ).toHaveLength(1)
  })

  it('deletes the account, hands over the shelf and signs out', async () => {
    const { sarah, tom, home, headers } = await setup()

    const response = await remove(headers, { [home.id]: tom.id })
    const after = await request('/api/me', { headers })

    const [handed] = await db.select().from(shelf).where(eq(shelf.id, home.id))
    expect(response.status).toBe(204)
    expect(response.headers.getSetCookie().join()).toContain('Max-Age=0')
    expect(after.status).toBe(401)
    expect(handed?.ownerId).toBe(tom.id)
    expect(await db.select().from(user).where(eq(user.id, sarah.id))).toEqual(
      [],
    )
  })

  it('refuses when nobody else is an admin', async () => {
    const admin = await createTestUser(db, { name: 'Jeremy', role: 'admin' })
    const headers = await testAuth.signIn(admin.id)
    headers.set('content-type', 'application/json')

    const response = await remove(headers, {})

    expect(response.status).toBe(409)
  })
})
