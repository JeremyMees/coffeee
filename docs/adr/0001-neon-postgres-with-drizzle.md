# Neon Postgres with Drizzle, photos on Vercel Blob

This is a hobby project that must run for free on Vercel's Hobby plan, so we
store data in Neon Postgres on its free tier and access it with Drizzle ORM.
Postgres fits the relational shape of the domain (coffees, purchases, grinders,
and many-to-many flavor notes, origins and processes), and `pg_trgm` gives us
"similar entries" suggestions for the shared lists. Neon was chosen over
Supabase because Supabase's free projects pause after a week without traffic,
and over Turso/SQLite because the shared, searchable catalog of coffees we plan
for later is easier to query in Postgres. Coffee photos are binary files, so
they live on Vercel Blob's free tier, not in the database, which only stores
each photo's URL.

## Consequences

- The Neon project is created directly on neon.com, not through the Vercel
  Marketplace. Deploys run from GitHub Actions (ADR 0003), so the workflows
  create and delete each pull request's Neon branch themselves; the Vercel
  integration's automatic preview branches would only fire for Vercel's own git
  deploys, which we turned off.
- Tests never touch Neon: unit and integration tests run on PGlite, and the
  Playwright tests in CI run on a Postgres service container.
