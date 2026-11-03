import { createApp, createRouter, toWebHandler } from 'h3'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import listHandler from '#server/api/admin/lists/[list]/index.get'
import addHandler from '#server/api/admin/lists/[list]/index.post'
import renameHandler from '#server/api/admin/lists/[list]/[entryId].patch'
import deleteHandler from '#server/api/admin/lists/[list]/[entryId].delete'
import mergeHandler from '#server/api/admin/lists/[list]/[entryId]/merge.post'
import { addCoffee } from '#server/utils/coffees'
import { createShelf } from '#server/utils/shelves'
import type { NewCoffee } from '#shared/types/coffee'
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

const bag: NewCoffee = {
  name: 'Ayele Fulasa',
  roaster: 'Square Mile',
  roastLevel: 'light',
  roastedFor: 'filter',
  origins: ['ET'],
  regions: [],
  farms: [],
  washingStations: [],
  producers: [],
  processes: ['Washed'],
  varietals: [],
  flavorNotes: ['Lime', 'Limes'],
  link: null,
  altitudeFrom: null,
  altitudeTo: null,
  purchasedOn: '2026-09-01',
  roastedOn: null,
  sizeGrams: 250,
  price: 16.5,
}

beforeEach(async () => {
  db = (await createTestDatabase()).db
  testAuth = await createTestAuth(db)
  current.auth = testAuth
  current.db = db
  const sarah = await createTestUser(db)
  const home = await createShelf(db, { name: 'Home', ownerId: sarah.id })
  await addCoffee(db, { shelfId: home.id, userId: sarah.id, coffee: bag })
})

function request(path: string, init: RequestInit = {}) {
  const router = createRouter()
    .get('/api/admin/lists/:list', listHandler)
    .post('/api/admin/lists/:list', addHandler)
    .patch('/api/admin/lists/:list/:entryId', renameHandler)
    .delete('/api/admin/lists/:list/:entryId', deleteHandler)
    .post('/api/admin/lists/:list/:entryId/merge', mergeHandler)
  const app = createApp().use(router)

  return toWebHandler(app)(new Request(`http://localhost:3000${path}`, init))
}

async function signInAs(role: 'admin' | 'user') {
  const user = await createTestUser(db, { role })
  const headers = await testAuth.signIn(user.id)
  headers.set('content-type', 'application/json')

  return headers
}

async function notes(headers: Headers) {
  const response = await request('/api/admin/lists/flavorNotes', { headers })
  const { entries } = await response.json()

  return entries as { id: string; name: string; uses: number }[]
}

