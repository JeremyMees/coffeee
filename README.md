# Coffeee

Your coffee shelf, and every coffee you ever bought.

Coffeee is a coffee log for people who love specialty coffee. It keeps track of
the bags on your shelf right now and every coffee you ever bought, so the good
ones are easy to find and buy again.

**Live:** [coffeee.app](https://coffeee.app) (sign-up is invite-only)

## What it does

- **Stock**: the bags you have open or waiting, how fresh they are and when they
  were roasted.
- **Adding a coffee**: the form spots a coffee that is already in the catalog or
  on your shelf as soon as you type its name and roaster, and offers to add a
  bag to it instead of filling in its details again
  ([ADR 0015](docs/adr/0015-adding-a-known-coffee-adds-a-bag.md)).
- **Library**: the shared catalog of coffees everyone added, with community
  ratings. Narrow it to the coffees you bought to see your prices, purchase
  dates and rating, in a grid or a sortable table.
- **Roasters**: every roaster, where they are and which ones you buy from.
- **Shelves**: share one stock with the people you live or work with. Everyone
  adds, finishes and rates the same bags.
- **Verdicts and grind settings**: rate a coffee, say whether you would buy it
  again and save the grind setting that worked, then see what others with the
  same grinder used.
- **Installable**: works as a PWA on your phone.

The words the app uses, and what each one means, are in
[GLOSSARY.md](GLOSSARY.md).

## Built with

- [Nuxt 4](https://nuxt.com) and Vue 3, with Tailwind CSS 4 and
  [shadcn-vue](https://www.shadcn-vue.com)
- [TanStack Query](https://tanstack.com/query) and
  [TanStack Table](https://tanstack.com/table)
- [Neon](https://neon.com) Postgres with [Drizzle ORM](https://orm.drizzle.team)
- [Better Auth](https://www.better-auth.com): email and password, Google and
  passkeys, invite-only
- [Plunk](https://www.useplunk.com) and [Maizzle](https://maizzle.com) for email
- Vercel for hosting and Blob storage for photos, Sentry for errors
- [nuxt-security](https://nuxt-security.vercel.app) for the content security
  policy and security headers
- Vitest (against a real PGlite database) and Playwright for tests

The reasons behind the main choices are written down as decision records in
[docs/adr](docs/adr).

## Running it locally

You need Node.js 24, pnpm and Docker.

```bash
pnpm install
cp .env.example .env
docker compose up -d
```

In `.env`, set at least:

```bash
NUXT_DATABASE_URL="postgres://postgres:postgres@localhost:5432/coffeee"
NUXT_BETTER_AUTH_SECRET="any long random string"
NUXT_ADMIN_EMAIL="you@example.com"
```

`runtimeConfig` in `nuxt.config.ts` gives each value a zod schema. The server
refuses to start without `NUXT_DATABASE_URL` and `NUXT_BETTER_AUTH_SECRET`; the
other values default to an empty string.

Then create the tables and start the app on
[localhost:3000](http://localhost:3000):

```bash
pnpm db:migrate
pnpm dev
```

Sign up with the address in `NUXT_ADMIN_EMAIL` to get the admin role; anyone
else needs an invite. Signing up with a password sends a confirmation email, so
fill in `NUXT_PLUNK_API_KEY` and `NUXT_EMAIL_FROM` too, or fill in the Google
keys and sign in with Google. Without the Blob keys, photos are stored locally.

Once you have a shelf named `test` with at least six coffees, you can fill it
with test people, ratings and grind settings:

```bash
pnpm seed:dev
```

## Scripts

| Command            | What it does                                 |
| ------------------ | -------------------------------------------- |
| `pnpm dev`         | Starts the dev server                        |
| `pnpm test`        | Runs the unit, server and component tests    |
| `pnpm test:e2e`    | Builds the app and runs the Playwright tests |
| `pnpm lint`        | Lints with ESLint                            |
| `pnpm format:fix`  | Formats with Prettier                        |
| `pnpm typecheck`   | Checks the types                             |
| `pnpm db:generate` | Writes a migration after a schema change     |
| `pnpm db:migrate`  | Applies the migrations                       |
| `pnpm db:studio`   | Opens Drizzle Studio                         |

## Database work per request

Every API response carries a `Server-Timing` header with the database work that
request did:

```
server-timing: db;dur=18.1;desc="3 queries"
```

`dur` is the total time in milliseconds spent waiting on the database, and
`desc` the number of queries. Queries that run in parallel each add their own
time, so `dur` can be longer than the request. In the browser, open the network
panel, pick a request and look at its Timing tab, or read the header under
Headers. That works on production too.

The count belongs to one request, even while others run at the same time: the
plugin in `server/plugins/query-tally.ts` gives each API request its own tally,
and `talliedClient` in `server/utils/query-tally.ts` adds every query the
database client sends to it.

The heavy routes have a query budget in
`test/unit/server/api/query-budgets.test.ts`. The test fails when a route makes
more queries than its budget and says which route, its budget and the count. To
lower a budget, make the route do less work, run
`pnpm vitest run test/unit/server/api/query-budgets.test.ts` with the budget set
to `0` to see the new count in the failure message, and write that count in.
Budgets only go down. The tests run on PGlite, which doesn't count the `begin`
and `commit` of a transaction that Postgres in production does.

## Deploying

Pull requests and pushes to `main` run lint, format, typecheck, the tests (with
an 80% coverage gate) and Playwright in GitHub Actions. A pull request gets its
own Neon database branch and a Vercel preview; a push to `main` migrates the
production database and deploys to production. See
[ADR 0003](docs/adr/0003-deploy-from-github-actions.md).

Signed-out page requests, which are mostly bots, are sent to sign in by Vercel's
edge before the function starts, and by a Nitro middleware before any page
renders; see
[ADR 0014](docs/adr/0014-signed-out-visitors-skip-the-page-render.md).
