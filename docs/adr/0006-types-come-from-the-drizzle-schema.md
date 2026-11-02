# Types come from the Drizzle schema

Hand-written object types drifted from the database: every new column meant
updating the same shape in components, queries and tests. So types are derived
instead of written out. Entity types come from the Drizzle tables with
`InferSelectModel`, and the shapes the app receives come from the API routes
through `InternalApi`. Those routes return what Drizzle selects, so a schema
change reaches the app's types without anyone copying it.

## Consequences

- `shared/types/` holds types inferred from Drizzle tables that both sides use,
  such as `Coffee`, `ListEntry` and `OriginEntry`. Nuxt auto-imports them in the
  app and on the server. They import tables with `import type`, so no server
  code reaches the browser.
- `app/types/` holds what the app gets from the API, such as `ShelfCoffee` and
  `StockCoffee` (`InternalApi['/api/…']['get']`), plus app-only types like form
  configs. `imports.dirs` in `nuxt.config.ts` auto-imports them, so the app uses
  them without an import.
- `server/types/` holds server-only types, such as `SharedList`, `CoffeeList`
  and `Viewer`. Import them from `#server/types/…`.
- Every named type lives in one of these folders, never in a util, component or
  test file. Each folder has one file per topic, such as `coffee.ts`,
  `origins.ts` or `health.ts`. Types that tests share go in
  `test/support/types.ts` and `test/e2e/support/types.ts`.
- Narrow a derived type with `Pick` or `Omit` rather than writing a new object
  type, for example
  `EditableCoffee = Omit<ShelfCoffee, 'canEdit' | 'purchases'>`.
- Form input types still come from the zod schemas (`CoffeeDetails`, `NewCoffee`
  in `shared/types/coffee.ts`), because they describe what a person submits, not
  what is stored.
