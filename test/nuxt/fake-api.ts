import { registerEndpoint } from '@nuxt/test-utils/runtime'
import { createError, getQuery, readBody } from 'h3'
import type { H3Event } from 'h3'
import type { ListEntry, OriginListEntry } from '#shared/types/catalog'
import { nameKey } from '#imports'

export function fakeList<Entry extends ListEntry>(entries: () => Entry[]) {
  return (event: H3Event) => {
    const key = nameKey(String(getQuery(event).search ?? ''))

    return entries().filter(entry => nameKey(entry.name).includes(key))
  }
}

export function fakeRegions(regions: () => OriginListEntry[]) {
  return (event: H3Event) => {
    const origins = String(getQuery(event).origins ?? '').split(',')

    return fakeList(regions)(event).filter(region =>
      origins.includes(region.origin),
    )
  }
}

export function ayele() {
  return {
    id: 'c1',
    name: 'Ayele Fulasa',
    roaster: 'Square Mile',
    roastLevel: 'light',
    roastedFor: 'filter',
    colour: '#2f6f4f',
    origins: [{ code: 'ET', name: 'Ethiopia' }],
    regions: [{ id: 'g1', name: 'Guji', origin: 'ET' }],
    farms: [] as OriginListEntry[],
    washingStations: [{ id: 'w1', name: 'Hambela', origin: 'ET' }],
    producers: [] as ListEntry[],
    processes: [{ id: 's1', name: 'Washed' }],
    varietals: [] as ListEntry[],
    flavorNotes: [] as ListEntry[],
    link: null as string | null,
    photoUrl: null as string | null,
    altitudeFrom: 1900,
    altitudeTo: 2200,
    canEdit: true,
    purchases: [
      {
        id: 'p2',
        purchasedOn: '2026-11-01',
        roastedOn: '2026-10-28',
        sizeGrams: 250,
        priceCents: 1650,
        finishedAt: null,
      },
      {
        id: 'p1',
        purchasedOn: '2026-09-01',
        roastedOn: null,
        sizeGrams: null,
        priceCents: null,
        finishedAt: '2026-09-20T10:00:00.000Z',
      },
    ] as ShelfPurchase[],
  }
}

export const api = {
  stock: [] as unknown[],
  added: [] as unknown[],
  edits: [] as unknown[],
  shelves: [] as string[],
  photos: [] as string[],
  photoFails: false,
  purchaseCalls: [] as unknown[],
  purchaseFails: false,
  coffee: ayele() as Record<string, unknown>,
}

function purchases() {
  return api.coffee.purchases as ShelfPurchase[]
}

function setPurchases(changed: ShelfPurchase[]) {
  api.coffee = { ...api.coffee, purchases: changed }
}

function failPurchase() {
  if (api.purchaseFails) {
    throw createError({
      statusCode: 500,
      statusMessage: 'The shelf is out of reach',
    })
  }
}

function storedPurchase(id: string, body: Record<string, unknown>) {
  return {
    id,
    purchasedOn: String(body.purchasedOn),
    roastedOn: (body.roastedOn as string | null) ?? null,
    sizeGrams: (body.sizeGrams as number | null) ?? null,
    priceCents:
      body.price == null ? null : Math.round(Number(body.price) * 100),
    finishedAt: null as string | null,
  }
}

export function resetApi() {
  api.stock = []
  api.added = []
  api.edits = []
  api.shelves = []
  api.photos = []
  api.photoFails = false
  api.purchaseCalls = []
  api.purchaseFails = false
  api.coffee = ayele()
}

