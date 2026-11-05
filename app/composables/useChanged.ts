import type { QueryKey } from '@tanstack/vue-query'
import { useQueryClient } from '@tanstack/vue-query'

export type Change =
  | { type: 'coffee' }
  | { type: 'roaster' }
  | { type: 'catalogEntry' }
  | { type: 'purchase'; shelfId: string }
  | { type: 'verdict' }
  | { type: 'grindSetting' }
  | { type: 'grinder'; shelfId: string }
  | { type: 'members'; shelfId: string }
  | { type: 'shelfInvites'; shelfId: string }
  | { type: 'invites' }
  | { type: 'myInvites' }

type StaleRule<Kind extends Change['type']> = (
  change: Extract<Change, { type: Kind }>,
) => QueryKey[]

const catalog = () => [
  queryKeys.shelves(),
  queryKeys.coffees(),
  queryKeys.roasters(),
  queryKeys.lists(),
  queryKeys.admin(),
  queryKeys.profileStats(),
]

const staleAfter: { [Kind in Change['type']]: StaleRule<Kind> } = {
  coffee: catalog,
  roaster: catalog,
  catalogEntry: () => [...catalog(), queryKeys.brewMethods()],
  purchase: ({ shelfId }) => [
    queryKeys.shelf(shelfId),
    queryKeys.coffees(),
    queryKeys.profileStats(),
  ],
  verdict: () => [
    queryKeys.shelves(),
    queryKeys.coffees(),
    queryKeys.profileStats(),
  ],
  grindSetting: () => [queryKeys.shelves(), queryKeys.coffees()],
  grinder: ({ shelfId }) => [queryKeys.shelf(shelfId), queryKeys.lists()],
  members: ({ shelfId }) => [
    queryKeys.shelfMembers(shelfId),
    queryKeys.ownedShelves(),
  ],
  shelfInvites: ({ shelfId }) => [queryKeys.shelfInvites(shelfId)],
  invites: () => [queryKeys.invites()],
  myInvites: () => [queryKeys.notifications()],
}

export function useChanged() {
  const queryClient = useQueryClient()

  return async (change: Change) => {
    const rule = staleAfter[change.type] as StaleRule<Change['type']>

    await Promise.all(
      rule(change).map(queryKey => queryClient.invalidateQueries({ queryKey })),
    )
  }
}
