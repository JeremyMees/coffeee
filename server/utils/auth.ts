import { drizzleAdapter } from '@better-auth/drizzle-adapter'
import { betterAuth } from 'better-auth'
import type { GenericEndpointContext } from 'better-auth'
import { APIError, getOAuthState } from 'better-auth/api'
import { admin, oAuthProxy } from 'better-auth/plugins'
import { useRuntimeConfig } from 'nitropack/runtime'
import type { AuthConfig } from '#server/types/auth'
import * as schema from '#server/db/schemas'
import { useDb } from '#server/utils/db'
import { sendEmail } from '#server/utils/email'
import { claimInvite } from '#server/utils/invites'
import { createShelf, shelfNameFor } from '#server/utils/shelves'

const hosts = [
  'localhost:*',
  '127.0.0.1:*',
  'coffeee-*.vercel.app',
  'www.coffeee.app',
  'coffeee.app',
]

async function inviteTokenFromSignUp(context: GenericEndpointContext | null) {
  const state = await getOAuthState().catch(() => null)
  const token =
    context?.query?.inviteToken ?? state?.additionalData?.inviteToken

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
      'https://www.coffeee.app',
      'https://coffeee.app',
    ],
    database: drizzleAdapter(config.db, { provider: 'pg', schema }),
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true,
      sendResetPassword: ({ user, url }) =>
        sendEmail({
          to: user.email,
          subject: 'Reset your Coffeee password',
          template: 'ResetPassword',
          values: { name: user.name, link: url },
        }),
    },
    emailVerification: {
      sendOnSignUp: true,
      sendOnSignIn: true,
      autoSignInAfterVerification: true,
      sendVerificationEmail: ({ user, url }) =>
        sendEmail({
          to: user.email,
          subject: 'Confirm your email for Coffeee',
          template: 'VerifyEmail',
          values: { name: user.name, link: url },
        }),
    },
    socialProviders: { google: config.google },
    databaseHooks: {
      user: {
        create: {
          before: async (user, context) => {
            const email = user.email.toLowerCase()

            if (email === config.adminEmail.toLowerCase()) {
              return { data: { ...user, role: 'admin' } }
            }

            const token = await inviteTokenFromSignUp(context)
            const invite = await claimInvite(config.db, { email, token })

            if (!invite) {
              throw new APIError('UNPROCESSABLE_ENTITY', {
                code: 'INVITE_REQUIRED',
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
