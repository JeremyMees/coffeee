import { registerEndpoint } from '@nuxt/test-utils/runtime'
import { createError, getQuery, readBody } from 'h3'
import type { H3Event } from 'h3'
import type { ListEntry, OriginListEntry } from '#shared/types/catalog'
import type { ProfileStats } from '#shared/types/stats'
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
    communityRating: { average: null, raters: 0, wouldBuyAgain: 0 } as {
      average: number | null
      raters: number
      wouldBuyAgain: number
    },
    reviews: [] as Review[],
    canEdit: true,
    canDelete: false,
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
    photoUrl: null,
    roastedOn: '2026-10-28',
    onShelf: true,
    flavorNotes: [{ id: 'n1', name: 'Lime' }],
    origins: [{ code: 'ET', name: 'Ethiopia' }],
    matches: [],
    communityRating: { average: null, raters: 0 },
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

export function listedRoaster(
  overrides: Partial<ListedRoaster> = {},
): ListedRoaster {
  return {
    id: 'r2',
    name: 'Square Mile',
    website: 'https://www.squaremilecoffee.com',
    countryCode: 'GB',
    city: 'London',
    logoUrl: null,
    shelfCoffees: 2,
    lastBought: '2026-11-01',
    ...overrides,
  }
}

export function listedRoasters() {
  return [
    listedRoaster({
      id: 'r1',
      name: 'La Cabra',
      countryCode: 'DK',
      city: 'Aarhus',
      logoUrl: '/api/photos/roasters/la-cabra.webp',
      shelfCoffees: 0,
      lastBought: null,
    }),
    listedRoaster(),
  ]
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
  const sorted =
    query.sort === 'communityRating'
      ? matching.toSorted(
          (a, b) =>
            (b.communityRating.average ?? -1) -
            (a.communityRating.average ?? -1),
        )
      : matching
  const start = Number(query.page ?? 0) * catalogPageSize

  return {
    total: sorted.length,
    coffees: sorted.slice(start, start + catalogPageSize),
  }
}

const labelledOptions: Record<string, LibraryOption[]> = {
  roasterId: catalogOptions.roasters,
  flavorNoteId: catalogOptions['flavor-notes'],
  originCode: catalogOptions.origins,
  processId: catalogOptions.processes,
}

function fakeFilterLabels(event: H3Event) {
  const query = getQuery(event) as Record<string, string>
  api.filterLabelQueries.push(query)

  return Object.fromEntries(
    Object.entries(query).flatMap(([param, value]) => {
      const option = labelledOptions[param]?.find(
        option => option.value === value,
      )

      return option ? [[param, option.label]] : []
    }),
  )
}

