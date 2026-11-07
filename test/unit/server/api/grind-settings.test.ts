import { createApp, createRouter, toWebHandler } from 'h3'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { shelfMember } from '#server/db/schemas'
import showCoffeeHandler from '#server/api/shelves/[shelfId]/coffees/[coffeeId].get'
import listGrindSettingsHandler from '#server/api/shelves/[shelfId]/coffees/[coffeeId]/grind-settings.get'
import grindSettingsHandler from '#server/api/shelves/[shelfId]/coffees/[coffeeId]/grind-settings.put'
import addCoffeeHandler from '#server/api/shelves/[shelfId]/coffees/index.post'
import stockHandler from '#server/api/shelves/[shelfId]/stock.get'
import { listBrewMethods } from '#server/utils/brew-methods'
import { ownGrinder } from '#server/utils/grinders'
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

const coffeePath = '/api/shelves/:shelfId/coffees/:coffeeId'

function request(path: string, init: RequestInit = {}) {
  const router = createRouter()
    .get('/api/shelves/:shelfId/stock', stockHandler)
    .post('/api/shelves/:shelfId/coffees', addCoffeeHandler)
    .get(coffeePath, showCoffeeHandler)
    .get(`${coffeePath}/grind-settings`, listGrindSettingsHandler)
    .put(`${coffeePath}/grind-settings`, grindSettingsHandler)
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
  const opus = await ownGrinder(db, {
    shelfId: shelf.id,
    userId: sarah.id,
    grinder: { brand: 'Fellow', model: 'Opus Gen 2' },
  })
  const [espresso] = await listBrewMethods(db)

  return {
    shelf,
    sarah: sarahHeaders,
    tom: await signedIn(tom.id),
    path: `/api/shelves/${shelf.id}/coffees/${coffee.id}`,
    setting: { grinderId: opus.id, brewMethodId: espresso!.id },
  }
}

function grind(path: string, headers: Headers, change: unknown) {
  return request(`${path}/grind-settings`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(change),
  })
}

async function grindSettingsAt(path: string, headers: Headers) {
  const response = await request(`${path}/grind-settings`, { headers })

  return response.json()
}

describe('PUT /api/shelves/:shelfId/coffees/:coffeeId/grind-settings', () => {
  it('remembers a grind setting for the signed-in user', async () => {
    const { sarah, path, setting } = await sharedShelf()

    const response = await grind(path, sarah, { ...setting, setting: ' 12 ' })

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ ...setting, setting: '12' })
  })

  it('keeps each member’s own setting and shows them the others’', async () => {
    const { sarah, tom, path, setting } = await sharedShelf()

    await grind(path, sarah, { ...setting, setting: '12' })
    await grind(path, tom, { ...setting, setting: '10' })

    const asSarah = await grindSettingsAt(path, sarah)

    expect(asSarah.grindSettings).toEqual([
      {
        ...setting,
        brand: 'Fellow',
        model: 'Opus Gen 2',
        brewMethod: 'Espresso',
        setting: '12',
      },
    ])
    expect(asSarah.otherGrindSettings).toEqual([
      expect.objectContaining({
        ...setting,
        name: 'Tom',
        setting: '10',
        ownedByShelf: true,
      }),
    ])
  })

  it('only ever changes the signed-in user’s own setting', async () => {
    const { sarah, tom, path, setting } = await sharedShelf()

    await grind(path, sarah, { ...setting, setting: '12' })
    await grind(path, tom, { ...setting, setting: '10' })
    await grind(path, tom, { ...setting, setting: '' })

    const asSarah = await grindSettingsAt(path, sarah)

    expect(
      asSarah.grindSettings.map((saved: { setting: string }) => saved.setting),
    ).toEqual(['12'])
    expect(asSarah.otherGrindSettings).toEqual([])
  })

  it('clears a setting left blank', async () => {
    const { sarah, path, setting } = await sharedShelf()
    await grind(path, sarah, { ...setting, setting: '12' })

    const response = await grind(path, sarah, { ...setting, setting: '' })

    expect(await response.json()).toEqual({ ...setting, setting: null })
    const coffee = await grindSettingsAt(path, sarah)
    expect(coffee.grindSettings).toEqual([])
  })

  it('keeps grind settings off the stock cards', async () => {
    const { shelf, sarah, path, setting } = await sharedShelf()
    await grind(path, sarah, { ...setting, setting: '12' })

    const stock = await (
      await request(`/api/shelves/${shelf.id}/stock`, { headers: sarah })
    ).json()

    expect(stock[0]).not.toHaveProperty('grindSettings')
  })

  it('hides the settings from anyone off the shelf', async () => {
    const { sarah, path, setting } = await sharedShelf()
    await grind(path, sarah, { ...setting, setting: '12' })
    const outsider = await signedIn((await createTestUser(db)).id)

    const response = await grind(path, outsider, { ...setting, setting: '1' })
    const listed = await request(`${path}/grind-settings`, {
      headers: outsider,
    })

    expect(response.status).toBe(404)
    expect(listed.status).toBe(404)
  })

  it('refuses a grinder the shelf does not own', async () => {
    const { sarah, path, setting } = await sharedShelf()

    const response = await grind(path, sarah, {
      ...setting,
      grinderId: 'missing',
      setting: '12',
    })

    expect(response.status).toBe(404)
    expect((await response.json()).statusMessage).toBe(
      'This shelf does not own that grinder',
    )
  })

  it('explains a setting that is too long', async () => {
    const { sarah, path, setting } = await sharedShelf()

    const response = await grind(path, sarah, {
      ...setting,
      setting: '1'.repeat(31),
    })

    expect(response.status).toBe(400)
    expect((await response.json()).data.errors).toEqual({
      setting: 'Keep the setting to 30 characters or fewer',
    })
  })

  it('asks to sign in before showing them', async () => {
    const { path } = await sharedShelf()

    const response = await request(`${path}/grind-settings`)

    expect(response.status).toBe(401)
  })

  it('asks to sign in first', async () => {
    const { path, setting } = await sharedShelf()

    const response = await request(`${path}/grind-settings`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ...setting, setting: '12' }),
    })

    expect(response.status).toBe(401)
  })
})
