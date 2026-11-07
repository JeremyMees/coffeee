# Pages render straight away and load per section in the browser

Pages used to wait for their data before showing anything: setup awaited
`suspense()`, so after a tap the old page stayed on screen until every query for
the new page had finished. That is what made the app feel slow.

Now a page shows its layout immediately and every section loads its own data
with Vue Query, in the browser, showing a skeleton until the data is there. The
server renders the layout and the skeletons and fetches no data on a first load.
Vue Query's `suspense()` is marked experimental, so this also removes a
dependency on an unstable API.

rstore was considered as a replacement for Vue Query and not adopted:

- It is pre-1.0, has had no release in eight months and is maintained mostly by
  one person.
- Its Drizzle module exposes every table by default, which would bypass the
  shelf membership checks of [ADR 0005](0005-shelves-own-the-data.md).
- Moving 58 hooks to it would not fix the real slowness: blocking `suspense()`
  calls, chained requests, one large endpoint built from serial queries and a
  session lookup on every call.

Look at rstore again if offline editing or live shared shelves become goals and
rstore has reached 1.0.

The research behind this is in
[loading states and data fetching](../research/loading-states-and-data-fetching.md).

## Consequences

- A section shows its skeleton only while its query has no data. A background
  refetch keeps the content on screen.
- `QuerySection` shows the skeleton, an error with retry, an offline message
  with retry, or the content. Skeletons live in `app/components/skeletons` and
  are left out of coverage; the component or page using one tests that it shows
  while loading.
- Queries do not run on the server, so nothing is dehydrated for them.
- A 404 for a coffee, roaster or shelf is shown in the browser and is not a real
  404 response on a first load. That is acceptable because the app is
  invite-only.
- Better Auth caches the session in a cookie for 5 minutes. A revoked session or
  a removed admin role can take that long to apply. `/api/me` skips the cache so
  profile changes show at once.
