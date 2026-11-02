import { createApp, createRouter, toWebHandler } from 'h3'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { shelfMember } from '#server/db/schemas'
import grinderBrandsHandler from '#server/api/grinder-brands.get'
import grindersHandler from '#server/api/grinders.get'
import disownHandler from '#server/api/shelves/[shelfId]/grinders/[grinderId].delete'
import shelfGrindersHandler from '#server/api/shelves/[shelfId]/grinders/index.get'
import ownHandler from '#server/api/shelves/[shelfId]/grinders/index.post'
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
    .get('/api/grinder-brands', grinderBrandsHandler)
    .get('/api/grinders', grindersHandler)
    .get('/api/shelves/:shelfId/grinders', shelfGrindersHandler)
    .post('/api/shelves/:shelfId/grinders', ownHandler)
    .delete('/api/shelves/:shelfId/grinders/:grinderId', disownHandler)
  const app = createApp().use(router)

  return toWebHandler(app)(new Request(`http://localhost:3000${path}`, init))
}

async function signedIn(userId: string) {
  const headers = await testAuth.signIn(userId)
  headers.set('content-type', 'application/json')

  return headers
}

async function sharedShelf() {
  const sarah = await createTestUser(db, { name: 'Sarah' })
  const tom = await createTestUser(db, { name: 'Tom' })
  const shelf = await createShelf(db, { name: 'Home', ownerId: sarah.id })
  await db.insert(shelfMember).values({ shelfId: shelf.id, userId: tom.id })

  return {
    path: `/api/shelves/${shelf.id}/grinders`,
    sarah: await signedIn(sarah.id),
    tom: await signedIn(tom.id),
  }
}

function own(path: string, headers: Headers, grinder: unknown) {
  return request(path, {
    method: 'POST',
    headers,
    body: JSON.stringify(grinder),
  })
}

async function stranger() {
  return signedIn((await createTestUser(db)).id)
}

describe('/api/shelves/:shelfId/grinders', () => {
  it('lets a member mark a grinder the shelf owns', async () => {
    const { path, sarah } = await sharedShelf()

    const response = await own(path, sarah, {
      brand: 'Fellow',
      model: 'Opus Gen 2',
    })

    expect(response.status).toBe(201)
    expect(await response.json()).toEqual({
      id: expect.any(String),
      brand: 'Fellow',
      model: 'Opus Gen 2',
    })
  })

  it('shows every member the same grinders', async () => {
    const { path, sarah, tom } = await sharedShelf()

    await own(path, sarah, { brand: 'Fellow', model: 'Opus Gen 2' })
    await own(path, tom, { brand: 'Niche', model: 'Zero' })

    for (const headers of [sarah, tom]) {
      const grinders = await (await request(path, { headers })).json()
      expect(
        grinders.map((grinder: { model: string }) => grinder.model),
      ).toEqual(['Opus Gen 2', 'Zero'])
    }
  })

  it('lets any member remove a grinder from the shelf', async () => {
    const { path, sarah, tom } = await sharedShelf()
    const owned = await (
      await own(path, sarah, { brand: 'Fellow', model: 'Opus Gen 2' })
    ).json()

    const response = await request(`${path}/${owned.id}`, {
      method: 'DELETE',
      headers: tom,
    })

    expect(response.status).toBe(200)
    expect(await (await request(path, { headers: sarah })).json()).toEqual([])
  })

  it('finds no grinder the shelf does not own to remove', async () => {
    const { path, sarah } = await sharedShelf()

    const response = await request(`${path}/missing`, {
      method: 'DELETE',
      headers: sarah,
    })

    expect(response.status).toBe(404)
  })

  it('hides the grinders from anyone off the shelf', async () => {
    const { path, sarah } = await sharedShelf()
    await own(path, sarah, { brand: 'Fellow', model: 'Opus Gen 2' })
    const outsider = await stranger()

    const responses = await Promise.all([
      request(path, { headers: outsider }),
      own(path, outsider, { brand: 'Niche', model: 'Zero' }),
    ])

    expect(responses.map(response => response.status)).toEqual([404, 404])
  })

  it('asks for a brand and a model', async () => {
    const { path, sarah } = await sharedShelf()

    const response = await own(path, sarah, { brand: ' ', model: '' })

    expect(response.status).toBe(400)
    expect((await response.json()).data.errors).toEqual({
      brand: 'Pick a brand or add a new one',
      model: 'Pick a model or add a new one',
    })
  })

  it('asks to sign in first', async () => {
    const { path } = await sharedShelf()

    expect((await request(path)).status).toBe(401)
  })
})

describe('GET /api/grinder-brands and /api/grinders', () => {
  it('suggests the brands and the models of a brand to anyone signed in', async () => {
    const { path, sarah } = await sharedShelf()
    await own(path, sarah, { brand: 'Fellow', model: 'Opus Gen 2' })
    await own(path, sarah, { brand: 'Niche', model: 'Zero' })
    const outsider = await stranger()

    const brands = await (
      await request('/api/grinder-brands?search=fel', { headers: outsider })
    ).json()
    const models = await (
      await request('/api/grinders?brand=Fellow', { headers: outsider })
    ).json()

    expect(brands).toEqual([{ id: expect.any(String), name: 'Fellow' }])
    expect(models).toEqual([{ id: expect.any(String), name: 'Opus Gen 2' }])
  })

  it('asks to sign in first', async () => {
    expect((await request('/api/grinders?brand=Fellow')).status).toBe(401)
  })
})
