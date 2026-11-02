import type { InferSelectModel } from 'drizzle-orm'
import type { user } from '#server/db/schemas'

type User = InferSelectModel<typeof user>

export interface Viewer {
  id: User['id']
  role?: User['role']
}
