import type { BetterAuthPlugin } from 'better-auth'
import type { Database } from '#server/types/database'

export interface AuthConfig {
  db: Database
  secret: string
  productionUrl: string
  adminEmail: string
  google: { clientId: string; clientSecret: string }
  plugins?: BetterAuthPlugin[]
}
