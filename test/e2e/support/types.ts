import type { InferSelectModel } from 'drizzle-orm'
import type { user } from '../../../server/db/schemas'

export type Role = 'user' | 'admin'

export type Member = Pick<
  InferSelectModel<typeof user>,
  'id' | 'name' | 'email'
> & { shelfId: string }

export interface People {
  signIn: (name: string, role?: Role) => Promise<Member>
  joinShelf: (member: Member, shelfId: string) => Promise<void>
}
