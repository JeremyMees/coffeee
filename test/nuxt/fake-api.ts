import { registerEndpoint } from '@nuxt/test-utils/runtime'
import { createError, getQuery, readBody } from 'h3'
import type { H3Event } from 'h3'
import type { ListEntry, OriginListEntry } from '#shared/types/catalog'
import {
  catalogFilters,
  catalogPageSize,
  isFavourite,
  libraryFilters,
  libraryPageSize,
  nameKey,
} from '#imports'

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
    rating: null as number | null,
    wouldBuyAgain: false,
    memberVerdicts: [] as MemberVerdict[],
    canEdit: true,
    grindSettings: [] as OwnGrindSetting[],
    otherGrindSettings: [] as OtherGrindSetting[],
    roasterDetails: squareMile(),
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

export function coffeeShelves() {
  return [
    { id: 'home', name: "Sarah's shelf", bags: 2, inStock: 1 },
    { id: 'work', name: 'Work', bags: 0, inStock: 0 },
  ]
}

export function libraryCoffee(
  overrides: Partial<LibraryCoffee> = {},
): LibraryCoffee {
  return {
    id: 'c1',
    name: 'Ayele Fulasa',
    roaster: 'Square Mile',
    roasterId: 'r2',
    roastLevel: 'light',
    roastedFor: 'filter',
    colour: '#2f6f4f',
    photoUrl: null,
    roastedOn: '2026-10-28',
    lastBought: '2026-11-01',
    rating: null,
    wouldBuyAgain: false,
    flavorNotes: [],
    origins: [{ code: 'ET', name: 'Ethiopia' }],
    latestPriceCents: 1650,
    ...overrides,
  }
}

export function libraryCoffees() {
  return [
    libraryCoffee({
      rating: 5,
      wouldBuyAgain: true,
      flavorNotes: [{ id: 'n1', name: 'Lime' }],
    }),
    libraryCoffee({
      id: 'c2',
      name: 'El Paraiso',
      roaster: 'La Cabra',
      roasterId: 'r1',
      roastLevel: 'medium',
      lastBought: '2026-10-01',
      rating: 4,
      wouldBuyAgain: false,
      flavorNotes: [{ id: 'n2', name: 'Jasmine' }],
      origins: [{ code: 'CO', name: 'Colombia' }],
      latestPriceCents: 2400,
    }),
    libraryCoffee({
      id: 'c3',
      name: 'Red Brick',
      roastLevel: 'dark',
      lastBought: '2026-09-01',
      flavorNotes: [{ id: 'n1', name: 'Lime' }],
      origins: [],
      latestPriceCents: null,
    }),
  ]
}

export function catalogCoffee(
  overrides: Partial<CatalogCoffee> = {},
): CatalogCoffee {
  return {
    id: 'c1',
    name: 'Ayele Fulasa',
    roaster: 'Square Mile',
    roasterId: 'r2',
    roastLevel: 'light',
    roastedFor: 'filter',
    colour: '#2f6f4f',
    photoUrl: null,
    roastedOn: '2026-10-28',
    rating: null,
    onShelf: true,
    flavorNotes: [{ id: 'n1', name: 'Lime' }],
    origins: [{ code: 'ET', name: 'Ethiopia' }],
    matches: [],
    ...overrides,
  }
}

export function catalogCoffees() {
  return [
    catalogCoffee({
      id: 'c4',
      name: 'Gesha Village',
      roaster: 'Tim Wendelboe',
      roasterId: 'r3',
      roastedFor: 'espresso',
      roastedOn: null,
      onShelf: false,
      flavorNotes: [{ id: 'n3', name: 'Strawberry' }],
      origins: [{ code: 'ET', name: 'Ethiopia' }],
    }),
    catalogCoffee(),
    catalogCoffee({
      id: 'c2',
      name: 'El Paraiso',
      roaster: 'La Cabra',
      roasterId: 'r1',
      roastLevel: 'medium',
      onShelf: false,
      flavorNotes: [{ id: 'n2', name: 'Jasmine' }],
      origins: [{ code: 'CO', name: 'Colombia' }],
    }),
  ]
}