export function fakeApi() {
  registerEndpoint('/api/shelves', {
    method: 'POST',
    handler: async event => {
      const { name } = await readBody(event)
      api.shelves.push(name)

      if (name === 'Broken') {
        throw createError({
          statusCode: 409,
          statusMessage: 'That shelf could not be made',
        })
      }

      return { id: 'garage', name, ownerId: 'user-1' }
    },
  })

  registerEndpoint('/api/shelves/home/stock', () => api.stock)

  registerEndpoint(
    '/api/roasters',
    fakeList(() => [
      { id: 'r1', name: 'La Cabra' },
      { id: 'r2', name: 'Square Mile' },
    ]),
  )

  registerEndpoint(
    '/api/regions',
    fakeRegions(() => [
      { id: 'g1', name: 'Guji', origin: 'ET' },
      { id: 'h1', name: 'Huila', origin: 'CO' },
    ]),
  )

  registerEndpoint(
    '/api/farms',
    fakeRegions(() => [{ id: 'f1', name: 'La Palma', origin: 'CO' }]),
  )

  registerEndpoint(
    '/api/washing-stations',
    fakeRegions(() => [{ id: 'w1', name: 'Hambela', origin: 'ET' }]),
  )

  registerEndpoint(
    '/api/producers',
    fakeList(() => [
      { id: 'n1', name: 'Nestor Lasso' },
      { id: 'n2', name: 'Diego Bermudez' },
    ]),
  )

  registerEndpoint(
    '/api/processes',
    fakeList(() => [
      { id: 's1', name: 'Washed' },
      { id: 's2', name: 'Natural' },
      { id: 's3', name: 'Anaerobic' },
    ]),
  )

  registerEndpoint(
    '/api/varietals',
    fakeList(() => [
      { id: 'v1', name: 'Geisha' },
      { id: 'v2', name: 'Pink Bourbon' },
    ]),
  )

  registerEndpoint(
    '/api/flavor-notes',
    fakeList(() => [
      { id: 'n1', name: 'Lime' },
      { id: 'n2', name: 'Jasmine' },
    ]),
  )

  registerEndpoint('/api/shelves/home/coffees', {
    method: 'POST',
    handler: async event => {
      const body = await readBody(event)

      if (body.name === 'Crash') throw createError({ statusCode: 500 })

      if (body.name === 'Dates') {
        throw createError({
          statusCode: 400,
          data: {
            errors: {
              purchasedOn: 'Enter the date you bought it',
              roastedOn: 'Enter the roast date as a date',
            },
          },
        })
      }

      if (body.name === 'Broken') {
        throw createError({
          statusCode: 400,
          statusMessage: 'Give the coffee a name',
          data: { errors: { name: 'That name is taken by a ghost' } },
        })
      }

      api.added.push(body)

      return { coffee: { id: 'c9', ...body }, purchase: { id: 'p9' } }
    },
  })

  registerEndpoint('/api/shelves/home/coffees/c1', {
    method: 'GET',
    handler: () => api.coffee,
  })

  registerEndpoint('/api/shelves/home/coffees/c1', {
    method: 'PATCH',
    handler: async event => {
      const body = await readBody(event)

      if (body.name === 'Crash') throw createError({ statusCode: 500 })

      if (body.name === 'Red Brick') {
        throw createError({
          statusCode: 409,
          statusMessage: 'Square Mile already has a coffee called Red Brick',
          data: {
            errors: {
              name: 'Square Mile already has a coffee called Red Brick',
            },
          },
        })
      }

      api.edits.push(body)
      api.coffee = { ...api.coffee, ...body }

      return { id: 'c1', ...body }
    },
  })

  registerEndpoint('/api/shelves/home/coffees/c1/photo', {
    method: 'PUT',
    handler: () => {
      if (api.photoFails) {
        throw createError({
          statusCode: 413,
          statusMessage: 'That photo is too large',
        })
      }

      const photoUrl = '/api/photos/coffees/new.webp'
      api.photos.push('uploaded')
      api.coffee = { ...api.coffee, photoUrl }

      return { photoUrl }
    },
  })

  registerEndpoint('/api/shelves/home/coffees/c1/photo', {
    method: 'DELETE',
    handler: () => {
      api.photos.push('removed')
      api.coffee = { ...api.coffee, photoUrl: null }

      return { photoUrl: null }
    },
  })

  registerEndpoint('/api/shelves/home/coffees/c1/purchases', {
    method: 'POST',
    handler: async event => {
      const body = await readBody(event)
      api.purchaseCalls.push({ buyAgain: body })

      if (body.price === 999) {
        throw createError({
          statusCode: 400,
          data: { errors: { price: 'That price looks like a typo' } },
        })
      }

      failPurchase()

      const added = storedPurchase('p3', body)
      setPurchases([added, ...purchases()])

      return added
    },
  })

  registerEndpoint('/api/shelves/home/coffees/c1/finish', {
    method: 'POST',
    handler: () => {
      api.purchaseCalls.push('finish coffee')
      failPurchase()

      const oldest = purchases().findLast(purchase => !purchase.finishedAt)

      if (!oldest) {
        throw createError({
          statusCode: 409,
          statusMessage: 'Nothing of this coffee is in stock',
        })
      }

      const finished = { ...oldest, finishedAt: '2026-11-02T08:00:00.000Z' }
      setPurchases(
        purchases().map(purchase =>
          purchase.id === oldest.id ? finished : purchase,
        ),
      )

      return finished
    },
  })

  for (const id of ['p1', 'p2']) {
    const path = `/api/shelves/home/coffees/c1/purchases/${id}`

    registerEndpoint(path, {
      method: 'PATCH',
      handler: async event => {
        const body = await readBody(event)
        api.purchaseCalls.push({ edit: id, body })
        failPurchase()

        const edited = storedPurchase(id, body)
        setPurchases(
          purchases().map(purchase =>
            purchase.id === id
              ? { ...edited, finishedAt: purchase.finishedAt }
              : purchase,
          ),
        )

        return edited
      },
    })

    registerEndpoint(`${path}/finish`, {
      method: 'POST',
      handler: () => {
        api.purchaseCalls.push({ finish: id })
        failPurchase()
        setPurchases(
          purchases().map(purchase =>
            purchase.id === id
              ? { ...purchase, finishedAt: '2026-11-02T08:00:00.000Z' }
              : purchase,
          ),
        )

        return { id }
      },
    })

    registerEndpoint(path, {
      method: 'DELETE',
      handler: () => {
        api.purchaseCalls.push({ delete: id })
        failPurchase()
        setPurchases(purchases().filter(purchase => purchase.id !== id))

        return { id }
      },
    })
  }
}
