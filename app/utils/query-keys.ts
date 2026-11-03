import type { QueryKey } from '@tanstack/vue-query'

export const queryKeys = {
  shelves: () => ['shelves'],
  shelf: (shelfId: string) => ['shelves', shelfId],
  stock: (shelfId: string) => ['shelves', shelfId, 'stock'],
  library: (shelfId: string, query: Record<string, string>) => [
    'shelves',
    shelfId,
    'library',
    query,
  ],
  libraryPage: (
    shelfId: string,
    query: Record<string, string>,
    page: number,
  ) => ['shelves', shelfId, 'library', query, page],
  catalog: (shelfId: string, query: Record<string, string>) => [
    'shelves',
    shelfId,
    'catalog',
    query,
  ],
  filterOptions: (
    shelfId: string,
    area: FilterArea,
    kind: FilterKind,
    search: string,
  ) => ['shelves', shelfId, area, kind, search],
  shelfCoffee: (shelfId: string, coffeeId: string) => [
    'shelves',
    shelfId,
    'coffees',
    coffeeId,
  ],
  shelfGrinders: (shelfId: string) => ['shelves', shelfId, 'grinders'],
  brewMethods: () => ['brew-methods'],
  invites: () => ['invites'],
  lists: () => ['lists'],
  listSearch: (
    endpoint: string,
    search: string,
    params: Record<string, string> = {},
  ) => ['lists', endpoint, search, params],
} satisfies Record<string, (...args: never[]) => QueryKey>