export function squareMile(): ShelfRoaster {
  return {
    id: 'r2',
    name: 'Square Mile',
    website: 'https://www.squaremilecoffee.com',
    countryCode: 'GB',
    city: 'London',
    logoUrl: null,
    canEdit: true,
  }
}

export function opus() {
  return { id: 'opus', brand: 'Fellow', model: 'Opus Gen 2' }
}

export function brewMethods() {
  return [
    { id: 'espresso', name: 'Espresso' },
    { id: 'pour-over', name: 'Pour over' },
  ]
}

export function manyCoffees(count: number) {
  return Array.from({ length: count }, (_, index) =>
    libraryCoffee({ id: `m${index + 1}`, name: `Coffee ${index + 1}` }),
  )
}

export const libraryOptions = {
  roasters: [
    { value: 'r1', label: 'La Cabra' },
    { value: 'r2', label: 'Square Mile' },
    { value: 'r3', label: 'Tim Wendelboe' },
  ],
  'flavor-notes': [
    { value: 'n2', label: 'Jasmine' },
    { value: 'n1', label: 'Lime' },
  ],
  origins: [
    { value: 'CO', label: 'Colombia' },
    { value: 'ET', label: 'Ethiopia' },
  ],
} satisfies Record<LibraryFilterKind, LibraryOption[]>

export const catalogOptions = {
  ...libraryOptions,
  'flavor-notes': [
    { value: 'n2', label: 'Jasmine' },
    { value: 'n1', label: 'Lime' },
    { value: 'n3', label: 'Strawberry' },
  ],
  processes: [{ value: 's1', label: 'Washed' }],
  'roast-levels': [
    { value: 'light', label: 'Light' },
    { value: 'medium', label: 'Medium' },
  ],
  'roasted-for': [
    { value: 'espresso', label: 'Espresso' },
    { value: 'filter', label: 'Filter' },
  ],
} satisfies Record<CatalogFilterKind, LibraryOption[]>

const fakeFilterPageSize = 2

function fakeLibrary(event: H3Event) {
  const query = getQuery(event) as Record<string, string>
  api.libraryQueries.push(query)

  const matching = api.library.filter(
    coffee =>
      (query.favourites !== 'true' || isFavourite(coffee)) &&
      (!query.roasterId || coffee.roasterId === query.roasterId) &&
      (!query.flavorNoteId ||
        coffee.flavorNotes.some(note => note.id === query.flavorNoteId)) &&
      (!query.originCode ||
        coffee.origins.some(origin => origin.code === query.originCode)),
  )
  const start = Number(query.page ?? 0) * libraryPageSize

  return {
    total: matching.length,
    coffees: matching.slice(start, start + libraryPageSize),
  }
}

function fakeCatalog(event: H3Event) {
  const query = getQuery(event) as Record<string, string>
  api.catalogQueries.push(query)

  const key = nameKey(query.search ?? '')
  const matching = api.catalog.filter(
    coffee =>
      (!key ||
        nameKey(coffee.name).includes(key) ||
        coffee.flavorNotes.some(note => nameKey(note.name).includes(key))) &&
      (query.mine !== 'true' || coffee.onShelf) &&
      (!query.roasterId || coffee.roasterId === query.roasterId) &&
      (!query.flavorNoteId ||
        coffee.flavorNotes.some(note => note.id === query.flavorNoteId)) &&
      (!query.roastedFor || coffee.roastedFor === query.roastedFor),
  )
  const start = Number(query.page ?? 0) * catalogPageSize

  return {
    total: matching.length,
    coffees: matching.slice(start, start + catalogPageSize),
  }
}

function fakeFilter(
  options: Record<string, LibraryOption[]>,
  calls: () => Record<string, string>[],
  kind: string,
) {
  return (event: H3Event) => {
    const query = getQuery(event) as Record<string, string>
    calls().push({ kind, ...query })

    const key = nameKey(query.search ?? '')
    const matching = options[kind]!.filter(option =>
      nameKey(option.label).includes(key),
    )
    const start = Number(query.page ?? 0) * fakeFilterPageSize

    return {
      options: matching.slice(start, start + fakeFilterPageSize),
      hasMore: matching.length > start + fakeFilterPageSize,
    }
  }
}

