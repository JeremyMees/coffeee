import { drizzleAdapter } from '@better-auth/drizzle-adapter'
import { betterAuth } from 'better-auth'
import { APIError, getOAuthState } from 'better-auth/api'
import { admin, oAuthProxy } from 'better-auth/plugins'
import { useRuntimeConfig } from 'nitropack/runtime'
import type { AuthConfig } from '#server/types/auth'
import * as schema from '#server/db/schemas'
import { useDb } from '#server/utils/db'
import { claimInvite } from '#server/utils/invites'
import { createShelf, shelfNameFor } from '#server/utils/shelves'

const hosts = ['localhost:*', '127.0.0.1:*', 'coffeee-*.vercel.app']

async function inviteTokenFromSignIn() {
  const state = await getOAuthState().catch(() => null)
  const token = state?.additionalData?.inviteToken

  return typeof token === 'string' ? token : undefined
}

export function createAuth(config: AuthConfig) {
  return betterAuth({
    secret: config.secret,
    baseURL: { allowedHosts: hosts, fallback: config.productionUrl },
    trustedOrigins: [
      'http://localhost:*',
      'http://127.0.0.1:*',
      'https://coffeee-*.vercel.app',
    ],
    database: drizzleAdapter(config.db, { provider: 'pg', schema }),
    socialProviders: {
      google: {
        clientId: config.google.clientId,
        clientSecret: config.google.clientSecret,
      },
    },
    databaseHooks: {
      user: {
        create: {
          before: async user => {
            const email = user.email.toLowerCase()

            if (email === config.adminEmail.toLowerCase()) {
              return { data: { ...user, role: 'admin' } }
            }

            const token = await inviteTokenFromSignIn()
            const invite = await claimInvite(config.db, { email, token })

            if (!invite) {
              throw new APIError('FORBIDDEN', {
                message: 'You need an invite to join Coffeee',
              })
            }

            return { data: user }
          },
          after: async user => {
            await createShelf(config.db, {
              name: shelfNameFor(user.name),
              ownerId: user.id,
            })
          },
        },
      },
    },
    plugins: [
      admin(),
      oAuthProxy({ productionURL: config.productionUrl }),
      ...(config.plugins ?? []),
    ],
  })
}

let auth: ReturnType<typeof createAuth> | undefined

export function useAuth() {
  const config = useRuntimeConfig()

  auth ??= createAuth({
    db: useDb(),
    secret: config.betterAuthSecret,
    productionUrl: config.productionUrl,
    adminEmail: config.adminEmail,
    google: {
      clientId: config.googleClientId,
      clientSecret: config.googleClientSecret,
    },
  })

  return auth
}
