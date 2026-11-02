import type { QueryKey } from '@tanstack/vue-query'

export const queryKeys = {
  shelf: (shelfId: string) => ['shelves', shelfId],
  stock: (shelfId: string) => ['shelves', shelfId, 'stock'],
  shelfCoffee: (shelfId: string, coffeeId: string) => [
    'shelves',
    shelfId,
    'coffees',
    coffeeId,
  ],
  invites: () => ['invites'],
  lists: () => ['lists'],
  listSearch: (
    endpoint: string,
    search: string,
    params: Record<string, string> = {},
  ) => ['lists', endpoint, search, params],
} satisfies Record<string, (...args: never[]) => QueryKey>
