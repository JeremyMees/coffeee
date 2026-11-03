import type { BetterAuthPlugin } from 'better-auth'
import type { GoogleOptions } from 'better-auth/social-providers'
import type { Database } from '#server/types/database'

export interface AuthConfig {
  db: Database
  secret: string
  productionUrl: string
  adminEmail: string
  google: GoogleOptions
  plugins?: BetterAuthPlugin[]
}
