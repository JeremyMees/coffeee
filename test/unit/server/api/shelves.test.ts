import { createApp, createRouter, toWebHandler } from 'h3'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import meHandler from '#server/api/me.get'
import deleteHandler from '#server/api/shelves/[shelfId].delete'
import showHandler from '#server/api/shelves/[shelfId].get'
import renameHandler from '#server/api/shelves/[shelfId].patch'
import leaveHandler from '#server/api/shelves/[shelfId]/leave.post'
import removeMemberHandler from '#server/api/shelves/[shelfId]/members/[userId].delete'
import membersHandler from '#server/api/shelves/[shelfId]/members/index.get'
import handOverHandler from '#server/api/shelves/[shelfId]/owner.put'
import createHandler from '#server/api/shelves/index.post'
import { shelfMember } from '#server/db/schemas'
import { createShelf, listShelves } from '#server/utils/shelves'
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
    .post('/api/shelves', createHandler)
    .get('/api/shelves/:shelfId', showHandler)
    .patch('/api/shelves/:shelfId', renameHandler)
    .delete('/api/shelves/:shelfId', deleteHandler)
    .get('/api/shelves/:shelfId/members', membersHandler)
    .delete('/api/shelves/:shelfId/members/:userId', removeMemberHandler)
    .put('/api/shelves/:shelfId/owner', handOverHandler)
    .post('/api/shelves/:shelfId/leave', leaveHandler)
  const app = createApp().use(router)

  return toWebHandler(app)(new Request(`http://localhost:3000${path}`, init))
}

async function signIn(name = 'Jeremy') {
  const user = await createTestUser(db, { name })
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

async function sharedShelf() {
  const sarah = await signIn('Sarah')
  const tom = await signIn('Tom')
  const stranger = await signIn('Anna')
  await createShelf(db, { name: "Sarah's shelf", ownerId: sarah.user.id })
  await createShelf(db, { name: "Tom's shelf", ownerId: tom.user.id })
  const home = await createShelf(db, { name: 'Home', ownerId: sarah.user.id })
  await db.insert(shelfMember).values({ shelfId: home.id, userId: tom.user.id })

  return { sarah, tom, stranger, home }
}

function send(method: string, path: string, headers?: Headers, body?: unknown) {
  return request(path, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}

async function shelfNames(userId: string) {
  return (await listShelves(db, userId)).map(shelf => shelf.name)
}

describe('GET /api/shelves/:shelfId/members', () => {
  it('lists the members to any member', async () => {
    const { tom, home } = await sharedShelf()

    const response = await send(
      'GET',
      `/api/shelves/${home.id}/members`,
      tom.headers,
    )

    expect(response.status).toBe(200)
    expect(
      (await response.json()).map((member: { name: string }) => member.name),
    ).toEqual(['Sarah', 'Tom'])
  })

  it('gives someone who is not a member nothing', async () => {
    const { stranger, home } = await sharedShelf()

    const response = await send(
      'GET',
      `/api/shelves/${home.id}/members`,
      stranger.headers,
    )

    expect(response.status).toBe(404)
  })
})

describe('only the shelf owner manages a shelf', () => {
  function attempts(shelfId: string, memberId: string) {
    return [
      ['PATCH', `/api/shelves/${shelfId}`, { name: 'Flat' }],
      ['DELETE', `/api/shelves/${shelfId}`, undefined],
      ['DELETE', `/api/shelves/${shelfId}/members/${memberId}`, undefined],
      ['PUT', `/api/shelves/${shelfId}/owner`, { ownerId: memberId }],
    ] as const
  }

  it('refuses a member who is not the shelf owner', async () => {
    const { sarah, tom, home } = await sharedShelf()

    for (const [method, path, body] of attempts(home.id, sarah.user.id)) {
      const response = await send(method, path, tom.headers, body)

      expect(response.status, `${method} ${path}`).toBe(403)
    }
    expect(await shelfNames(tom.user.id)).toEqual(["Tom's shelf", 'Home'])
  })

  it('gives someone who is not a member nothing', async () => {
    const { tom, stranger, home } = await sharedShelf()

    for (const [method, path, body] of attempts(home.id, tom.user.id)) {
      const response = await send(method, path, stranger.headers, body)

      expect(response.status, `${method} ${path}`).toBe(404)
    }
  })

  it('refuses anonymous requests', async () => {
    const { tom, home } = await sharedShelf()

    for (const [method, path, body] of attempts(home.id, tom.user.id)) {
      const response = await send(method, path, undefined, body)

      expect(response.status, `${method} ${path}`).toBe(401)
    }
  })
})

describe('PATCH /api/shelves/:shelfId', () => {
  it('lets the shelf owner rename the shelf', async () => {
    const { sarah, home } = await sharedShelf()

    const response = await send(
      'PATCH',
      `/api/shelves/${home.id}`,
      sarah.headers,
      { name: ' Flat ' },
    )

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      id: home.id,
      name: 'Flat',
      ownerId: sarah.user.id,
    })
  })

  it('refuses a name it cannot use', async () => {
    const { sarah, home } = await sharedShelf()

    const response = await send(
      'PATCH',
      `/api/shelves/${home.id}`,
      sarah.headers,
      { name: ' ' },
    )

    expect(response.status).toBe(400)
  })
})