export const api = {
  stock: [] as unknown[],
  library: [] as LibraryCoffee[],
  libraryQueries: [] as Record<string, string>[],
  libraryFilterQueries: [] as Record<string, string>[],
  catalog: [] as CatalogCoffee[],
  catalogQueries: [] as Record<string, string>[],
  catalogFilterQueries: [] as Record<string, string>[],
  added: [] as unknown[],
  edits: [] as unknown[],
  shelves: [] as string[],
  photos: [] as string[],
  photoFails: false,
  purchaseCalls: [] as unknown[],
  purchaseFails: false,
  verdicts: [] as unknown[],
  verdictFails: false,
  grinders: [opus()] as OwnedGrinder[],
  grinderCalls: [] as unknown[],
  grinderFails: false,
  brewMethods: brewMethods() as ListedBrewMethod[],
  brewMethodCalls: [] as unknown[],
  grindSettingCalls: [] as unknown[],
  grindSettingFails: false,
  roasterCalls: [] as unknown[],
  roasterFails: false,
  coffee: ayele() as Record<string, unknown>,
  coffeeShelves: coffeeShelves() as CoffeeShelf[],
}

function roaster() {
  return api.coffee.roasterDetails as ShelfRoaster
}

function setRoaster(changed: ShelfRoaster) {
  api.coffee = { ...api.coffee, roaster: changed.name, roasterDetails: changed }
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
  api.library = []
  api.libraryQueries = []
  api.libraryFilterQueries = []
  api.catalog = []
  api.catalogQueries = []
  api.catalogFilterQueries = []
  api.added = []
  api.edits = []
  api.shelves = []
  api.photos = []
  api.photoFails = false
  api.purchaseCalls = []
  api.purchaseFails = false
  api.verdicts = []
  api.verdictFails = false
  api.grinders = [opus()]
  api.grinderCalls = []
  api.grinderFails = false
  api.brewMethods = brewMethods()
  api.brewMethodCalls = []
  api.grindSettingCalls = []
  api.grindSettingFails = false
  api.roasterCalls = []
  api.roasterFails = false
  api.coffee = ayele()
  api.coffeeShelves = coffeeShelves()
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

  registerEndpoint('/api/shelves/home/library', fakeLibrary)

  for (const kind of libraryFilters) {
    registerEndpoint(
      `/api/shelves/home/library/${kind}`,
      fakeFilter(libraryOptions, () => api.libraryFilterQueries, kind),
    )
  }

  registerEndpoint('/api/shelves/home/catalog', fakeCatalog)

  for (const kind of catalogFilters) {
    registerEndpoint(
      `/api/shelves/home/catalog/${kind}`,
      fakeFilter(catalogOptions, () => api.catalogFilterQueries, kind),
    )
  }

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

  registerEndpoint('/api/coffees/c1', () => {
    const { purchases, memberVerdicts, ...shared } = api.coffee

    return { ...shared, shelves: api.coffeeShelves }
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

  registerEndpoint('/api/coffees/c1/verdict', {
    method: 'PATCH',
    handler: async event => {
      const body = await readBody(event)
      api.verdicts.push(body)

      if (api.verdictFails) {
        throw createError({
          statusCode: 500,
          statusMessage: 'The verdict could not be saved',
        })
      }

      api.coffee = { ...api.coffee, ...body }

      return {
        rating: api.coffee.rating,
        wouldBuyAgain: api.coffee.wouldBuyAgain,
      }
    },
  })

  registerEndpoint('/api/shelves/home/coffees/c1/grind-settings', {
    method: 'PUT',
    handler: async event => {
      const body = await readBody(event)
      api.grindSettingCalls.push(body)

      if (api.grindSettingFails) {
        throw createError({
          statusCode: 404,
          statusMessage: 'This shelf does not own that grinder',
        })
      }

      const grinder = api.grinders.find(owned => owned.id === body.grinderId)!
      const method = api.brewMethods.find(
        listed => listed.id === body.brewMethodId,
      )!
      const others = (api.coffee.grindSettings as OwnGrindSetting[]).filter(
        saved =>
          saved.grinderId !== body.grinderId ||
          saved.brewMethodId !== body.brewMethodId,
      )
      const saved = body.setting
        ? [
            {
              grinderId: grinder.id,
              brand: grinder.brand,
              model: grinder.model,
              brewMethodId: method.id,
              brewMethod: method.name,
              setting: body.setting,
            },
          ]
        : []
      api.coffee = { ...api.coffee, grindSettings: [...others, ...saved] }

      return body
    },
  })

  registerEndpoint('/api/roasters/r2', {
    method: 'PATCH',
    handler: async event => {
      const body = await readBody(event)
      api.roasterCalls.push({ edit: body })

      if (body.name === 'La Cabra') {
        const message = 'There is already a roaster called La Cabra'

        throw createError({
          statusCode: 409,
          statusMessage: message,
          data: { errors: { name: message } },
        })
      }

      if (api.roasterFails) {
        throw createError({
          statusCode: 403,
          statusMessage:
            'Only the person who added this roaster or an admin can edit it',
        })
      }

      const edited = { ...roaster(), ...body }
      setRoaster(edited)

      return edited
    },
  })

  registerEndpoint('/api/roasters/r2/logo', {
    method: 'PUT',
    handler: () => {
      api.roasterCalls.push('logo uploaded')

      if (api.roasterFails) {
        throw createError({
          statusCode: 413,
          statusMessage: 'That photo is too large',
        })
      }

      const logoUrl = '/api/photos/roasters/new.webp'
      setRoaster({ ...roaster(), logoUrl })

      return { logoUrl }
    },
  })

  registerEndpoint('/api/roasters/r2/logo', {
    method: 'DELETE',
    handler: () => {
      api.roasterCalls.push('logo removed')
      setRoaster({ ...roaster(), logoUrl: null })

      return { logoUrl: null }
    },
  })

  registerEndpoint('/api/shelves/home/grinders', {
    method: 'GET',
    handler: () => api.grinders,
  })

  registerEndpoint('/api/shelves/home/grinders', {
    method: 'POST',
    handler: async event => {
      const body = await readBody(event)
      api.grinderCalls.push({ own: body })

      if (api.grinderFails) {
        throw createError({
          statusCode: 500,
          statusMessage: 'The grinder could not be added',
        })
      }

      const owned = { id: `g${api.grinders.length + 1}`, ...body }
      api.grinders = [...api.grinders, owned]

      return owned
    },
  })

  registerEndpoint('/api/shelves/home/grinders/opus', {
    method: 'DELETE',
    handler: () => {
      api.grinderCalls.push({ disown: 'opus' })

      if (api.grinderFails) {
        throw createError({
          statusCode: 404,
          statusMessage: 'This shelf does not own that grinder',
        })
      }

      api.grinders = api.grinders.filter(owned => owned.id !== 'opus')

      return { id: 'opus' }
    },
  })

  registerEndpoint(
    '/api/grinder-brands',
    fakeList(() => [
      { id: 'b1', name: 'Fellow' },
      { id: 'b2', name: 'Niche' },
    ]),
  )

  registerEndpoint('/api/grinders', event => {
    const models: Record<string, ListEntry[]> = {
      fellow: [
        { id: 'opus', name: 'Opus Gen 2' },
        { id: 'ode', name: 'Ode Gen 2' },
      ],
    }

    return fakeList(
      () => models[nameKey(String(getQuery(event).brand ?? ''))] ?? [],
    )(event)
  })

  registerEndpoint('/api/brew-methods', {
    method: 'GET',
    handler: () => api.brewMethods,
  })

  registerEndpoint('/api/brew-methods', {
    method: 'POST',
    handler: async event => {
      const body = await readBody(event)
      api.brewMethodCalls.push(body)

      if (body.name === 'Espresso') {
        throw createError({
          statusCode: 409,
          statusMessage: 'Espresso is already a brew method',
          data: { errors: { name: 'Espresso is already a brew method' } },
        })
      }

      const added = { id: nameKey(body.name), name: body.name }
      api.brewMethods = [...api.brewMethods, added]

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
