# Loading states, split fetching, and whether to adopt rstore

Date: 2026-11-07

Question: pages feel slow to open because they wait on data. Can we (1) show
each page at once with shadcn-vue `Skeleton`s where data is still loading, (2)
fetch in pieces so each section renders as soon as its own data arrives, and (3)
should we adopt [rstore](https://rstore.dev/) and replace `@tanstack/vue-query`?

How to read this: sections 1 to 3 are facts, each cited (repo-relative
`path:line` for code, a URL for anything external). Section 4 is my
recommendation and is labelled as opinion. Slowness causes in section 1.4 come
from reading code, not from profiling; they are hypotheses until measured.

## TL;DR

- **Nothing in the app shows a loading state today.** Every data page and many
  child components `await suspense()` at the top of `<script setup>` (20 call
  sites). Nuxt renders pages inside Vue `<Suspense>`, so a client-side
  navigation keeps the old page on screen until every awaited query on the new
  page resolves, and there is no `<NuxtLoadingIndicator>` to show anything is
  happening. No `Skeleton` component is installed.
- **Cached data does not make navigation instant either.** Vue Query's
  `suspense()` refetches and waits whenever the cached data is stale, and the
  app's `staleTime` is one minute. So revisiting a page after a minute blocks on
  the network again, even though the old data is in the cache.
- **The server endpoints are probably the bigger cost.** The shelf coffee
  endpoint runs up to 18 Drizzle queries one after another, after a session
  lookup and a shelf lookup, and Better Auth's session cookie cache is off, so
  every API request starts with a database round trip for the session.
- **Skeletons and per-section fetching need no new library.** Vue Query already
  gives each `useQuery` its own `isPending` state and runs separate queries in
  parallel; TanStack's Nuxt recipe prefetches with `onServerPrefetch`, which
  blocks only the server render, not client navigation. Nuxt's own `useFetch`
  has the same idea as `lazy` + `status`.
- **rstore: not now (opinion).** See section 3 and 4. Its strengths (normalized
  entity cache, offline, local-first) don't address the causes above, its
  Drizzle module exposes tables generically rather than through our
  shelf-checking API routes, and migrating would touch 58 query/mutation hooks,
  44 files that import them and 16 query test files.

## 1. How the app fetches data today

### 1.1 Setup

- Vue Query is installed as a Nuxt plugin, following the Nuxt 3 recipe in the
  TanStack docs: one `QueryClient` per request, `dehydrate` into `useState` on
  `app:rendered`, `hydrate` on `app:created` (`app/plugins/vue-query.ts:34-62`;
  recipe: <https://tanstack.com/query/v5/docs/framework/vue/guides/ssr>).
- Defaults: `staleTime` one minute, `gcTime` five minutes, two retries except
  for 4xx (`app/plugins/vue-query.ts:40-48`). Some queries override: filter
  labels `staleTime: Infinity` (`app/queries/filters.ts:53`), brew methods and
  lists 10 minutes (`app/queries/brew-methods.ts:9`, `app/queries/lists.ts:22`).
- Query hooks live in `app/queries/*.ts` (16 files, 921 lines). Counted by grep:
  18 `useQuery`, 4 `useInfiniteQuery`, 36 `useMutation`. 44 files import from
  `~/queries`. 16 test files under `test/nuxt/queries/`, plus
  `test/nuxt/plugins/vue-query.test.ts` and
  `test/nuxt/composables/useChanged.test.ts`.
- Each `queryFn` calls a Nitro route with `useRequestFetch()` (forwards cookies
  during SSR), e.g. `app/queries/coffees.ts:4-11`. Types reach the app from the
  route return types via `InternalApi`, per
  `docs/adr/0006-types-come-from-the-drizzle-schema.md`.
- Mutations invalidate by rule: `useChanged` maps a change type to a list of
  query-key prefixes and calls `invalidateQueries` for each
  (`app/composables/useChanged.ts:30-64`). Two mutations write the cache
  directly with `setQueryData` (`app/queries/notifications.ts:30`,
  `app/queries/notifications.ts:53`). No optimistic updates.
- `placeholderData: keepPreviousData` is set on the list/pagination queries so
  changing a filter keeps the old list visible (`app/queries/catalog.ts:23`,
  `app/queries/library.ts:33`, `app/queries/library.ts:54`,
  `app/queries/roasters.ts:28`, `app/queries/admin.ts:22`,
  `app/queries/lists.ts:21`, `app/queries/filters.ts:34`).
- `useFetch` is not used. `useAsyncData` is used once, on the public invite page
  (`app/pages/invite/[token].vue:12-19`).
- `<NuxtLoadingIndicator>` is not used anywhere (`app/app.vue:1-8`), and there
  is no `Skeleton` component in `app/components/ui/` and no `animate-pulse`
  class in any `.vue` file. `components.json` uses the `reka-nova` style
  (`components.json:3`).

### 1.2 Pages, what they fetch, and how

Every page below blocks on `await …suspense()` in `<script setup>`. "Blocks"
means the page is an async dependency of Nuxt's `<Suspense>` (see 2.1).

| Page                                                          | Query hook(s) → endpoint                                                                                                                        | How it waits                                                                                                                                                                                                                                      |
| ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `shelves/[shelfId]/index.vue` (Stock)                         | `useStock` → `GET /api/shelves/:id/stock`                                                                                                       | `await suspense()` (`app/pages/shelves/[shelfId]/index.vue:11-12`)                                                                                                                                                                                |
| `shelves/[shelfId]/coffees/[coffeeId].vue`                    | `useShelfCoffee` → `GET /api/shelves/:id/coffees/:coffeeId`; child `CoffeeGrindSettings` → `useShelfGrinders` + `useBrewMethods`                | page awaits (`…/coffees/[coffeeId].vue:23-24`), then `useCanonicalSlug` (`:30-34`); the child only mounts once `coffee` exists (`:62`) and then awaits its own two queries (`app/components/CoffeeGrindSettings.vue:18-20`): a two-step waterfall |
| `shelves/[shelfId]/library.vue`                               | `useFilterLabels` (only when the URL has filter ids) → then `useLibraryPages` or `useLibraryPage`                                               | `await address.start()` (`library.vue:15`, `app/composables/useBrowsingAddress.ts:11-15`) then `await page/grid.suspense()` (`library.vue:73`): sequential                                                                                        |
| `shelves/[shelfId]/discover.vue`                              | `useFilterLabels` → then `useCatalogPages` → `GET /api/shelves/:id/catalog`                                                                     | `await address.start()` (`discover.vue:12`) then `await catalog.suspense()` (`discover.vue:22`): sequential                                                                                                                                       |
| `shelves/[shelfId]/settings.vue`                              | none itself; tabs render `ShelfLeave`, `ShelfMembers` (both `useShelfMembers`), `ShelfInvites`, `ShelfGrinders` with `:unmount-on-hide="false"` | each child awaits (`ShelfLeave.vue:11-12`, `ShelfMembers.vue:12-13`, `ShelfInvites.vue:12-13`, `ShelfGrinders.vue:12-13`); siblings start together, the page waits for all of them, hidden tabs included (`settings.vue:13-35`)                   |
| `roasters/index.vue`                                          | `useRoasterPages` → `GET /api/shelves/:id/roasters`                                                                                             | `await listed.suspense()` (`roasters/index.vue:14`)                                                                                                                                                                                               |
| `roasters/[roasterId].vue`                                    | `useRoaster` → `GET /api/roasters/:id`, then `useCatalogPages`                                                                                  | `await suspense()` (`:26-27`), `await useCanonicalSlug` (`:33`), then `await catalog.suspense()` (`:41-45`): the catalog query is only created after the roaster resolves, a waterfall                                                            |
| `coffees/[coffeeId].vue`                                      | `useCoffee` → `GET /api/coffees/:id`                                                                                                            | `await suspense()` (`:16-17`)                                                                                                                                                                                                                     |
| `notifications.vue`                                           | `useNotifications`                                                                                                                              | `await suspense()` (`:6-7`)                                                                                                                                                                                                                       |
| `profile.vue`                                                 | none itself; `ProfileStats` (`useProfileStats`) and `ProfileNotificationEmails` in tabs kept mounted                                            | children await (`ProfileStats.vue:4-5`, `ProfileNotificationEmails.vue:16-17`; `profile.vue:14`)                                                                                                                                                  |
| `admin/invites.vue`                                           | `useInvites`                                                                                                                                    | `await suspense()` (`:9-10`)                                                                                                                                                                                                                      |
| `admin/lists/[list].vue`                                      | `useAdminEntries`                                                                                                                               | `await listed.suspense()` (`:43-47`)                                                                                                                                                                                                              |
| `invite/[token].vue`                                          | `useAsyncData` + `/api/me` in `Promise.all`                                                                                                     | awaited (`:12-19`)                                                                                                                                                                                                                                |
| `index.vue`, `admin/index.vue`, `shelves/new.vue`, auth pages | no page data                                                                                                                                    | n/a                                                                                                                                                                                                                                               |

Layout-level data: `NotificationsLink` uses `useUnreadNotifications` without
awaiting (`app/components/NotificationsLink.vue:7`), polling every minute
(`app/queries/notifications.ts:14-21`). This is already the non-blocking pattern
the rest of the app could use.

The app already splits by section in the sense that list endpoints and detail
endpoints are separate, but the big detail endpoints are aggregates: the shelf
coffee page gets details, descriptions, verdict, community rating, reviews,
roaster, purchases and grind settings in one response (see 1.4).

### 1.3 Route middleware

- `auth.global.ts` fetches `/api/me` only when `useCurrentUser()` is empty
  (`app/middleware/auth.global.ts:12-13`), i.e. once per full page load, not on
  every client navigation. `shelf.global.ts` reads from that state and does no
  I/O (`app/middleware/shelf.global.ts:1-31`). Middleware is not a likely cause
  of slow client navigation.

### 1.4 Likely causes of slowness (hypotheses from reading code)

1. **Every navigation blocks on the network.** All data pages await `suspense()`
   (table above). With Nuxt's page `<Suspense>`, the previous page stays visible
   until the new one resolves (2.1), and nothing tells the user a navigation is
   in progress (no `<NuxtLoadingIndicator>`, `app/app.vue:1-8`). This matches
   "pages feel slow to open".
2. **Stale cache still blocks.** In the installed Vue Query, `suspense()` calls
   `fetchOptimistic` and waits whenever `getOptimisticResult(...).isStale` is
   true, and resolves immediately only when the data is fresh
   (`node_modules/@tanstack/vue-query/build/modern/useBaseQuery.js:51-73`;
   documented at
   <https://tanstack.com/query/v5/docs/framework/vue/guides/suspense>: "If the
   query has no data or its data is stale, it fetches the query and resolves
   with the result once that fetch resolves"). With `staleTime` one minute
   (`app/plugins/vue-query.ts:43`), and with `useChanged` invalidating broad
   prefixes such as `['coffees']` and `['shelves']` after most writes
   (`app/composables/useChanged.ts:21-44`), most revisits wait on a refetch even
   though the old data is in the cache.
3. **Client-side waterfalls.** Roaster page: roaster, then catalog
   (`app/pages/roasters/[roasterId].vue:26-45`). Shelf coffee page: coffee, then
   grinders and brew methods (`…/coffees/[coffeeId].vue:24`,
   `app/components/CoffeeGrindSettings.vue:18-20`). Library/Discover: filter
   labels, then the list, when the URL carries filters
   (`app/composables/useBrowsingAddress.ts:11-15`).
4. **Serial database round trips per request.**
   `GET /api/shelves/:id/coffees/:coffeeId` does `requireShelf` (session, then
   shelf: `server/utils/session.ts:10-17`, `:44-56`), then `findShelfCoffee`,
   which awaits one query after another: the coffee row, eight description
   queries (`server/utils/descriptions.ts:203-216`), verdict, community rating,
   reviews, up to two for "can delete", the roaster
   (`server/utils/coffees.ts:144-187`), purchases and two grind-settings queries
   (`server/utils/coffees.ts:206-238`). That is up to 18 sequential queries
   after the session and shelf lookups. `GET /api/coffees/:id` is similar
   (`server/utils/coffees.ts:189-204`). `profileStatsOf` runs three independent
   queries in sequence (`server/utils/stats.ts:10-40`). None of these use
   `Promise.all` (the only server uses are in `server/utils/filters.ts:44`,
   `server/utils/notifications.ts:73`, `server/utils/email.ts:49`, `:58`, and
   the Notion import). Each round trip to Neon costs network latency; serial
   round trips add up.
5. **Session lookup on every API call.** `requireUser` calls Better Auth
   `getSession` (`server/utils/session.ts:10-17`) and no `session.cookieCache`
   is configured (`server/utils/auth.ts`, no match for `cookieCache` in the
   repo). Better Auth's docs say "Calling your database every time `useSession`
   or `getSession` is invoked isn't ideal" and offer the cookie cache to avoid
   it (<https://www.better-auth.com/docs/concepts/session-management>).
6. **Hidden tabs still block.** Settings and Profile keep all tab panels mounted
   (`settings.vue:13`, `profile.vue:14`), so the page waits for the queries of
   tabs the person hasn't opened.

What Sentry shows (project `kees/coffeee`, queried 2026-11-07; very few sampled
server transactions, so treat as anecdotes, not statistics):

- Production `GET /api/shelves/:shelfId/coffees/:coffeeId`: 3 samples, p50 ~304
  ms. `GET /api/shelves/:shelfId/stock`: 1 sample, ~586 ms. SSR of
  `/shelves/:shelfId()/coffees/:coffeeId()`: 1 sample, ~738 ms. SSR of
  `/shelves/:shelfId()`: 1 production sample at ~4.2 s, and 33 development
  samples with p50 ~394 ms and p95 ~9.0 s (likely cold starts or dev server; not
  verified).
- Spans inside the `/shelves/:shelfId()` SSR segment include separate `session`
  and `user` selects on every request (consistent with item 5), `pg.connect` (5
  spans, ~1.3 s total) and `pg-pool.connect` (15 spans, ~1.3 s total), i.e.
  opening new Postgres connections is a visible cost, and one
  `POST https://coffeee-app-coffeee.inth.app/sessions` (~324 ms) made during the
  SSR, which looks like the c15t consent backend.
- `GET /api/c15t/**` in production: 307 samples, p50 ~131 ms, p95 ~3.9 s. Out of
  scope here, but worth a separate look, since c15t runs on every page
  (`nuxt.config.ts:21`, `app/app.vue:4`).

Better tracing (more samples, per-query DB spans) would be the way to confirm or
refute items 4 and 5 before rewriting endpoints.

## 2. What Nuxt and Vue Query already offer (primary sources)

### 2.1 Nuxt 4 and Vue `<Suspense>`

- "Nuxt uses Vue's `<Suspense>` component under the hood to prevent navigation
  before every async data is available"
  (<https://nuxt.com/docs/4.x/getting-started/data-fetching>, section Suspense).
  The installed `NuxtPage` wraps each page in
  `h(Suspense, { suspensible: true, onPending, onResolve })`
  (`node_modules/nuxt/dist/pages/runtime/page.js:130-152`).
- Vue: after `<Suspense>` has resolved once, when the default content is
  replaced "the previous `#default` content stays visible until the new content
  resolves"; a component with top-level `await` in `<script setup>` is an async
  dependency; `<Suspense>` itself "is an experimental feature"
  (<https://vuejs.org/guide/built-ins/suspense.html>).
- `useAsyncData` / `useFetch`: "`lazy` … If true, resolves after route loads
  (does not block navigation)"; with `await` and `lazy: false`, "client-side
  navigation is blocked until the data is ready"; "Under the hood, `lazy: false`
  uses `<Suspense>` to block the loading of the route"; "You do not need to
  `await` `useAsyncData`"; `status` is one of `idle`, `pending`, `success`,
  `error` (<https://nuxt.com/docs/4.x/api/composables/use-async-data>).
- "Prefer `lazy` (or `useLazyFetch` / `useLazyAsyncData`) when you want
  non-blocking behavior"; with `lazy`, "you will need to handle a loading
  state"; `server: false` means "the data will not be fetched before hydration
  is complete so you have to handle a pending state"; for several requests, "you
  can make them in parallel with `Promise.all()`"; data fetched on the server is
  "forwarded to the client in the payload" so the client does not refetch
  (<https://nuxt.com/docs/4.x/getting-started/data-fetching>).
- `getCachedData` default reads `nuxtApp.payload.data[key]` while hydrating and
  `nuxtApp.static.data[key]` otherwise
  (<https://nuxt.com/docs/4.x/api/composables/use-async-data>).
- `<NuxtLoadingIndicator>`: "Display a progress bar between page navigations";
  props include `throttle` (default 200 ms) and `duration` (default 2000 ms)
  (<https://nuxt.com/docs/4.x/api/components/nuxt-loading-indicator>). It
  listens to `page:loading:start` / `page:loading:end`
  (`node_modules/nuxt/dist/app/composables/loading-indicator.js:86-89`).

Nuxt's own answer to "show the page at once" is therefore: don't block (use
`lazy` or don't await), render `status === 'pending'` as a loading state, and
add `<NuxtLoadingIndicator>` for the cases that still block. That applies to
`useFetch`/`useAsyncData`; the app uses Vue Query instead, which has the same
building blocks (2.2).

### 2.2 TanStack Vue Query v5

- Per-query state: `isPending` / `status === 'pending'` means "The query has no
  data yet"; `isFetching` is true "if the query is fetching at any time
  (including background refetching)"; "The `status` gives information about the
  `data`" and "The `fetchStatus` gives information about the `queryFn`"
  (<https://tanstack.com/query/v5/docs/framework/vue/guides/queries>). So
  `isPending` → skeleton, `isFetching` with data → keep showing data.
- Separate `useQuery` calls in one component "execute in parallel"; `useQueries`
  covers a dynamic number of queries
  (<https://tanstack.com/query/v5/docs/framework/vue/guides/parallel-queries>).
- Stale data is shown while it refetches: stale queries refetch in the
  background when a new instance mounts, on window refocus and on reconnect;
  inactive queries are garbage-collected after 5 minutes by default
  (<https://tanstack.com/query/v5/docs/framework/vue/guides/important-defaults>).
  Only `suspense()` turns stale-while-revalidate into "wait" (1.4 item 2).
- SSR: the Nuxt recipe prefetches with
  `onServerPrefetch(async () => { await suspense() })` in pages, and notes
  "Because `staleTime` defaults to `0`, queries will be refetched in the
  background on page load by default"; "Any query with an error is automatically
  excluded from dehydration"; a `suspense()` on a query that stays disabled
  never resolves and "blocks the render" on the server
  (<https://tanstack.com/query/v5/docs/framework/vue/guides/ssr>,
  <https://tanstack.com/query/v5/docs/framework/vue/guides/suspense>).
  `onServerPrefetch` only runs during server rendering, so this pattern gives
  full HTML on the first load without blocking later client navigations.
- Suspense in Vue Query is labelled experimental: "These APIs WILL change and
  should not be used in production unless you lock both your Vue and Vue Query
  versions to patch-level versions"
  (<https://github.com/TanStack/query/blob/main/docs/framework/vue/guides/suspense.md>).
  The app uses caret ranges for both (`package.json`: `"vue": "^3.5.43"`,
  `"@tanstack/vue-query": "^5.105.1"`).
- Placeholder data: "the data is not persisted to the cache"; the query starts
  in `success` with `isPlaceholderData: true`; a detail query can take a preview
  from a list query in the cache
  (<https://tanstack.com/query/v5/docs/framework/react/guides/placeholder-query-data>,
  Vue example:
  <https://tanstack.com/query/v5/docs/framework/vue/guides/placeholder-query-data>).
  Useful for e.g. showing a `CoffeeCard`'s name/roaster/photo on the coffee page
  header at once while the full coffee loads.
- Prefetching: `queryClient.query` / `queryClient.infiniteQuery` warm the cache;
  "If **fresh** data for this query is already in the cache, the data will not
  be fetched"
  (<https://tanstack.com/query/v5/docs/framework/vue/guides/prefetching>). For
  render-as-you-fetch the suspense guide recommends prefetching "in routing
  callbacks or user interaction events"
  (<https://tanstack.com/query/v5/docs/framework/vue/guides/suspense>), which
  addresses the client waterfalls in 1.4 item 3.
- Request waterfalls are called "the biggest performance footgun" of
  fetch-in-component libraries
  (<https://tanstack.com/query/v5/docs/framework/react/guides/request-waterfalls>).
- Offline: Vue Query has `createPersister` and `broadcastQueryClient` plugins
  (<https://github.com/TanStack/query/tree/main/docs/framework/vue/plugins>) and
  network modes
  (<https://tanstack.com/query/v5/docs/framework/vue/guides/network-mode>).
- Devtools: `@tanstack/vue-query-devtools` plus browser extensions
  (<https://tanstack.com/query/v5/docs/framework/vue/devtools>).
- Latest `@tanstack/vue-query` on npm is 5.107.1
  (`npm view @tanstack/vue-query version`, 2026-11-07); installed is 5.105.1
  (`node_modules/@tanstack/vue-query/package.json:3`).

### 2.3 shadcn-vue Skeleton

- "Use to show a placeholder while content is loading." Install with
  `pnpm dlx shadcn-vue@latest add skeleton`; use as
  `<Skeleton class="w-[100px] h-[20px] rounded-full" />`
  (<https://www.shadcn-vue.com/docs/components/skeleton>).
- In the `reka-nova` style the app uses, the component is a single `div` with
  `bg-muted rounded-md animate-pulse` merged with the `class` prop
  (<https://github.com/unovue/shadcn-vue/blob/dev/apps/v4/styles/reka-nova/ui/skeleton/Skeleton.vue>).
  It has no loading logic of its own; the caller decides when to show it.

So skeletons plus per-section fetching need two things the stack already has: a
per-query pending flag (Vue Query `isPending`) and pages that don't block (no
top-level `await suspense()` on the client). Neither needs rstore.

## 3. rstore

Facts below come from the rstore docs, its GitHub repo and npm. Where a claim
comes from reading rstore's source rather than its docs, it says so and the
conclusion is marked as inference.

### 3.1 Maturity

- The repo moved: `Akryum/rstore` now resolves to `directus/rstore`
  (<https://github.com/directus/rstore>). 452 stars, MIT, created 2025-01-03.
  One person wrote nearly all of it (Akryum: 658 commits; seven others with 1 to
  3 each, <https://github.com/directus/rstore/graphs/contributors>), and
  `akryum` is the only npm maintainer (`npm view @rstore/vue maintainers`).
- **Pre-1.0.** All packages (`@rstore/vue`, `@rstore/core`, `@rstore/nuxt`,
  `@rstore/nuxt-drizzle`, `@rstore/offline`, `@rstore/shared`) are at **0.8.4,
  published 2026-03-08** (`npm view @rstore/nuxt-drizzle version time`;
  <https://registry.npmjs.org/@rstore/vue>). Releases were roughly weekly in
  Sept–Oct 2025 (0.7.4 to 0.8.0), then 0.8.1 to 0.8.4 between Nov 2025 and Mar
  2026, then **none for eight months**
  (<https://github.com/directus/rstore/releases>).
- `main` is 164 commits ahead of v0.8.4
  (<https://github.com/directus/rstore/compare/v0.8.4...main>), and **rstore.dev
  documents `main`**, with "New in v0.9" badges on features that are not on npm
  (e.g. <https://rstore.dev/plugins/nuxt-drizzle>). The devtools page documents
  `@rstore/devtools` (<https://rstore.dev/guide/devtools>), which is not
  published on npm (`npm view @rstore/devtools` → 404).
- 0.7 and 0.8 each shipped with breaking-change migration guides
  (<https://rstore.dev/guide/migration/v0_8>). An open PR proposes a
  "framework-agnostic store engine"
  (<https://github.com/directus/rstore/pull/63>), signalling more churn.
- 12 open issues and 7 open PRs at the time of writing
  (<https://github.com/directus/rstore/issues>).

### 3.2 Nuxt and Drizzle integration

- `@rstore/nuxt` scans `app/rstore/*.ts` for collections, handles the SSR
  payload and auto-imports a typed `useStore`
  (<https://rstore.dev/guide/getting-started#nuxt>). Its module meta declares no
  `compatibility` range; it depends on `@nuxt/kit ^4.0.0` and the repo builds
  against `nuxt ^4.1.3`
  (<https://github.com/directus/rstore/blob/v0.8.4/packages/nuxt/src/module.ts>,
  <https://github.com/directus/rstore/blob/v0.8.4/pnpm-workspace.yaml>). Not
  verified against Nuxt 4.6.3.
- `@rstore/nuxt-drizzle` reads `drizzle.config.ts`, generates one collection per
  exported table (types from `$inferSelect`) and **generates a REST CRUD API**
  under `/api/rstore/:collection[/:key]`
  (<https://rstore.dev/plugins/nuxt-drizzle>;
  <https://github.com/directus/rstore/blob/v0.8.4/packages/nuxt-drizzle/src/module.ts>).
- Its v0.8.4 docs: "By default, all tables in your Drizzle schema are exposed
  through the API. You can restrict the tables that are exposed by using the
  `allowTables` function." and "You can use nitro middlewares to add
  authentication to the API"
  (<https://github.com/directus/rstore/blob/v0.8.4/docs/plugins/nuxt-drizzle.md>,
  lines 156 and 199). Row-level rules go in per-table hooks (`hooksForTable`,
  `transformQuery`) (same page).
- This app's `drizzle.config.ts` points at `server/db/schemas/index.ts`
  (`drizzle.config.ts:8`), which re-exports the Better Auth tables `user`,
  `session`, `account` and `verification` (`server/db/schemas/index.ts:1`,
  `server/db/schemas/auth.schema.ts:10`, `:27`, `:52`, `:81`) alongside
  shelf-scoped data. Every shelf rule from
  `docs/adr/0005-shelves-own-the-data.md` ("every API route checks that the
  signed-in user is a member") would have to be re-expressed as rstore hooks.
- Inference from the v0.8.4 source (not run): `GET` passes client-supplied
  `with`/`columns` into Drizzle `findMany`, `allowTables` checks only the
  top-level collection, and `POST` inserts the raw request body
  (<https://github.com/directus/rstore/blob/v0.8.4/packages/nuxt-drizzle/src/runtime/server/api/index.get.ts>,
  <https://github.com/directus/rstore/blob/v0.8.4/packages/nuxt-drizzle/src/runtime/server/api/index.post.ts>,
  <https://github.com/directus/rstore/blob/v0.8.4/packages/nuxt-drizzle/src/runtime/server/utils/hooks.ts>).
  If right, relations reachable through `with` bypass the allow-list.
- Relations come from Drizzle's v1 `relations()`; v0.8.4 throws on relations
  with multiple fields/references (module.ts above). `where` supports "only
  simple filters … you can't do joins or subqueries"
  (<https://rstore.dev/plugins/nuxt-drizzle>). The repo's Drizzle playgrounds
  use SQLite (`packages/playground-drizzle*/drizzle.config.ts` on `main`);
  Postgres/Neon is not covered by a fixture there. A Nuxt 4 + nuxt-drizzle 0.8.4
  typecheck failure was reported in
  <https://github.com/directus/rstore/issues/62>.

### 3.3 Cache, fetch policies, loading state, SSR

- Normalized cache: items stored per collection under a key (default `id`)
  (<https://rstore.dev/guide/schema/collection#item-key>); relations "resolve …
  as soon as the data is available"
  (<https://rstore.dev/guide/schema/relations>); `many` queries compute their
  result from the cache (<https://rstore.dev/guide/data/query>).
- Fetch policies: `cache-first` (default), `cache-and-fetch`, `fetch-only`,
  `cache-only`, `no-cache`
  (<https://github.com/directus/rstore/blob/v0.8.4/docs/guide/data/query.md>,
  "Fetch Policy").
- Loading state: queries return `data`, `loading`, `error`, `refresh`; "The
  composables also return a promise so they can be used with async setup" (same
  file, line 35). Initial `data` is `[]` / `null` (source, inference). So
  skeletons work the same way as with Vue Query: don't await, show a skeleton
  while `loading` and there is no data.
- SSR: on the server, every query registers `onServerPrefetch(() => promise)`
  whether or not it is awaited
  (<https://github.com/directus/rstore/blob/v0.8.4/packages/vue/src/query.ts>,
  lines 557-562), and the whole cache is put in the Nuxt payload on
  `app:rendered`
  (<https://github.com/directus/rstore/blob/v0.8.4/packages/nuxt/src/runtime/plugin.ts>).
  Open issue: queries with `cache-and-fetch`/`fetch-only` still refetch right
  after hydration (<https://github.com/directus/rstore/issues/5>).

### 3.4 Mutations, offline, devtools, size

- Mutations: `create`/`update`/`delete` (and `…Many`); updates are optimistic by
  default since 0.7, as cache layers rolled back on error
  (<https://rstore.dev/guide/data/mutation>). Forms: `createForm` / `updateForm`
  with Standard Schema validation (<https://rstore.dev/guide/data/form>).
- Offline: `@rstore/offline` stores the cache and a queue of pending mutations
  in IndexedDB and replays them when back online; you write the `syncCollection`
  logic yourself (<https://rstore.dev/guide/data/offline>). Conflict handling is
  left to the backend per the `main` docs. Badged "New in v0.8"; an open issue
  reports an offline save being lost
  (<https://github.com/directus/rstore/issues/39>).
- Devtools: a Nuxt DevTools tab in 0.8.4, "currently only available in Nuxt"
  (<https://github.com/directus/rstore/blob/v0.8.4/docs/guide/data/module.md>).
- Size: no bundle size documented. Unpacked npm sizes (not gzip): `@rstore/vue`
  577 kB, `@rstore/core` 447 kB, `@rstore/shared` 207 kB
  (`npm view <pkg> dist.unpackedSize`).
- rstore's own comparison: versus Pinia Colada it is "higher-level",
  local-first, normalized rather than query-key cached; for TanStack Query "The
  comparison would be mostly the same as Pinia Colada"
  (<https://rstore.dev/guide/learn-more>).

### 3.5 rstore vs Vue Query for this app

|                                | Vue Query 5 (current)                                                      | rstore 0.8.4                                                                                                                                                                                   |
| ------------------------------ | -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Per-section loading state      | `isPending` per query (2.2)                                                | `loading` per query (3.3)                                                                                                                                                                      |
| Non-blocking + SSR first paint | `onServerPrefetch(suspense)` in pages (2.2)                                | automatic `onServerPrefetch` per query (3.3)                                                                                                                                                   |
| Cache model                    | query-key cache; invalidate by key prefix                                  | normalized by collection + key; lists recomputed from cache                                                                                                                                    |
| Invalidation in this app       | `useChanged` rules, 11 change types (`app/composables/useChanged.ts:4-53`) | entity updates propagate; server-computed aggregates (stock `max(roastedOn)`, community rating, profile stats: `server/utils/coffees.ts:84-98`, `server/utils/stats.ts`) still need refetching |
| Offline                        | `createPersister`, network modes (2.2)                                     | `@rstore/offline`, IndexedDB + mutation queue (3.4)                                                                                                                                            |
| Devtools                       | `@tanstack/vue-query-devtools`, browser extensions                         | Nuxt DevTools tab                                                                                                                                                                              |
| Maturity                       | 5.x stable; latest 5.107.1 on 2026-11-06                                   | 0.8.4; no release in 8 months; docs ahead of npm                                                                                                                                               |
| Types                          | from Nitro routes via `InternalApi` (ADR 0006)                             | from Drizzle `$inferSelect` (nuxt-drizzle) or declared by hand; our API responses are joined/aggregated shapes, not table rows                                                                 |
| Server side                    | existing Nitro routes with shelf checks (ADR 0005)                         | either keep our routes and write custom fetch plugins per collection, or adopt the generated CRUD API and re-implement auth and shelf rules as hooks                                           |
| Migration cost                 | none                                                                       | 22 queries + 36 mutations, 44 importing files, 16 query test files, `useChanged`, the SSR plugin                                                                                               |

## 4. Recommendation (opinion)

Everything in this section is my opinion, based on the facts above.

**Keep Vue Query. Don't adopt rstore now.** Skeletons and per-section fetching
are a change in how pages _wait_, not in which library caches. Vue Query already
gives per-query pending state, parallel queries, stale-while- revalidate and an
SSR prefetch hook that doesn't block client navigation. The blocking comes from
our own `await suspense()` calls and from slow endpoints, and rstore would fix
neither.

Why not rstore, specifically:

- **Maturity risk.** One maintainer, pre-1.0, two breaking minors in a row, no
  npm release since March while the docs describe unreleased v0.9. For a hobby
  app that must stay cheap to maintain, that is a lot of exposure.
- **It doesn't fit the server design.** The draw of `@rstore/nuxt-drizzle` is
  the generated CRUD API, but this app's data is shelf-scoped with membership
  checks on every route (ADR 0005), the schema includes the auth tables, and
  responses are joined aggregates (stock, community rating, reviews), not table
  rows. Using rstore safely means either writing a custom fetch plugin per
  collection on top of our existing routes (losing most of the benefit) or
  re-implementing authorization as hooks on a generic API that exposes every
  table by default.
- **The normalized cache helps less than it seems here.** Many views are
  server-computed (stock grouping, ratings, stats), so after a write they need a
  refetch either way; `useChanged` already handles that in one place.
- **Offline / local-first isn't what was asked.** If offline becomes a goal
  later, Vue Query's persister is the smaller step; revisit rstore once it
  reaches 1.0 with a Postgres-backed example.
- **Cost.** 58 hooks, 44 importing files, the plugin and 16+ test files would
  change, for no gain on the actual complaint.

When rstore _would_ be worth a second look: if the app moves towards offline
editing, realtime shared shelves, or many entity-level edits shown in several
lists at once, and rstore has shipped 1.0.

### Plan for the recommended path

Ordered by expected payoff per effort. Steps 1 and 2 alone should remove most of
the "page waits on data" feeling.

1. **Add a navigation signal.** Put `<NuxtLoadingIndicator />` in `app/app.vue`
   (2.1). Five-minute change, immediate feedback while anything still blocks.
2. **Stop blocking client navigation.** In each page and component in the table
   in 1.2, replace top-level `await suspense()` with
   `onServerPrefetch(() => suspense())` (the TanStack Nuxt recipe, 2.2). The
   first, server-rendered load still arrives with data in the HTML; client
   navigations render at once, showing cached (even stale) data immediately and
   refetching in the background. Things to handle per page:
   - Not-found: `showError` and `useCanonicalSlug` currently run after the await
     (`…/coffees/[coffeeId].vue:26-34`, `roasters/[roasterId].vue:29-37`,
     `coffees/[coffeeId].vue:19-27`). Move them into a `watch` on `error`/`data`
     (and keep them in the server prefetch so the server still answers 404/301).
     Needs a test that a missing coffee still 404s on SSR and on client
     navigation.
   - `useBrowsingAddress().start()` awaits filter labels before reading the URL
     (`app/composables/useBrowsingAddress.ts:11-15`); the list query can start
     in parallel with it, or labels can be prefetched with the list.
   - A query that is disabled must not be `suspense()`d on the server: it never
     resolves and blocks the render (2.2). `useFilterLabels` already guards this
     (`app/queries/filters.ts:63-65`).
   - Consider pinning `vue` and `@tanstack/vue-query` to exact versions while
     `suspense()` is used at all, as the Vue Query docs ask (2.2).
3. **Add skeletons per section.** `pnpm dlx shadcn-vue@latest add skeleton`
   (2.3). Render `<Skeleton>` while `isPending` (no data yet), not while
   `isFetching` (background refresh), so revisits never flash. Make one skeleton
   per section that has its own query: stock cards, the library grid/table,
   catalog results, roaster list, each settings/profile tab. Matching the real
   layout's size avoids layout shift.
4. **Split the big detail endpoint by section, where it pays.** The shelf coffee
   page could fetch the core coffee (header, photo, details) separately from
   reviews/community rating, purchases, and grind settings, each with its own
   `useQuery`, so the header shows first. Use `placeholderData` from the list
   cache for the header (2.2) so a coffee opened from Stock shows its name,
   roaster and photo instantly. Only split where sections are visually separate;
   one fast endpoint beats four slow ones.
5. **Make each endpoint faster** (server, independent of the above):
   - Run independent Drizzle queries concurrently (`Promise.all`) in
     `findCatalogCoffee`, `descriptionOf`, `findShelfCoffee` and
     `profileStatsOf` (1.4 item 4), or fold the description lists into fewer
     queries. Measure first: each concurrent query takes its own pool
     connection, and Sentry shows new connections are not free.
   - Turn on Better Auth's `session.cookieCache` with a short `maxAge` to skip
     the session and user lookups on most requests (2 queries per request per
     the Sentry spans), accepting the documented trade-off that a revoked
     session stays valid on other devices until the cache expires
     (<https://www.better-auth.com/docs/concepts/session-management>).
6. **Remove client waterfalls.** Create the roaster page's catalog query
   alongside the roaster query instead of after it
   (`roasters/[roasterId].vue:26-45`); start grinders and brew methods from the
   shelf coffee page rather than from the child that mounts after the coffee
   loads, or prefetch them with `queryClient.query` (2.2).
7. **Optionally prefetch on intent.** Warm a coffee/roaster query on link hover
   or on `NuxtLink` prefetch with `queryClient.query`, which skips the fetch
   when fresh data is cached (2.2).
8. **Tune staleness last.** Once nothing blocks on stale data, `staleTime` only
   controls how often background refetches happen; the one-minute default can
   stay.

Per the repo's test conventions, each changed page/component keeps its Nuxt
test, plus new cases for the skeleton state (`data-testid` on skeleton wrappers)
and for not-found handling without the top-level await.

## Sources

Nuxt and Vue

- <https://nuxt.com/docs/4.x/getting-started/data-fetching>
- <https://nuxt.com/docs/4.x/api/composables/use-async-data>
- <https://nuxt.com/docs/4.x/api/components/nuxt-loading-indicator>
- <https://vuejs.org/guide/built-ins/suspense.html>
- Installed source: `node_modules/nuxt/dist/pages/runtime/page.js`,
  `node_modules/nuxt/dist/app/composables/loading-indicator.js` (Nuxt 4.6.3)

TanStack Query

- <https://tanstack.com/query/v5/docs/framework/vue/guides/ssr>
- <https://tanstack.com/query/v5/docs/framework/vue/guides/suspense> (raw:
  <https://github.com/TanStack/query/blob/main/docs/framework/vue/guides/suspense.md>)
- <https://tanstack.com/query/v5/docs/framework/vue/guides/queries>
- <https://tanstack.com/query/v5/docs/framework/vue/guides/important-defaults>
- <https://tanstack.com/query/v5/docs/framework/vue/guides/parallel-queries>
- <https://tanstack.com/query/v5/docs/framework/vue/guides/placeholder-query-data>
- <https://tanstack.com/query/v5/docs/framework/react/guides/placeholder-query-data>
- <https://tanstack.com/query/v5/docs/framework/vue/guides/prefetching>
- <https://tanstack.com/query/v5/docs/framework/react/guides/request-waterfalls>
- <https://tanstack.com/query/v5/docs/framework/vue/guides/network-mode>
- <https://tanstack.com/query/v5/docs/framework/vue/devtools>
- <https://github.com/TanStack/query/tree/main/docs/framework/vue/plugins>
- Installed source:
  `node_modules/@tanstack/vue-query/build/modern/useBaseQuery.js` (5.105.1)
- npm: `npm view @tanstack/vue-query version` (5.107.1)

shadcn-vue

- <https://www.shadcn-vue.com/docs/components/skeleton>
- <https://github.com/unovue/shadcn-vue/blob/dev/apps/v4/styles/reka-nova/ui/skeleton/Skeleton.vue>

rstore

- <https://rstore.dev/guide/getting-started#nuxt>
- <https://rstore.dev/guide/data/query>
- <https://rstore.dev/guide/data/mutation>
- <https://rstore.dev/guide/data/form>
- <https://rstore.dev/guide/data/offline>
- <https://rstore.dev/guide/data/cache>
- <https://rstore.dev/guide/schema/collection#item-key>
- <https://rstore.dev/guide/schema/relations>
- <https://rstore.dev/guide/devtools>
- <https://rstore.dev/guide/learn-more>
- <https://rstore.dev/guide/migration/v0_8>
- <https://rstore.dev/plugins/nuxt-drizzle>
- <https://github.com/directus/rstore> (was `Akryum/rstore`)
- <https://github.com/directus/rstore/releases>
- <https://github.com/directus/rstore/compare/v0.8.4...main>
- <https://github.com/directus/rstore/graphs/contributors>
- <https://github.com/directus/rstore/blob/v0.8.4/docs/plugins/nuxt-drizzle.md>
- <https://github.com/directus/rstore/blob/v0.8.4/docs/guide/data/query.md>
- <https://github.com/directus/rstore/blob/v0.8.4/docs/guide/data/module.md>
- <https://github.com/directus/rstore/blob/v0.8.4/packages/vue/src/query.ts>
- <https://github.com/directus/rstore/blob/v0.8.4/packages/nuxt/src/module.ts>
- <https://github.com/directus/rstore/blob/v0.8.4/packages/nuxt/src/runtime/plugin.ts>
- <https://github.com/directus/rstore/blob/v0.8.4/packages/nuxt-drizzle/src/module.ts>
- <https://github.com/directus/rstore/blob/v0.8.4/packages/nuxt-drizzle/src/runtime/server/api/index.get.ts>
- <https://github.com/directus/rstore/blob/v0.8.4/packages/nuxt-drizzle/src/runtime/server/api/index.post.ts>
- <https://github.com/directus/rstore/blob/v0.8.4/packages/nuxt-drizzle/src/runtime/server/utils/hooks.ts>
- <https://github.com/directus/rstore/blob/v0.8.4/pnpm-workspace.yaml>
- Issues/PRs: [#5](https://github.com/directus/rstore/issues/5),
  [#39](https://github.com/directus/rstore/issues/39),
  [#62](https://github.com/directus/rstore/issues/62),
  [#63](https://github.com/directus/rstore/pull/63)
- npm: <https://registry.npmjs.org/@rstore/vue>,
  `npm view @rstore/<pkg> version time dist.unpackedSize maintainers`

Other

- <https://www.better-auth.com/docs/concepts/session-management>
- Sentry trace explorer, org `kees`, project `coffeee`, span queries on
  `span.op:http.server` and on the `GET /shelves/:shelfId()` segment (14 and 30
  day windows, queried 2026-11-07)

Not verified

- The rstore Nuxt 4.6.3 / Drizzle 0.45 on Postgres (Neon) / Better Auth
  combination: no fixture or doc covers it.
- Whether the `nuxt-drizzle` `with`/body paths can actually be exploited: read
  from source, not run.
- When rstore 0.9 ships; gzip bundle sizes for either library.
- How much time the server endpoints lose to serial queries versus connection
  setup: Sentry has too few samples, and DB spans look incomplete (14 DB spans
  across 3 sampled shelf-coffee requests, where the code runs ~20 queries each).
- Whether `showError` inside `onServerPrefetch` still sets the SSR status code
  as it does after a top-level await; needs a test when implementing step 2.
