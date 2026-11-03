import { createApp, createRouter, toWebHandler } from 'h3'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { shelfMember } from '#server/db/schemas'
import photoHandler from '#server/api/photos/[...pathname].get'
import editRoasterHandler from '#server/api/roasters/[roasterId].patch'
import showRoasterHandler from '#server/api/roasters/[roasterId].get'
import roastersHandler from '#server/api/shelves/[shelfId]/roasters/index.get'
import removeLogoHandler from '#server/api/roasters/[roasterId]/logo.delete'
import replaceLogoHandler from '#server/api/roasters/[roasterId]/logo.put'
import showCoffeeHandler from '#server/api/shelves/[shelfId]/coffees/[coffeeId].get'
import addCoffeeHandler from '#server/api/shelves/[shelfId]/coffees/index.post'
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
    .post('/api/shelves/:shelfId/coffees', addCoffeeHandler)
    .get('/api/shelves/:shelfId/coffees/:coffeeId', showCoffeeHandler)
    .get('/api/shelves/:shelfId/roasters', roastersHandler)
    .get('/api/roasters/:roasterId', showRoasterHandler)
    .patch('/api/roasters/:roasterId', editRoasterHandler)
    .put('/api/roasters/:roasterId/logo', replaceLogoHandler)
    .delete('/api/roasters/:roasterId/logo', removeLogoHandler)
    .get('/api/photos/**:pathname', photoHandler)
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
  const admin = await createTestUser(db, { name: 'Ada', role: 'admin' })
  const shelf = await createShelf(db, { name: 'Home', ownerId: sarah.id })
  await db.insert(shelfMember).values({ shelfId: shelf.id, userId: tom.id })
  const sarahHeaders = await signedIn(sarah.id)
  const added = await request(`/api/shelves/${shelf.id}/coffees`, {
    method: 'POST',
    headers: sarahHeaders,
    body: JSON.stringify({
      name: 'Ayele Fulasa',
      roaster: 'Square Mile',
      roastLevel: 'light',
      roastedFor: 'filter',
      colour: '#e4572e',
      origins: ['ET'],
      processes: ['Washed'],
      purchasedOn: '2026-09-01',
    }),
  })
  const { coffee } = await added.json()
  const coffeePath = `/api/shelves/${shelf.id}/coffees/${coffee.id}`
  const shown = await (
    await request(coffeePath, { headers: sarahHeaders })
  ).json()

  return {
    shelf,
    sarah: sarahHeaders,
    tom: await signedIn(tom.id),
    admin: await signedIn(admin.id),
    coffeePath,
    roasterPath: `/api/roasters/${shown.roasterDetails.id}`,
  }
}

const details = {
  name: 'Square Mile Coffee Roasters',
  website: 'https://squaremilecoffee.com',
  countryCode: 'GB',
  city: 'London',
}

function edit(path: string, headers: Headers, body: unknown) {
  return request(path, { method: 'PATCH', headers, body: JSON.stringify(body) })
}

function uploadLogo(path: string, headers: Headers, content = 'logo') {
  const body = new FormData()
  body.append('photo', new Blob([content], { type: 'image/webp' }), 'logo.webp')
  const multipart = new Headers(headers)
  multipart.delete('content-type')

  return request(`${path}/logo`, { method: 'PUT', headers: multipart, body })
}

async function roasterOn(coffeePath: string, headers: Headers) {
  return (await (await request(coffeePath, { headers })).json()).roasterDetails
}