describe('DELETE /api/shelves/:shelfId/members/:userId', () => {
  it('lets the shelf owner remove a member', async () => {
    const { sarah, tom, home } = await sharedShelf()

    const response = await send(
      'DELETE',
      `/api/shelves/${home.id}/members/${tom.user.id}`,
      sarah.headers,
    )

    expect(response.status).toBe(204)
    expect(await shelfNames(tom.user.id)).toEqual(["Tom's shelf"])
  })

  it('does not let the shelf owner remove themself', async () => {
    const { sarah, home } = await sharedShelf()

    const response = await send(
      'DELETE',
      `/api/shelves/${home.id}/members/${sarah.user.id}`,
      sarah.headers,
    )

    expect(response.status).toBe(409)
  })

  it('says when that person is not a member', async () => {
    const { sarah, stranger, home } = await sharedShelf()

    const response = await send(
      'DELETE',
      `/api/shelves/${home.id}/members/${stranger.user.id}`,
      sarah.headers,
    )

    expect(response.status).toBe(404)
  })
})

describe('PUT /api/shelves/:shelfId/owner', () => {
  it('hands the shelf to another member', async () => {
    const { sarah, tom, home } = await sharedShelf()

    const response = await send(
      'PUT',
      `/api/shelves/${home.id}/owner`,
      sarah.headers,
      { ownerId: tom.user.id },
    )
    const renamedByTom = await send(
      'PATCH',
      `/api/shelves/${home.id}`,
      tom.headers,
      { name: 'Flat' },
    )
    const renamedBySarah = await send(
      'PATCH',
      `/api/shelves/${home.id}`,
      sarah.headers,
      { name: 'Mine' },
    )

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      id: home.id,
      name: 'Home',
      ownerId: tom.user.id,
    })
    expect(renamedByTom.status).toBe(200)
    expect(renamedBySarah.status).toBe(403)
  })

  it('refuses someone who is not a member', async () => {
    const { sarah, stranger, home } = await sharedShelf()

    const response = await send(
      'PUT',
      `/api/shelves/${home.id}/owner`,
      sarah.headers,
      { ownerId: stranger.user.id },
    )

    expect(response.status).toBe(422)
  })
})

describe('DELETE /api/shelves/:shelfId', () => {
  it('deletes the shelf for everyone on it', async () => {
    const { sarah, tom, home } = await sharedShelf()

    const response = await send(
      'DELETE',
      `/api/shelves/${home.id}`,
      sarah.headers,
    )

    expect(response.status).toBe(204)
    expect(await shelfNames(sarah.user.id)).toEqual(["Sarah's shelf"])
    expect(await shelfNames(tom.user.id)).toEqual(["Tom's shelf"])
  })

  it('refuses to delete the only shelf of the shelf owner', async () => {
    const { headers, user } = await signIn()
    const only = await createShelf(db, { name: 'Only', ownerId: user.id })

    const response = await send('DELETE', `/api/shelves/${only.id}`, headers)

    expect(response.status).toBe(409)
    expect(await response.json()).toMatchObject({
      statusMessage: "This is your only shelf, so you can't delete it",
    })
  })
})

describe('POST /api/shelves/:shelfId/leave', () => {
  it('lets a member leave', async () => {
    const { tom, home } = await sharedShelf()

    const response = await send(
      'POST',
      `/api/shelves/${home.id}/leave`,
      tom.headers,
    )

    expect(response.status).toBe(204)
    expect(await shelfNames(tom.user.id)).toEqual(["Tom's shelf"])
  })

  it('makes the shelf owner hand the shelf over first', async () => {
    const { sarah, home } = await sharedShelf()

    const response = await send(
      'POST',
      `/api/shelves/${home.id}/leave`,
      sarah.headers,
    )

    expect(response.status).toBe(409)
    expect(await response.json()).toMatchObject({
      statusMessage: 'Hand the shelf to another member before you leave',
    })
  })

  it('deletes the shelf when the last member leaves', async () => {
    const { sarah, tom, home } = await sharedShelf()
    await send('POST', `/api/shelves/${home.id}/leave`, tom.headers)

    const response = await send(
      'POST',
      `/api/shelves/${home.id}/leave`,
      sarah.headers,
    )

    expect(response.status).toBe(204)
    expect(await shelfNames(sarah.user.id)).toEqual(["Sarah's shelf"])
  })

  it('keeps someone on their only shelf', async () => {
    const { headers, user } = await signIn()
    const only = await createShelf(db, { name: 'Only', ownerId: user.id })

    const response = await send(
      'POST',
      `/api/shelves/${only.id}/leave`,
      headers,
    )

    expect(response.status).toBe(409)
    expect(await shelfNames(user.id)).toEqual(['Only'])
  })

  it('gives someone who is not a member nothing', async () => {
    const { stranger, home } = await sharedShelf()

    const response = await send(
      'POST',
      `/api/shelves/${home.id}/leave`,
      stranger.headers,
    )

    expect(response.status).toBe(404)
  })
})