describe('/api/admin/lists', () => {
  it('lists the entries of a shared list for admins', async () => {
    const headers = await signInAs('admin')

    const response = await request('/api/admin/lists/flavorNotes?search=lim', {
      headers,
    })

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      total: 2,
      entries: [
        {
          id: expect.any(String),
          name: 'Lime',
          detail: null,
          detailId: null,
          uses: 1,
        },
        {
          id: expect.any(String),
          name: 'Limes',
          detail: null,
          detailId: null,
          uses: 1,
        },
      ],
    })
  })

  it('adds an entry', async () => {
    const headers = await signInAs('admin')

    const response = await request('/api/admin/lists/flavorNotes', {
      method: 'POST',
      headers,
      body: JSON.stringify({ name: 'Jasmine' }),
    })

    expect(response.status).toBe(201)
    expect(await response.json()).toEqual({
      id: expect.any(String),
      name: 'Jasmine',
    })
  })

  it('explains an entry that is already on the list', async () => {
    const headers = await signInAs('admin')

    const response = await request('/api/admin/lists/flavorNotes', {
      method: 'POST',
      headers,
      body: JSON.stringify({ name: 'lime' }),
    })

    expect(response.status).toBe(409)
    expect((await response.json()).data.errors).toEqual({
      name: 'lime is already on the list',
    })
  })

  it('asks for what each list needs', async () => {
    const headers = await signInAs('admin')

    const response = await request('/api/admin/lists/farms', {
      method: 'POST',
      headers,
      body: JSON.stringify({ name: 'La Palma' }),
    })

    expect(response.status).toBe(400)
    expect((await response.json()).data.errors).toEqual({
      originCode: 'Pick a country from the list',
    })
  })

  it('renames an entry', async () => {
    const headers = await signInAs('admin')
    const [, limes] = await notes(headers)

    const response = await request(
      `/api/admin/lists/flavorNotes/${limes!.id}`,
      {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ name: 'Key lime' }),
      },
    )

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ id: limes!.id, name: 'Key lime' })
  })

  it('updates the country of a region', async () => {
    const headers = await signInAs('admin')
    const added = await request('/api/admin/lists/regions', {
      method: 'POST',
      headers,
      body: JSON.stringify({ name: 'Cauca', originCode: 'ET' }),
    })
    const { id } = await added.json()

    const response = await request(`/api/admin/lists/regions/${id}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ name: 'Cauca', originCode: 'CO' }),
    })

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ id, name: 'Cauca' })
  })

  it('updates the brand and model of a grinder', async () => {
    const headers = await signInAs('admin')
    const added = await request('/api/admin/lists/grinders', {
      method: 'POST',
      headers,
      body: JSON.stringify({ brand: 'Fellow', model: 'Opus' }),
    })
    const { id } = await added.json()

    const response = await request(`/api/admin/lists/grinders/${id}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ brand: 'Fellow', model: 'Opus Gen 2' }),
    })

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ id, name: 'Opus Gen 2' })
  })

  it('suggests merging when the new name is taken', async () => {
    const headers = await signInAs('admin')
    const [, limes] = await notes(headers)

    const response = await request(
      `/api/admin/lists/flavorNotes/${limes!.id}`,
      {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ name: 'lime' }),
      },
    )

    expect(response.status).toBe(409)
    expect((await response.json()).data.errors).toEqual({
      name: 'Lime already exists, merge them instead',
    })
  })

  it('merges an entry into the one that is kept', async () => {
    const headers = await signInAs('admin')
    const [lime, limes] = await notes(headers)

    const response = await request(
      `/api/admin/lists/flavorNotes/${limes!.id}/merge`,
      { method: 'POST', headers, body: JSON.stringify({ intoId: lime!.id }) },
    )

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ id: lime!.id, name: 'Lime' })
    expect(await notes(headers)).toEqual([
      { id: lime!.id, name: 'Lime', detail: null, detailId: null, uses: 1 },
    ])
  })

  it('asks for another entry to merge into', async () => {
    const headers = await signInAs('admin')
    const [lime] = await notes(headers)

    const response = await request(
      `/api/admin/lists/flavorNotes/${lime!.id}/merge`,
      { method: 'POST', headers, body: JSON.stringify({ intoId: lime!.id }) },
    )

    expect(response.status).toBe(400)
    expect((await response.json()).data.errors).toEqual({
      intoId: 'Pick another flavor note to keep',
    })
  })

  it('deletes an entry', async () => {
    const headers = await signInAs('admin')
    const [lime] = await notes(headers)

    const response = await request(`/api/admin/lists/flavorNotes/${lime!.id}`, {
      method: 'DELETE',
      headers,
    })

    expect(response.status).toBe(204)
    expect((await notes(headers)).map(note => note.name)).toEqual(['Limes'])
  })

  it('explains why an entry in use cannot be deleted', async () => {
    const headers = await signInAs('admin')
    const roasters = await request('/api/admin/lists/roasters', { headers })
    const [squareMile] = (await roasters.json()).entries

    const response = await request(
      `/api/admin/lists/roasters/${squareMile.id}`,
      {
        method: 'DELETE',
        headers,
      },
    )

    expect(response.status).toBe(409)
    expect((await response.json()).statusMessage).toBe(
      'This roaster still has coffees, merge it into another roaster instead',
    )
  })

  it('finds no list or entry that does not exist', async () => {
    const headers = await signInAs('admin')

    expect((await request('/api/admin/lists/beans', { headers })).status).toBe(
      404,
    )
    expect(
      (
        await request('/api/admin/lists/varietals/nope', {
          method: 'DELETE',
          headers,
        })
      ).status,
    ).toBe(404)
  })

  it('refuses users who are not admins', async () => {
    const headers = await signInAs('user')

    expect(
      (await request('/api/admin/lists/flavorNotes', { headers })).status,
    ).toBe(403)
  })

  it('asks to sign in first', async () => {
    expect((await request('/api/admin/lists/flavorNotes')).status).toBe(401)
  })
})
