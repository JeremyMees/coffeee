import { createApp, createRouter, toWebHandler } from 'h3'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import farmsHandler from '#server/api/farms.get'
import flavorNotesHandler from '#server/api/flavor-notes.get'
import processesHandler from '#server/api/processes.get'
import producersHandler from '#server/api/producers.get'
import regionsHandler from '#server/api/regions.get'
import roastersHandler from '#server/api/roasters.get'
import showCoffeeHandler from '#server/api/shelves/[shelfId]/coffees/[coffeeId].get'
import editCoffeeHandler from '#server/api/shelves/[shelfId]/coffees/[coffeeId].patch'
import addCoffeeHandler from '#server/api/shelves/[shelfId]/coffees/index.post'
import stockHandler from '#server/api/shelves/[shelfId]/stock.get'
import varietalsHandler from '#server/api/varietals.get'
import washingStationsHandler from '#server/api/washing-stations.get'
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
    .get('/api/roasters', roastersHandler)
    .get('/api/regions', regionsHandler)
    .get('/api/farms', farmsHandler)
    .get('/api/washing-stations', washingStationsHandler)
    .get('/api/producers', producersHandler)
    .get('/api/processes', processesHandler)
    .get('/api/varietals', varietalsHandler)
    .get('/api/flavor-notes', flavorNotesHandler)
    .get('/api/shelves/:shelfId/stock', stockHandler)
    .post('/api/shelves/:shelfId/coffees', addCoffeeHandler)
    .get('/api/shelves/:shelfId/coffees/:coffeeId', showCoffeeHandler)
    .patch('/api/shelves/:shelfId/coffees/:coffeeId', editCoffeeHandler)
  const app = createApp().use(router)

  return toWebHandler(app)(new Request(`http://localhost:3000${path}`, init))
}

async function member(role = 'user') {
  const user = await createTestUser(db, { role })
  const shelf = await createShelf(db, { name: 'Home', ownerId: user.id })
  const headers = await testAuth.signIn(user.id)
  headers.set('content-type', 'application/json')

  return { user, shelf, headers }
}

const coffee = {
  name: 'Ayele Fulasa',
  roaster: 'Square Mile',
  roastLevel: 'light',
  roastedFor: 'filter',
  colour: '#e4572e',
  origins: ['ET'],
  processes: ['Washed'],
  purchasedOn: '2026-11-01',
  roastedOn: '2026-10-28',
  sizeGrams: 250,
  price: 16.5,
}

function add(shelfId: string, headers: Headers, body: unknown = coffee) {
  return request(`/api/shelves/${shelfId}/coffees`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })
}

describe('adding a coffee to a shelf', () => {
  it('adds it to the current stock of that shelf', async () => {
    const { shelf, headers } = await member()

    const added = await add(shelf.id, headers)
    const stock = await request(`/api/shelves/${shelf.id}/stock`, { headers })

    expect(added.status).toBe(201)
    expect(await stock.json()).toEqual([
      expect.objectContaining({
        name: 'Ayele Fulasa',
        roaster: 'Square Mile',
        roastLevel: 'light',
        roastedOn: '2026-10-28',
      }),
    ])
  })

  it('explains what is wrong in plain words', async () => {
    const { shelf, headers } = await member()

    const response = await add(shelf.id, headers, { ...coffee, name: ' ' })
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.statusMessage).toBe('Give the coffee a name')
    expect(body.data).toEqual({ errors: { name: 'Give the coffee a name' } })
  })

  it('refuses anonymous requests', async () => {
    const { shelf } = await member()

    const response = await add(shelf.id, new Headers())

    expect(response.status).toBe(401)
  })
})

describe('a shelf someone is not a member of', () => {
  async function stranger() {
    const { shelf, headers: memberHeaders } = await member()
    const added = await add(shelf.id, memberHeaders)
    const { coffee: created } = await added.json()
    const outsider = await createTestUser(db)
    const headers = await testAuth.signIn(outsider.id)
    headers.set('content-type', 'application/json')

    return { shelf, coffeeId: created.id as string, headers }
  }

  it('shows them no stock', async () => {
    const { shelf, headers } = await stranger()

    const response = await request(`/api/shelves/${shelf.id}/stock`, {
      headers,
    })

    expect(response.status).toBe(404)
  })

  it('shows them none of its purchases', async () => {
    const { shelf, coffeeId, headers } = await stranger()

    const response = await request(
      `/api/shelves/${shelf.id}/coffees/${coffeeId}`,
      { headers },
    )

    expect(response.status).toBe(404)
  })

  it('does not let them add to it', async () => {
    const { shelf, headers } = await stranger()

    const response = await add(shelf.id, headers)

    expect(response.status).toBe(404)
  })
})

