# Nuxt tests run against the real routes

Nuxt component and page tests used to talk to a hand-written fake server. It
re-implemented server behaviour such as paging and upserts, triggered failures
with magic names and prices, and returned untyped responses, so it drifted from
the real routes. That is the drift ADR 0006 exists to prevent. Every new feature
also meant writing its routes twice.

So Nuxt tests call the real handlers under `server/api` on PGlite, through the
same `$fetch` the app uses. The route table is built from the file names under
`server/api`, so a new route needs nothing in test code. A typed fake was
considered and rejected: it would still need every route written out and kept in
step with the server.

## Consequences

- Tests set up a scenario with seed data from `test/support/scenarios.ts`, which
  calls the same domain functions the routes use. They never mutate fake state.
- `signIn(member)` is the only way to be signed in. It makes a real session and
  sets the current user, so the page and the server agree.
- `registerEndpoint` is used only through `failRequest`, to make one route fail
  in one test. Tests never register endpoints that return data.
- Tests assert on what the page shows or what is in the database, never on the
  requests that were sent.
- The database is reset before each test in one place, `test/nuxt/setup.ts`.
- Emails go to an outbox that tests read. Photos use local storage. Google
  sign-in is not exercised.
