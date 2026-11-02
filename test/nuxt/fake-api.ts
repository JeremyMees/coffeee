import { registerEndpoint } from '@nuxt/test-utils/runtime'
import { createError, getQuery, readBody } from 'h3'
import type { H3Event } from 'h3'
import type { ListEntry } from '~/queries/lists'
import { nameKey } from '#imports'

export function fakeList<Entry extends ListEntry>(entries: () => Entry[]) {
  return (event: H3Event) => {
    const key = nameKey(String(getQuery(event).search ?? ''))

    return entries().filter(entry => nameKey(entry.name).includes(key))
  }
}

export function fakeRegions(regions: () => (ListEntry & { origin: string })[]) {
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
    farms: [] as (ListEntry & { origin: string })[],
    washingStations: [{ id: 'w1', name: 'Hambela', origin: 'ET' }],
    producers: [] as ListEntry[],
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
    ],
  }
}

export const api = {
  stock: [] as unknown[],
  added: [] as unknown[],
  edits: [] as unknown[],
  shelves: [] as string[],
  coffee: ayele() as Record<string, unknown>,
}

export function resetApi() {
  api.stock = []
  api.added = []
  api.edits = []
  api.shelves = []
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
}