describe('the roasters', () => {
  it('lists every roaster with what the shelf bought from it, never another shelf’s purchases or prices', async () => {
    const { shelf, sarah } = await sharedShelf()
    const outsider = await createTestUser(db, { name: 'Ana' })
    const work = await createShelf(db, { name: 'Work', ownerId: outsider.id })
    const ana = await signedIn(outsider.id)
    await request(`/api/shelves/${work.id}/coffees`, {
      method: 'POST',
      headers: ana,
      body: JSON.stringify({
        name: 'El Paraiso',
        roaster: 'La Cabra',
        roastLevel: 'light',
        roastedFor: 'filter',
        colour: '#e4572e',
        origins: ['CO'],
        processes: ['Washed'],
        purchasedOn: '2026-11-02',
        price: 24,
      }),
    })

    const response = await request(`/api/shelves/${shelf.id}/roasters`, {
      headers: sarah,
    })
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(
      body.roasters.map((found: { name: string; shelfCoffees: number }) => [
        found.name,
        found.shelfCoffees,
      ]),
    ).toEqual([
      ['La Cabra', 0],
      ['Square Mile', 1],
    ])
    expect(JSON.stringify(body)).not.toMatch(/price|purchase|2026-11-02/i)
  })

  it('keeps only the roasters the shelf bought from', async () => {
    const { shelf, sarah } = await sharedShelf()

    const body = await (
      await request(`/api/shelves/${shelf.id}/roasters?boughtFrom=true`, {
        headers: sarah,
      })
    ).json()

    expect(body.total).toBe(1)
    expect(body.roasters[0]).toMatchObject({
      name: 'Square Mile',
      shelfCoffees: 1,
      lastBought: '2026-09-01',
    })
  })

  it('refuses a shelf the viewer is not on', async () => {
    const { shelf } = await sharedShelf()
    const outsider = await signedIn((await createTestUser(db)).id)

    const response = await request(`/api/shelves/${shelf.id}/roasters`, {
      headers: outsider,
    })

    expect(response.status).toBe(404)
  })

  it('shows a roaster to anyone signed in', async () => {
    const { roasterPath } = await sharedShelf()
    const outsider = await signedIn((await createTestUser(db)).id)

    const response = await request(roasterPath, { headers: outsider })

    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({
      name: 'Square Mile',
      canEdit: false,
    })
    expect(
      (await request('/api/roasters/nope', { headers: outsider })).status,
    ).toBe(404)
    expect((await request(roasterPath)).status).toBe(401)
  })
})

