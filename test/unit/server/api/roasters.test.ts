import { createApp, createRouter, toWebHandler } from 'h3'
import sharp from 'sharp'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { shelfMember } from '#server/db/schemas'
import photoHandler from '#server/api/photos/[...pathname].get'
import editRoasterHandler from '#server/api/roasters/[roasterId].patch'
import showRoasterHandler from '#server/api/roasters/[roasterId].get'
import addRoasterHandler from '#server/api/roasters.post'
import roastersHandler from '#server/api/shelves/[shelfId]/roasters/index.get'
import roasterFilterHandler from '#server/api/shelves/[shelfId]/roasters/[filter].get'
import removeLogoHandler from '#server/api/roasters/[roasterId]/logo.delete'
import replaceLogoHandler from '#server/api/roasters/[roasterId]/logo.put'
import coffeeRoasterHandler from '#server/api/coffees/[coffeeId]/roaster.get'
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
    .get('/api/coffees/:coffeeId/roaster', coffeeRoasterHandler)
    .get('/api/shelves/:shelfId/roasters', roastersHandler)
    .get('/api/shelves/:shelfId/roasters/:filter', roasterFilterHandler)
    .post('/api/roasters', addRoasterHandler)
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
      origins: ['ET'],
      processes: ['Washed'],
      purchasedOn: '2026-09-01',
    }),
  })
  const { coffee } = await added.json()
  const coffeePath = `/api/shelves/${shelf.id}/coffees/${coffee.id}`
  const shown = await (
    await request(`/api/coffees/${coffee.id}/roaster`, {
      headers: sarahHeaders,
    })
  ).json()

  return {
    shelf,
    sarah: sarahHeaders,
    tom: await signedIn(tom.id),
    admin: await signedIn(admin.id),
    coffeePath,
    coffeeId: coffee.id as string,
    roasterPath: `/api/roasters/${shown.id}`,
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

function logoImage(ink = '#e4572e') {
  return sharp({
    create: { width: 300, height: 100, channels: 3, background: '#ffffff' },
  })
    .composite([
      {
        input: {
          create: { width: 200, height: 40, channels: 3, background: ink },
        },
        left: 50,
        top: 30,
      },
    ])
    .webp()
    .toBuffer()
}

async function uploadLogo(
  path: string,
  headers: Headers,
  content?: Buffer | string,
) {
  const body = new FormData()
  body.append(
    'photo',
    new Blob([new Uint8Array(Buffer.from(content ?? (await logoImage())))], {
      type: 'image/webp',
    }),
    'logo.webp',
  )
  const multipart = new Headers(headers)
  multipart.delete('content-type')

  return request(`${path}/logo`, { method: 'PUT', headers: multipart, body })
}

async function roasterOn(coffeeId: string, headers: Headers) {
  const response = await request(`/api/coffees/${coffeeId}/roaster`, {
    headers,
  })

  return response.json()
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

  it('finds roasters by what was typed and the picked countries', async () => {
    const { shelf, sarah, roasterPath } = await sharedShelf()
    await edit(roasterPath, sarah, details)
    const names = async (query: string) =>
      (
        await (
          await request(`/api/shelves/${shelf.id}/roasters?${query}`, {
            headers: sarah,
          })
        ).json()
      ).roasters.map((found: { name: string }) => found.name)

    expect(await names('search=london')).toEqual([details.name])
    expect(await names('countryCode=GB&countryCode=DK')).toEqual([details.name])
    expect(await names('countryCode=DK')).toEqual([])
  })

  it('offers the countries the roasters are in', async () => {
    const { shelf, sarah, roasterPath } = await sharedShelf()
    await edit(roasterPath, sarah, details)

    const response = await request(
      `/api/shelves/${shelf.id}/roasters/countries?search=united`,
      { headers: sarah },
    )

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      options: [{ value: 'GB', label: 'United Kingdom' }],
      hasMore: false,
    })
  })

  it('has no other roaster filter', async () => {
    const { shelf, sarah } = await sharedShelf()

    const response = await request(`/api/shelves/${shelf.id}/roasters/cities`, {
      headers: sarah,
    })

    expect(response.status).toBe(404)
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

function add(headers: HeadersInit, body: unknown) {
  return request('/api/roasters', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })
}

describe('adding a roaster', () => {
  it('lets anyone signed in add a roaster with its details', async () => {
    const { sarah } = await sharedShelf()

    const response = await add(sarah, { ...details, name: 'La Cabra' })

    expect(response.status).toBe(201)
    const added = await response.json()
    expect(added).toEqual({ id: expect.any(String), name: 'La Cabra' })
    const shown = await request(`/api/roasters/${added.id}`, { headers: sarah })
    expect(await shown.json()).toMatchObject({
      name: 'La Cabra',
      website: details.website,
      countryCode: 'GB',
      city: 'London',
      canEdit: true,
    })
  })

  it('refuses a name another roaster already has', async () => {
    const { tom } = await sharedShelf()

    const response = await add(tom, { name: 'square mile' })

    expect(response.status).toBe(409)
    expect((await response.json()).data.errors).toEqual({
      name: 'There is already a roaster called Square Mile',
    })
  })

  it('explains details that are not right', async () => {
    const { sarah } = await sharedShelf()

    const response = await add(sarah, { name: '', website: 'lacabra' })

    expect(response.status).toBe(400)
    expect((await response.json()).data.errors).toEqual({
      name: 'Give the roaster a name',
      website: 'Enter a website that starts with https://',
    })
  })

  it('asks to sign in first', async () => {
    const response = await add({ 'content-type': 'application/json' }, details)

    expect(response.status).toBe(401)
  })
})

describe('the details of a roaster', () => {
  it('starts with only a name, editable by the person who added it', async () => {
    const { sarah, tom, coffeeId } = await sharedShelf()

    expect(await roasterOn(coffeeId, sarah)).toEqual({
      id: expect.any(String),
      name: 'Square Mile',
      website: null,
      countryCode: null,
      city: null,
      logoUrl: null,
      canEdit: true,
    })
    expect((await roasterOn(coffeeId, tom)).canEdit).toBe(false)
  })

  it('lets the person who added it fill in its details', async () => {
    const { sarah, tom, coffeePath, roasterPath, coffeeId } =
      await sharedShelf()

    const response = await edit(roasterPath, sarah, details)

    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject(details)
    expect(await roasterOn(coffeeId, tom)).toMatchObject(details)
    const coffee = await (await request(coffeePath, { headers: tom })).json()
    expect(coffee.roaster).toBe('Square Mile Coffee Roasters')
  })

  it('lets an admin edit a roaster someone else added', async () => {
    const { admin, roasterPath } = await sharedShelf()

    const response = await edit(roasterPath, admin, details)

    expect(response.status).toBe(200)
  })

  it('refuses everyone else, even a member of the same shelf', async () => {
    const { tom, sarah, coffeeId, roasterPath } = await sharedShelf()

    const responses = await Promise.all([
      edit(roasterPath, tom, details),
      uploadLogo(roasterPath, tom),
      request(`${roasterPath}/logo`, { method: 'DELETE', headers: tom }),
    ])

    expect(responses.map(response => response.status)).toEqual([403, 403, 403])
    expect((await responses[0]!.json()).statusMessage).toBe(
      'Only the person who added this roaster or an admin can edit it',
    )
    expect(await roasterOn(coffeeId, sarah)).toMatchObject({
      name: 'Square Mile',
      logoUrl: null,
    })
  })

  it('clears the details left blank', async () => {
    const { sarah, coffeeId, roasterPath } = await sharedShelf()
    await edit(roasterPath, sarah, details)

    await edit(roasterPath, sarah, {
      name: 'Square Mile',
      website: '',
      countryCode: '',
      city: ' ',
    })

    expect(await roasterOn(coffeeId, sarah)).toMatchObject({
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
    const { sarah, tom, coffeeId, roasterPath } = await sharedShelf()

    const response = await uploadLogo(roasterPath, sarah)
    const { logoUrl } = await response.json()
    const served = await request(logoUrl)

    expect(logoUrl).toMatch(/^\/api\/photos\/roasters\/[\w-]+\.webp$/)
    expect((await roasterOn(coffeeId, tom)).logoUrl).toBe(logoUrl)
    expect(served.headers.get('content-type')).toBe('image/webp')

    const shaped = await sharp(
      Buffer.from(await served.arrayBuffer()),
    ).metadata()

    expect(shaped.width).toBe(shaped.height)
  })

  it('refuses a logo that is not an image', async () => {
    const { sarah, coffeeId, roasterPath } = await sharedShelf()

    const response = await uploadLogo(roasterPath, sarah, 'not a logo')

    expect(response.status).toBe(422)
    expect((await roasterOn(coffeeId, sarah)).logoUrl).toBeNull()
  })

  it('deletes the old logo when it is replaced', async () => {
    const { sarah, roasterPath } = await sharedShelf()
    const { logoUrl: oldUrl } = await (
      await uploadLogo(roasterPath, sarah)
    ).json()

    const { logoUrl: newUrl } = await (
      await uploadLogo(roasterPath, sarah, await logoImage('#1d4ed8'))
    ).json()

    expect((await request(oldUrl)).status).toBe(404)
    expect((await request(newUrl)).status).toBe(200)
  })

  it('removes the logo and its file', async () => {
    const { admin, sarah, coffeeId, roasterPath } = await sharedShelf()
    const { logoUrl } = await (await uploadLogo(roasterPath, sarah)).json()

    const response = await request(`${roasterPath}/logo`, {
      method: 'DELETE',
      headers: admin,
    })

    expect(await response.json()).toEqual({ logoUrl: null })
    expect((await roasterOn(coffeeId, sarah)).logoUrl).toBeNull()
    expect((await request(logoUrl)).status).toBe(404)
  })
})
