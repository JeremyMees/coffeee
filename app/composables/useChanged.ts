import { useQueryClient } from '@tanstack/vue-query'

export type Change =
  | { type: 'coffee'; coffeeId: string }
  | { type: 'roaster'; roasterId: string }
  | { type: 'catalogEntry' }
  | { type: 'purchase'; shelfId: string; coffeeId: string }
  | { type: 'verdict'; coffeeId: string }
  | { type: 'grindSetting'; coffeeId: string }
  | { type: 'grinder'; shelfId: string }
  | { type: 'members'; shelfId: string }
  | { type: 'shelfInvites'; shelfId: string }
  | { type: 'invites' }
  | { type: 'myInvites' }

type StaleRule<Kind extends Change['type']> = (
  change: Extract<Change, { type: Kind }>,
) => QueryMatch[]

function onEveryShelf(...rest: unknown[]) {
  return keyLike('shelves', anyPart, ...rest)
}

const coffeeLists = () => [
  onEveryShelf('stock'),
  onEveryShelf('library'),
  onEveryShelf('catalog'),
  onEveryShelf('roasters'),
]

const descriptions = () => [
  keyLike(...queryKeys.lists()),
  keyLike(...queryKeys.admin()),
  keyLike(...queryKeys.profileStats()),
]

function coffeeCore(coffeeId: string) {
  return [
    keyLike(...queryKeys.coffee(coffeeId), keyEnd),
    onEveryShelf('coffees', coffeeId, keyEnd),
  ]
}

function roastedBy(roasterId: string): QueryMatch {
  const core = [
    keyLike('coffees', anyPart, keyEnd),
    onEveryShelf('coffees', anyPart, keyEnd),
  ]
  const roasterOfCoffee = keyLike('coffees', anyPart, 'roaster', keyEnd)

  return query => {
    const data = query.state.data as
      { id?: string; roasterId?: string } | undefined

    if (roasterOfCoffee(query)) return data?.id === roasterId

    return core.some(matches => matches(query)) && data?.roasterId === roasterId
  }
}

const staleAfter: { [Kind in Change['type']]: StaleRule<Kind> } = {
  coffee: ({ coffeeId }) => [
    ...coffeeLists(),
    onEveryShelf('coffees', coffeeId, keyEnd),
    keyLike(...queryKeys.coffee(coffeeId)),
    ...descriptions(),
  ],
  roaster: ({ roasterId }) => [
    ...coffeeLists(),
    onEveryShelf('filter-labels'),
    keyLike(...queryKeys.roaster(roasterId)),
    roastedBy(roasterId),
    ...descriptions(),
  ],
  catalogEntry: () => [
    keyLike(...queryKeys.shelves()),
    keyLike(...queryKeys.coffees()),
    keyLike(...queryKeys.roasters()),
    keyLike(...queryKeys.brewMethods()),
    ...descriptions(),
  ],
  purchase: ({ shelfId, coffeeId }) => [
    keyLike(...queryKeys.stock(shelfId)),
    keyLike(...queryKeys.shelf(shelfId), 'library'),
    keyLike(...queryKeys.shelf(shelfId), 'catalog'),
    keyLike(...queryKeys.shelf(shelfId), 'roasters'),
    keyLike(...queryKeys.shelfCoffeePurchases(shelfId, coffeeId)),
    keyLike(...queryKeys.coffeeShelves(coffeeId)),
    ...coffeeCore(coffeeId),
    keyLike(...queryKeys.profileStats()),
  ],
  verdict: ({ coffeeId }) => [
    keyLike(...queryKeys.coffeeVerdict(coffeeId)),
    keyLike(...queryKeys.coffeeReviews(coffeeId)),
    onEveryShelf('stock'),
    onEveryShelf('library'),
    keyLike(...queryKeys.profileStats()),
  ],
  grindSetting: ({ coffeeId }) => [
    onEveryShelf('coffees', coffeeId, 'grind-settings'),
  ],
  grinder: ({ shelfId }) => [
    keyLike(...queryKeys.shelfGrinders(shelfId)),
    keyLike(...queryKeys.shelf(shelfId), 'coffees', anyPart, 'grind-settings'),
    keyLike(...queryKeys.lists()),
    keyLike(...queryKeys.admin()),
  ],
  members: ({ shelfId }) => [
    keyLike(...queryKeys.shelfMembers(shelfId)),
    keyLike(...queryKeys.ownedShelves()),
  ],
  shelfInvites: ({ shelfId }) => [keyLike(...queryKeys.shelfInvites(shelfId))],
  invites: () => [keyLike(...queryKeys.invites())],
  myInvites: () => [keyLike(...queryKeys.notifications())],
}

export function useChanged() {
  const queryClient = useQueryClient()

  return async (change: Change) => {
    const rule = staleAfter[change.type] as StaleRule<Change['type']>
    const stale = rule(change)

    await queryClient.invalidateQueries({
      predicate: query => stale.some(matches => matches(query)),
    })
  }
}
