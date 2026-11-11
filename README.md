# Coffeee

Your coffee shelf, and every coffee you ever bought.

Coffeee is a coffee log for people who love specialty coffee. It keeps track of
the bags on your shelf right now and every coffee you ever bought, so the good
ones are easy to find and buy again.

**Live:** [coffeee.app](https://coffeee.app)
(sign-up is invite-only)

## What it does

- **Stock**: the bags you have open or waiting, how fresh they are and when they
  were roasted.
- **Library**: every coffee you ever bought, with prices, purchase dates and
  your rating, sortable and filterable.
- **Discover**: the shared catalog of coffees everyone added, with community
  ratings.
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

## Deploying

Pull requests and pushes to `main` run lint, format, typecheck, the tests (with
an 80% coverage gate) and Playwright in GitHub Actions. A pull request gets its
own Neon database branch and a Vercel preview; a push to `main` migrates the
production database and deploys to production. See
[ADR 0003](docs/adr/0003-deploy-from-github-actions.md).
