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
  listSearch: (endpoint: string, search: string) => ['lists', endpoint, search],
} satisfies Record<string, (...args: never[]) => QueryKey>
