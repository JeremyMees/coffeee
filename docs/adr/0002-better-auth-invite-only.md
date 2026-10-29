# Better Auth with Google and passkeys, invite-only

Each user has their own private purchases, ratings and grind settings on top of
a shared catalog, so we need real accounts and an admin role. We use Better Auth
with its Drizzle adapter, so users and sessions live in our own Neon database at
no cost, and its passkey and admin plugins cover sign-in and roles without
writing that ourselves. People sign in with Google or a passkey: neither needs
an email-sending service or stored passwords, and Sign in with Apple was skipped
because it needs a paid Apple developer account. Sign-up is invite-only for now
to stay comfortably inside the free tiers.

## Considered Options

- **nuxt-auth-utils**: lighter and Nuxt-native, but user tables, roles and
  invites would all be ours to build and test.
- **Neon Auth (managed Better Auth)**: free and in the same database, but its
  plugin set is fixed (no custom plugins; passkeys and sign-up controls are not
  listed as supported) and Nuxt is not a supported framework. Running Better
  Auth inside our own Nuxt server keeps passkeys, invites and roles in reach,
  and lets the auth flows run in our PGlite integration tests.
- **Supabase Auth / Clerk**: hosted, but adds a second vendor and either couples
  us to Supabase or hits paid tiers as users grow.
