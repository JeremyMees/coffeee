import { drizzleAdapter } from '@better-auth/drizzle-adapter'
import { eq } from 'drizzle-orm'
import { betterAuth } from 'better-auth'
import type { GenericEndpointContext } from 'better-auth'
import { APIError, getOAuthState } from 'better-auth/api'
import { admin, oAuthProxy } from 'better-auth/plugins'
import { useRuntimeConfig } from 'nitropack/runtime'
import type { AuthConfig } from '#server/types/auth'
import * as schema from '#server/db/schemas'
import { useDb } from '#server/utils/db'
import { sendEmail } from '#server/utils/email'
import { claimInvites, joinInvitedShelves } from '#server/utils/invites'
import { notifyShelf } from '#server/utils/notifications'
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
      onPasswordReset: async ({ user }) => {
        await config.db
          .update(schema.user)
          .set({ emailVerified: true })
          .where(eq(schema.user.id, user.id))
      },
    },
    emailVerification: {
      sendOnSignUp: true,
      sendOnSignIn: true,
      autoSignInAfterVerification: true,
      sendVerificationEmail: async ({ user, url }) => {
        if (user.emailVerified) return

        await sendEmail({
          to: user.email,
          subject: 'Confirm your email for Coffeee',
          template: 'VerifyEmail',
          values: { name: user.name, link: url },
        })
      },
    },
    socialProviders: { google: config.google },
    databaseHooks: {
      user: {
        create: {
          before: async (user, context) => {
            const email = user.email.toLowerCase()
            const token = await inviteTokenFromSignUp(context)
            const { invites, provesEmail } = await claimInvites(config.db, {
              email,
              token,
            })
            const emailVerified = user.emailVerified || provesEmail

            if (email === config.adminEmail.toLowerCase()) {
              return { data: { ...user, emailVerified, role: 'admin' } }
            }

            if (invites.length === 0) {
              throw new APIError('UNPROCESSABLE_ENTITY', {
                code: 'INVITE_REQUIRED',
                message: 'You need an invite to join Coffeee',
              })
            }

            return { data: { ...user, emailVerified } }
          },
          after: async (user, context) => {
            await createShelf(config.db, {
              name: shelfNameFor(user.name),
              ownerId: user.id,
            })
            const joined = await joinInvitedShelves(config.db, {
              userId: user.id,
              email: user.email,
            })

            for (const shelfId of joined) {
              await notifyShelf(config.db, {
                shelfId,
                actorId: user.id,
                kind: 'memberJoined',
                origin: new URL(context?.request?.url ?? config.productionUrl)
                  .origin,
              })
            }
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