describe('GET /api/shelves/:shelfId/coffees/:coffeeId', () => {
  it('shows a coffee with the purchases of the shelf', async () => {
    const { shelf, headers } = await member()
    const added = await add(shelf.id, headers)
    const { coffee: created } = await added.json()

    const response = await request(
      `/api/shelves/${shelf.id}/coffees/${created.id}`,
      { headers },
    )

    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({
      name: 'Ayele Fulasa',
      purchases: [{ purchasedOn: '2026-11-01', priceCents: 1650 }],
    })
  })

  it('says when there is no such coffee', async () => {
    const { shelf, headers } = await member()

    const response = await request(`/api/shelves/${shelf.id}/coffees/nope`, {
      headers,
    })

    expect(response.status).toBe(404)
  })
})

describe('PATCH /api/shelves/:shelfId/coffees/:coffeeId', () => {
  const details = {
    name: 'Ayele Fulasa Natural',
    roaster: 'Square Mile',
    roastLevel: 'medium',
    roastedFor: 'omni',
    colour: '#3d5a80',
    origins: ['ET'],
    processes: ['Natural'],
    link: 'https://example.com/ayele',
  }

  async function addedCoffee() {
    const creator = await member()
    const added = await add(creator.shelf.id, creator.headers)
    const { coffee: created } = await added.json()

    return { creator, coffeeId: created.id as string }
  }

  function edit(
    shelfId: string,
    coffeeId: string,
    headers: Headers,
    body: unknown = details,
  ) {
    return request(`/api/shelves/${shelfId}/coffees/${coffeeId}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(body),
    })
  }

  async function canEdit(shelfId: string, coffeeId: string, headers: Headers) {
    const response = await request(
      `/api/shelves/${shelfId}/coffees/${coffeeId}`,
      { headers },
    )

    return (await response.json()).canEdit
  }

  it('lets the person who added it change its details', async () => {
    const { creator, coffeeId } = await addedCoffee()

    const response = await edit(creator.shelf.id, coffeeId, creator.headers)

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      id: coffeeId,
      ...details,
      origins: [{ code: 'ET', name: 'Ethiopia' }],
      regions: [],
      farms: [],
      washingStations: [],
      producers: [],
      processes: [{ id: expect.any(String), name: 'Natural' }],
      varietals: [],
      flavorNotes: [],
      altitudeFrom: null,
      altitudeTo: null,
    })
    expect(await canEdit(creator.shelf.id, coffeeId, creator.headers)).toBe(
      true,
    )
  })

  it('lets an admin change it from their own shelf', async () => {
    const { coffeeId } = await addedCoffee()
    const admin = await member('admin')

    const response = await edit(admin.shelf.id, coffeeId, admin.headers)

    expect(response.status).toBe(200)
    expect(await canEdit(admin.shelf.id, coffeeId, admin.headers)).toBe(true)
  })

  it('refuses anyone else', async () => {
    const { coffeeId } = await addedCoffee()
    const other = await member()

    const response = await edit(other.shelf.id, coffeeId, other.headers)

    expect(response.status).toBe(403)
    expect((await response.json()).statusMessage).toBe(
      'Only the person who added this coffee or an admin can edit it',
    )
    expect(await canEdit(other.shelf.id, coffeeId, other.headers)).toBe(false)
  })

  it('refuses a roaster and name that already exist with a clear message', async () => {
    const { creator, coffeeId } = await addedCoffee()
    await add(creator.shelf.id, creator.headers, {
      ...coffee,
      name: 'Red Brick',
    })

    const response = await edit(creator.shelf.id, coffeeId, creator.headers, {
      ...details,
      name: 'red brick',
    })
    const body = await response.json()

    expect(response.status).toBe(409)
    expect(body.data).toEqual({
      errors: { name: 'Square Mile already has a coffee called Red Brick' },
    })
  })

  it('explains what is wrong in plain words', async () => {
    const { creator, coffeeId } = await addedCoffee()

    const response = await edit(creator.shelf.id, coffeeId, creator.headers, {
      ...details,
      roastLevel: 'burnt',
    })

    expect(response.status).toBe(400)
    expect((await response.json()).statusMessage).toBe('Pick a roast level')
  })

  it('says when there is no such coffee', async () => {
    const { creator } = await addedCoffee()

    const response = await edit(creator.shelf.id, 'nope', creator.headers)

    expect(response.status).toBe(404)
  })

  it('refuses a shelf the editor is not a member of', async () => {
    const { creator, coffeeId } = await addedCoffee()
    const admin = await member('admin')

    const response = await edit(creator.shelf.id, coffeeId, admin.headers)

    expect(response.status).toBe(404)
  })

  it('refuses anonymous requests', async () => {
    const { creator, coffeeId } = await addedCoffee()

    const response = await edit(creator.shelf.id, coffeeId, new Headers())

    expect(response.status).toBe(401)
  })
})

describe('GET /api/roasters', () => {
  it('lists the roasters for anyone signed in', async () => {
    const { shelf, headers } = await member()
    await add(shelf.id, headers)

    const response = await request('/api/roasters', { headers })

    expect(await response.json()).toEqual([
      { id: expect.any(String), name: 'Square Mile' },
    ])
  })

  it('suggests the roasters similar to a search', async () => {
    const { shelf, headers } = await member()
    await add(shelf.id, headers)

    const similar = await request('/api/roasters?search=squar%20mil', {
      headers,
    })
    const unknown = await request('/api/roasters?search=April', { headers })

    expect(await similar.json()).toEqual([
      { id: expect.any(String), name: 'Square Mile' },
    ])
    expect(await unknown.json()).toEqual([])
  })

  it('refuses a search that is too long', async () => {
    const { headers } = await member()

    const response = await request(`/api/roasters?search=${'a'.repeat(81)}`, {
      headers,
    })

    expect(response.status).toBe(400)
    expect(await response.json()).toMatchObject({
      data: { errors: { search: 'Keep the search to 80 characters or fewer' } },
    })
  })

  it('refuses anonymous requests', async () => {
    const response = await request('/api/roasters')

    expect(response.status).toBe(401)
  })
})

describe('GET /api/regions', () => {
  it('suggests the regions of the origins asked for', async () => {
    const { shelf, headers } = await member()
    await add(shelf.id, headers, {
      ...coffee,
      origins: ['CO', 'ET'],
      regions: [
        { origin: 'CO', name: 'Huila' },
        { origin: 'ET', name: 'Guji' },
      ],
    })

    const response = await request('/api/regions?origins=CO,XX&search=hui', {
      headers,
    })

    expect(await response.json()).toEqual([
      { id: expect.any(String), name: 'Huila', origin: 'CO' },
    ])
  })

  it('suggests nothing without origins', async () => {
    const { headers } = await member()

    const response = await request('/api/regions', { headers })

    expect(await response.json()).toEqual([])
  })

  it('refuses anonymous requests', async () => {
    const response = await request('/api/regions?origins=CO')

    expect(response.status).toBe(401)
  })
})

describe('GET /api/farms and /api/washing-stations', () => {
  it('suggest the entries of the origins asked for', async () => {
    const { shelf, headers } = await member()
    await add(shelf.id, headers, {
      ...coffee,
      origins: ['CO', 'ET'],
      farms: [{ origin: 'CO', name: 'La Palma' }],
      washingStations: [{ origin: 'ET', name: 'Hambela' }],
    })

    const farms = await request('/api/farms?origins=CO&search=palma', {
      headers,
    })
    const stations = await request('/api/washing-stations?origins=CO', {
      headers,
    })

    expect(await farms.json()).toEqual([
      { id: expect.any(String), name: 'La Palma', origin: 'CO' },
    ])
    expect(await stations.json()).toEqual([])
  })

  it('refuse anonymous requests', async () => {
    const farms = await request('/api/farms?origins=CO')
    const stations = await request('/api/washing-stations?origins=CO')

    expect(farms.status).toBe(401)
    expect(stations.status).toBe(401)
  })
})

describe('GET /api/processes and /api/varietals', () => {
  it('suggest the seeded processes and the varietals used so far', async () => {
    const { shelf, headers } = await member()
    await add(shelf.id, headers, { ...coffee, varietals: ['Pink Bourbon'] })

    const processes = await request('/api/processes?search=anaerob', {
      headers,
    })
    const varietals = await request('/api/varietals?search=bourbon', {
      headers,
    })

    expect(await processes.json()).toEqual([
      { id: expect.any(String), name: 'Anaerobic' },
    ])
    expect(await varietals.json()).toEqual([
      { id: expect.any(String), name: 'Pink Bourbon' },
    ])
  })

  it('refuse anonymous requests', async () => {
    expect((await request('/api/processes')).status).toBe(401)
    expect((await request('/api/varietals')).status).toBe(401)
  })
})

describe('GET /api/flavor-notes', () => {
  it('suggests the flavor notes similar to a search', async () => {
    const { shelf, headers } = await member()
    await add(shelf.id, headers, { ...coffee, flavorNotes: ['Milk chocolate'] })

    const response = await request('/api/flavor-notes?search=choclate', {
      headers,
    })

    expect(await response.json()).toEqual([
      { id: expect.any(String), name: 'Milk chocolate' },
    ])
  })

  it('refuses anonymous requests', async () => {
    expect((await request('/api/flavor-notes')).status).toBe(401)
  })
})

describe('describing how a coffee was made', () => {
  it('refuses a coffee without a process', async () => {
    const { shelf, headers } = await member()

    const response = await add(shelf.id, headers, { ...coffee, processes: [] })

    expect(response.status).toBe(400)
    expect(await response.json()).toMatchObject({
      data: { errors: { processes: 'Pick how it was processed' } },
    })
  })

  it('refuses a link that is not a web address', async () => {
    const { shelf, headers } = await member()

    const response = await add(shelf.id, headers, {
      ...coffee,
      link: 'javascript:alert(1)',
    })

    expect(response.status).toBe(400)
    expect(await response.json()).toMatchObject({
      data: { errors: { link: 'Enter a link that starts with https://' } },
    })
  })
})

describe('GET /api/producers', () => {
  it('suggests the producers similar to a search', async () => {
    const { shelf, headers } = await member()
    await add(shelf.id, headers, { ...coffee, producers: ['Nestor Lasso'] })

    const response = await request('/api/producers?search=nestr', { headers })

    expect(await response.json()).toEqual([
      { id: expect.any(String), name: 'Nestor Lasso' },
    ])
  })

  it('refuses anonymous requests', async () => {
    const response = await request('/api/producers')

    expect(response.status).toBe(401)
  })
})

describe('describing where a coffee was grown', () => {
  it("refuses a farm or washing station outside the coffee's origins", async () => {
    const { shelf, headers } = await member()

    const response = await add(shelf.id, headers, {
      ...coffee,
      origins: ['ET'],
      farms: [{ origin: 'CO', name: 'La Palma' }],
      washingStations: [{ origin: 'CO', name: 'Tres Dragones' }],
    })

    expect(response.status).toBe(400)
    expect(await response.json()).toMatchObject({
      data: {
        errors: {
          farms: "Pick farms from the coffee's own origins",
          washingStations:
            "Pick washing stations from the coffee's own origins",
        },
      },
    })
  })

  it("refuses a region outside the coffee's origins", async () => {
    const { shelf, headers } = await member()

    const response = await add(shelf.id, headers, {
      ...coffee,
      origins: ['ET'],
      regions: [{ origin: 'CO', name: 'Huila' }],
    })

    expect(response.status).toBe(400)
    expect(await response.json()).toMatchObject({
      data: {
        errors: { regions: "Pick regions from the coffee's own origins" },
      },
    })
  })

  it('refuses a coffee without an origin', async () => {
    const { shelf, headers } = await member()

    const response = await add(shelf.id, headers, { ...coffee, origins: [] })

    expect(response.status).toBe(400)
    expect(await response.json()).toMatchObject({
      data: { errors: { origins: 'Pick where it was grown' } },
    })
  })
})