function fakeRoasters(event: H3Event) {
  const query = getQuery(event) as Record<string, string>
  api.roasterQueries.push(query)

  const matching = api.roasters.filter(
    roaster => query.boughtFrom !== 'true' || roaster.shelfCoffees > 0,
  )

  return { total: matching.length, roasters: matching }
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

export function flavorNoteEntries(): AdminEntry[] {
  return [
    { id: 'n1', name: 'Lime', detail: null, detailId: null, uses: 3 },
    { id: 'n2', name: 'Limes', detail: null, detailId: null, uses: 1 },
    { id: 'n3', name: 'Jasmine', detail: null, detailId: null, uses: 0 },
  ]
}

export function ownedShelves() {
  return [
    { id: 'solo', name: "Sarah's shelf", members: [] as ListEntry[] },
    {
      id: 'home',
      name: 'Home',
      members: [
        { id: 'tom', name: 'Tom' },
        { id: 'lisa', name: 'Lisa' },
      ],
    },
  ]
}

export function profileStats(): ProfileStats {
  return {
    bags: 12,
    grams: 3000,
    spentCents: 19800,
    rated: 9,
    averageRating: 4.2,
    wouldBuyAgain: 5,
    topRoaster: 'Square Mile',
  }
}

export function shelfInvites() {
  return [
    {
      id: 'i1',
      email: 'anna@example.com',
      invitedBy: 'Sarah',
      createdAt: '2026-11-01T10:00:00.000Z',
      expiresAt: '2026-11-08T10:00:00.000Z',
    },
  ]
}

export function shelfMembers() {
  return [
    {
      id: 'user-1',
      name: 'Sarah',
      email: 'sarah@example.com',
      image: null as string | null,
      joinedAt: '2026-10-01T10:00:00.000Z',
    },
    {
      id: 'tom',
      name: 'Tom',
      email: 'tom@example.com',
      image: null as string | null,
      joinedAt: '2026-10-02T10:00:00.000Z',
    },
  ]
}

export function notifications() {
  return [
    {
      id: 'n1',
      kind: 'coffeeAdded' as NotificationKind,
      actor: 'Tom' as string | null,
      shelfId: 'home',
      shelf: "Sarah's shelf",
      coffeeId: 'c1' as string | null,
      coffee: 'Ayele Fulasa' as string | null,
      inviteId: null as string | null,
      inviteStatus: null as InviteStatus | null,
      createdAt: '2026-11-02T10:00:00.000Z',
      readAt: null as string | null,
    },
    {
      id: 'n2',
      kind: 'memberJoined' as NotificationKind,
      actor: 'Tom' as string | null,
      shelfId: 'home',
      shelf: "Sarah's shelf",
      coffeeId: null as string | null,
      coffee: null as string | null,
      inviteId: null as string | null,
      inviteStatus: null as InviteStatus | null,
      createdAt: '2026-11-01T10:00:00.000Z',
      readAt: '2026-11-01T12:00:00.000Z' as string | null,
    },
  ]
}

export function inviteNotification(
  overrides: Partial<ReturnType<typeof notifications>[number]> = {},
) {
  return {
    ...notifications()[0]!,
    id: 'n3',
    kind: 'invited' as NotificationKind,
    shelfId: 'office',
    shelf: 'Office',
    coffeeId: null,
    coffee: null,
    inviteId: 'mi1',
    inviteStatus: 'pending' as InviteStatus | null,
    ...overrides,
  }
}

export const api = {
  ownedShelves: ownedShelves(),
  profileStats: profileStats(),
  profileRenames: [] as unknown[],
  notifications: [] as ReturnType<typeof notifications>,
  notificationCalls: [] as unknown[],
  shelfMembers: shelfMembers(),
  shelfCalls: [] as unknown[],
  shelfFails: '',
  shelfInvites: shelfInvites(),
  inviteCalls: [] as unknown[],
  inviteFails: '',
  accountDeletes: [] as unknown[],
  accountDeleteFails: '',
  stock: [] as unknown[],
  library: [] as LibraryCoffee[],
  libraryQueries: [] as Record<string, string>[],
  libraryFilterQueries: [] as Record<string, string>[],
  catalog: [] as CatalogCoffee[],
  catalogQueries: [] as Record<string, string>[],
  catalogFilterQueries: [] as Record<string, string>[],
  filterLabelQueries: [] as Record<string, string>[],
  roasters: [] as ListedRoaster[],
  roasterQueries: [] as Record<string, string>[],
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
  grindSettingCalls: [] as unknown[],
  grindSettingFails: false,
  roasterCalls: [] as unknown[],
  roasterFails: false,
  coffee: ayele() as Record<string, unknown>,
  coffeeShelves: coffeeShelves() as CoffeeShelf[],
  coffeeDeletes: [] as string[],
  coffeeDeleteFails: false,
  adminEntries: flavorNoteEntries(),
  adminQueries: [] as Record<string, string>[],
  adminCalls: [] as unknown[],
  adminFails: '',
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
  api.ownedShelves = ownedShelves()
  api.profileStats = profileStats()
  api.profileRenames = []
  api.notifications = []
  api.notificationCalls = []
  api.shelfMembers = shelfMembers()
  api.shelfCalls = []
  api.shelfFails = ''
  api.shelfInvites = shelfInvites()
  api.inviteCalls = []
  api.inviteFails = ''
  api.accountDeletes = []
  api.accountDeleteFails = ''
  api.stock = []
  api.library = []
  api.libraryQueries = []
  api.libraryFilterQueries = []
  api.catalog = []
  api.catalogQueries = []
  api.catalogFilterQueries = []
  api.filterLabelQueries = []
  api.roasters = []
  api.roasterQueries = []
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
  api.grindSettingCalls = []
  api.grindSettingFails = false
  api.roasterCalls = []
  api.roasterFails = false
  api.coffee = ayele()
  api.coffeeShelves = coffeeShelves()
  api.coffeeDeletes = []
  api.coffeeDeleteFails = false
  api.adminEntries = flavorNoteEntries()
  api.adminQueries = []
  api.adminCalls = []
  api.adminFails = ''
}

function failAdmin() {
  if (api.adminFails) {
    throw createError({ statusCode: 409, statusMessage: api.adminFails })
  }
}

function fakeAdminEntries(event: H3Event) {
  const query = getQuery(event) as Record<string, string>
  api.adminQueries.push(query)
  const key = nameKey(query.search ?? '')
  const found = api.adminEntries.filter(
    entry => entry.id !== query.except && nameKey(entry.name).includes(key),
  )

  return { total: found.length, entries: found }
}

const otherAdminEntries: Record<string, AdminEntry[]> = {
  coffees: [
    {
      id: 'c1',
      name: 'Ayele Fulasa',
      detail: 'Square Mile',
      detailId: 'r2',
      uses: 2,
    },
  ],
  roasters: [
    { id: 'r2', name: 'Square Mile', detail: null, detailId: null, uses: 1 },
  ],
}

function registerAdminEndpoints() {
  registerEndpoint('/api/roasters/new-3/logo', {
    method: 'PUT',
    handler: () => {
      api.adminCalls.push({ logo: 'new-3' })

      if (api.roasterFails) {
        throw createError({
          statusCode: 413,
          statusMessage: 'That photo is too large',
        })
      }

      return { logoUrl: '/api/photos/roasters/new.webp' }
    },
  })

  const path = '/api/admin/lists/flavorNotes'

  registerEndpoint(path, { method: 'GET', handler: fakeAdminEntries })

  for (const list of [
    'flavorNotes',
    'coffees',
    'roasters',
    'regions',
    'grinders',
  ]) {
    if (list !== 'flavorNotes') {
      registerEndpoint(`/api/admin/lists/${list}`, {
        method: 'GET',
        handler: () => {
          const entries = otherAdminEntries[list] ?? []

          return { total: entries.length, entries }
        },
      })
    }

    registerEndpoint(`/api/admin/lists/${list}`, {
      method: 'POST',
      handler: async event => {
        const body = await readBody(event)
        api.adminCalls.push({ add: list, body })
        failAdmin()
        const field = 'model' in body ? 'model' : 'name'

        if (body[field] === 'Taken') {
          throw createError({
            statusCode: 409,
            statusMessage: 'Taken is already on the list',
            data: { errors: { [field]: 'Taken is already on the list' } },
          })
        }

        const added = {
          id: `new-${api.adminEntries.length}`,
          name: body[field],
          detail: null,
          detailId: null,
          uses: 0,
        }

        if (list === 'flavorNotes') {
          api.adminEntries = [...api.adminEntries, added]
        }

        return { id: added.id, name: added.name }
      },
    })
  }

  for (const id of ['n1', 'n2', 'n3']) {
    registerEndpoint(`${path}/${id}`, {
      method: 'PATCH',
      handler: async event => {
        const body = await readBody(event)
        const { name } = body
        api.adminCalls.push({ update: id, body })
        failAdmin()
        api.adminEntries = api.adminEntries.map(entry =>
          entry.id === id ? { ...entry, name } : entry,
        )

        return { id, name }
      },
    })

    registerEndpoint(`${path}/${id}/merge`, {
      method: 'POST',
      handler: async event => {
        const { intoId } = await readBody(event)
        api.adminCalls.push({ merge: id, intoId })
        failAdmin()
        const from = api.adminEntries.find(entry => entry.id === id)!
        api.adminEntries = api.adminEntries
          .filter(entry => entry.id !== id)
          .map(entry =>
            entry.id === intoId
              ? { ...entry, uses: entry.uses + from.uses }
              : entry,
          )

        return api.adminEntries.find(entry => entry.id === intoId)
      },
    })

    registerEndpoint(`${path}/${id}`, {
      method: 'DELETE',
      handler: () => {
        api.adminCalls.push({ delete: id })
        failAdmin()
        api.adminEntries = api.adminEntries.filter(entry => entry.id !== id)

        return null
      },
    })
  }
}

function failInvite() {
  if (api.inviteFails) {
    throw createError({ statusCode: 409, statusMessage: api.inviteFails })
  }
}

function registerInviteEndpoints() {
  registerEndpoint('/api/shelves/home/invites', {
    method: 'GET',
    handler: () => api.shelfInvites,
  })

  registerEndpoint('/api/shelves/home/invites', {
    method: 'POST',
    handler: async event => {
      const body = await readBody(event)
      api.inviteCalls.push({ invite: body })
      failInvite()

      const created = {
        id: `i${api.shelfInvites.length + 1}`,
        email: body.email,
        invitedBy: 'Sarah',
        createdAt: '2026-11-03T10:00:00.000Z',
        expiresAt: '2026-11-10T10:00:00.000Z',
      }
      api.shelfInvites = [created, ...api.shelfInvites]

      return created
    },
  })

  registerEndpoint('/api/shelves/home/invites/i1', {
    method: 'DELETE',
    handler: () => {
      api.inviteCalls.push({ cancel: 'i1' })
      api.shelfInvites = api.shelfInvites.filter(found => found.id !== 'i1')

      return null
    },
  })

  registerEndpoint('/api/me/invites/mi1/accept', {
    method: 'POST',
    handler: () => {
      api.inviteCalls.push({ accept: 'mi1' })
      failInvite()
      api.notifications = api.notifications.map(found =>
        found.inviteId === 'mi1'
          ? { ...found, inviteStatus: 'accepted' as InviteStatus }
          : found,
      )

      return { id: 'office', name: 'Office', ownerId: 'tom' }
    },
  })

  registerEndpoint('/api/me/invites/mi1/decline', {
    method: 'POST',
    handler: () => {
      api.inviteCalls.push({ decline: 'mi1' })
      failInvite()
      api.notifications = api.notifications.filter(
        found => found.inviteId !== 'mi1',
      )

      return null
    },
  })
}

function failShelf() {
  if (api.shelfFails) {
    throw createError({ statusCode: 409, statusMessage: api.shelfFails })
  }
}

function registerShelfEndpoints() {
  registerEndpoint('/api/shelves/home/members', () => api.shelfMembers)

  registerEndpoint('/api/shelves/home', {
    method: 'PATCH',
    handler: async event => {
      const body = await readBody(event)
      api.shelfCalls.push({ rename: body })
      failShelf()

      return { id: 'home', name: body.name, ownerId: 'user-1' }
    },
  })

  registerEndpoint('/api/shelves/home', {
    method: 'DELETE',
    handler: () => {
      api.shelfCalls.push({ delete: 'home' })
      failShelf()

      return null
    },
  })

  registerEndpoint('/api/shelves/home/members/tom', {
    method: 'DELETE',
    handler: () => {
      api.shelfCalls.push({ remove: 'tom' })
      failShelf()
      api.shelfMembers = api.shelfMembers.filter(found => found.id !== 'tom')

      return null
    },
  })

  registerEndpoint('/api/shelves/home/owner', {
    method: 'PUT',
    handler: async event => {
      const body = await readBody(event)
      api.shelfCalls.push({ handOver: body })
      failShelf()

      return { id: 'home', name: "Sarah's shelf", ownerId: body.ownerId }
    },
  })

  registerEndpoint('/api/shelves/home/leave', {
    method: 'POST',
    handler: () => {
      api.shelfCalls.push({ leave: 'home' })
      failShelf()

      return null
    },
  })
}

function registerNotificationEndpoints() {
  registerEndpoint('/api/me/notifications', () => api.notifications)

  registerEndpoint('/api/me/notifications/unread', () => ({
    unread: api.notifications.filter(found => !found.readAt).length,
  }))

  registerEndpoint('/api/me/notifications/read', {
    method: 'POST',
    handler: () => {
      api.notificationCalls.push('read')
      api.notifications = api.notifications.map(found => ({
        ...found,
        readAt: found.readAt ?? '2026-11-03T10:00:00.000Z',
      }))

      return null
    },
  })
}

export function fakeApi() {
  registerAdminEndpoints()
  registerNotificationEndpoints()
  registerInviteEndpoints()
  registerShelfEndpoints()

  registerEndpoint('/api/me/owned-shelves', () => api.ownedShelves)
  registerEndpoint('/api/me/stats', () => api.profileStats)

  registerEndpoint('/api/me', {
    method: 'PATCH',
    handler: async event => {
      const body = await readBody(event)
      api.profileRenames.push(body)

      return { name: body.name }
    },
  })

  registerEndpoint('/api/me', {
    method: 'DELETE',
    handler: async event => {
      api.accountDeletes.push(await readBody(event))

      if (api.accountDeleteFails) {
        throw createError({
          statusCode: 409,
          statusMessage: api.accountDeleteFails,
        })
      }

      return null
    },
  })

  registerEndpoint('/api/coffees/c1', {
    method: 'DELETE',
    handler: () => {
      api.coffeeDeletes.push('c1')

      if (api.coffeeDeleteFails) {
        throw createError({
          statusCode: 409,
          statusMessage:
            'Someone else has bought this coffee too, so only an admin can delete it',
        })
      }

      return null
    },
  })

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
  registerEndpoint('/api/shelves/home/filter-labels', fakeFilterLabels)
  registerEndpoint('/api/shelves/home/roasters', fakeRoasters)

  registerEndpoint('/api/roasters/r2', {
    method: 'GET',
    handler: () => roaster(),
  })

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

  registerEndpoint('/api/coffees/c1', {
    method: 'GET',
    handler: () => {
      const { purchases, ...shared } = api.coffee

      return { ...shared, shelves: api.coffeeShelves }
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