describe('the details of a roaster', () => {
  it('starts with only a name, editable by the person who added it', async () => {
    const { sarah, tom, coffeePath } = await sharedShelf()

    expect(await roasterOn(coffeePath, sarah)).toEqual({
      id: expect.any(String),
      name: 'Square Mile',
      website: null,
      countryCode: null,
      city: null,
      logoUrl: null,
      canEdit: true,
    })
    expect((await roasterOn(coffeePath, tom)).canEdit).toBe(false)
  })

  it('lets the person who added it fill in its details', async () => {
    const { sarah, tom, coffeePath, roasterPath } = await sharedShelf()

    const response = await edit(roasterPath, sarah, details)

    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject(details)
    expect(await roasterOn(coffeePath, tom)).toMatchObject(details)
    const coffee = await (await request(coffeePath, { headers: tom })).json()
    expect(coffee.roaster).toBe('Square Mile Coffee Roasters')
  })

  it('lets an admin edit a roaster someone else added', async () => {
    const { admin, roasterPath } = await sharedShelf()

    const response = await edit(roasterPath, admin, details)

    expect(response.status).toBe(200)
  })

  it('refuses everyone else, even a member of the same shelf', async () => {
    const { tom, sarah, coffeePath, roasterPath } = await sharedShelf()

    const responses = await Promise.all([
      edit(roasterPath, tom, details),
      uploadLogo(roasterPath, tom),
      request(`${roasterPath}/logo`, { method: 'DELETE', headers: tom }),
    ])

    expect(responses.map(response => response.status)).toEqual([403, 403, 403])
    expect((await responses[0]!.json()).statusMessage).toBe(
      'Only the person who added this roaster or an admin can edit it',
    )
    expect(await roasterOn(coffeePath, sarah)).toMatchObject({
      name: 'Square Mile',
      logoUrl: null,
    })
  })

  it('clears the details left blank', async () => {
    const { sarah, coffeePath, roasterPath } = await sharedShelf()
    await edit(roasterPath, sarah, details)

    await edit(roasterPath, sarah, {
      name: 'Square Mile',
      website: '',
      countryCode: '',
      city: ' ',
    })

    expect(await roasterOn(coffeePath, sarah)).toMatchObject({
      website: null,
      countryCode: null,
      city: null,
    })
  })

  it('refuses a name another roaster already has', async () => {
    const { sarah, roasterPath } = await sharedShelf()
    const other = await createTestUser(db)
    const otherShelf = await createShelf(db, {
      name: 'Other',
      ownerId: other.id,
    })
    await request(`/api/shelves/${otherShelf.id}/coffees`, {
      method: 'POST',
      headers: await signedIn(other.id),
      body: JSON.stringify({
        name: 'Gesha',
        roaster: 'La Cabra',
        roastLevel: 'light',
        roastedFor: 'filter',
        colour: '#e4572e',
        origins: ['PA'],
        processes: ['Washed'],
        purchasedOn: '2026-09-01',
      }),
    })

    const response = await edit(roasterPath, sarah, { name: 'la cabra' })

    expect(response.status).toBe(409)
    expect((await response.json()).data.errors).toEqual({
      name: 'There is already a roaster called La Cabra',
    })
  })

  it('explains details that are not right', async () => {
    const { sarah, roasterPath } = await sharedShelf()

    const response = await edit(roasterPath, sarah, {
      name: '',
      website: 'squaremile',
      countryCode: 'XX',
    })

    expect(response.status).toBe(400)
    expect((await response.json()).data.errors).toEqual({
      name: 'Give the roaster a name',
      website: 'Enter a website that starts with https://',
      countryCode: 'Pick a country from the list',
    })
  })

  it('says when there is no such roaster', async () => {
    const { sarah } = await sharedShelf()

    const response = await edit('/api/roasters/nope', sarah, details)

    expect(response.status).toBe(404)
  })

  it('asks to sign in first', async () => {
    const { roasterPath } = await sharedShelf()

    const response = await request(roasterPath, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(details),
    })

    expect(response.status).toBe(401)
  })
})

describe('the logo of a roaster', () => {
  it('is stored like a coffee photo and shown to everyone', async () => {
    const { sarah, tom, coffeePath, roasterPath } = await sharedShelf()

    const response = await uploadLogo(roasterPath, sarah)
    const { logoUrl } = await response.json()
    const served = await request(logoUrl)

    expect(logoUrl).toMatch(/^\/api\/photos\/roasters\/[\w-]+\.webp$/)
    expect((await roasterOn(coffeePath, tom)).logoUrl).toBe(logoUrl)
    expect(served.headers.get('content-type')).toBe('image/webp')
    expect(await served.text()).toBe('logo')
  })

  it('deletes the old logo when it is replaced', async () => {
    const { sarah, roasterPath } = await sharedShelf()
    const { logoUrl: oldUrl } = await (
      await uploadLogo(roasterPath, sarah)
    ).json()

    const { logoUrl: newUrl } = await (
      await uploadLogo(roasterPath, sarah, 'new logo')
    ).json()

    expect((await request(oldUrl)).status).toBe(404)
    expect(await (await request(newUrl)).text()).toBe('new logo')
  })

  it('removes the logo and its file', async () => {
    const { admin, sarah, coffeePath, roasterPath } = await sharedShelf()
    const { logoUrl } = await (await uploadLogo(roasterPath, sarah)).json()

    const response = await request(`${roasterPath}/logo`, {
      method: 'DELETE',
      headers: admin,
    })

    expect(await response.json()).toEqual({ logoUrl: null })
    expect((await roasterOn(coffeePath, sarah)).logoUrl).toBeNull()
    expect((await request(logoUrl)).status).toBe(404)
  })
})
