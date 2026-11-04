import type { ListEntry, OriginListEntry } from '#shared/types/catalog'
import type { Review } from '~/types/coffees'
import type { OtherGrindSetting, OwnGrindSetting } from '~/types/grinders'
import type { ShelfPurchase } from '~/types/purchases'
import { squareMile } from './roasters'
import type { CatalogCoffee } from '~/types/catalog'
import type { LibraryCoffee } from '~/types/library'

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

export function manyCoffees(count: number) {
  return Array.from({ length: count }, (_, index) =>
    libraryCoffee({ id: `m${index + 1}`, name: `Coffee ${index + 1}` }),
  )
}
