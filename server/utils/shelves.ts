import { and, asc, eq } from 'drizzle-orm'
import type { Database } from '#server/db/database'
import { shelf, shelfMember } from '#server/db/schemas'

const columns = { id: shelf.id, name: shelf.name, ownerId: shelf.ownerId }

export function shelfNameFor(userName: string) {
  const [firstName] = userName.trim().split(/\s+/)

  return firstName ? `${firstName}'s shelf` : 'My shelf'
}

export function createShelf(
  db: Database,
  input: { name: string; ownerId: string },
) {
  return db.transaction(async tx => {
    const [created] = await tx.insert(shelf).values(input).returning(columns)

    await tx
      .insert(shelfMember)
      .values({ shelfId: created!.id, userId: input.ownerId })

    return created!
  })
}

export function listShelves(db: Database, userId: string) {
  return db
    .select(columns)
    .from(shelfMember)
    .innerJoin(shelf, eq(shelf.id, shelfMember.shelfId))
    .where(eq(shelfMember.userId, userId))
    .orderBy(asc(shelfMember.joinedAt), asc(shelf.createdAt))
}

export async function findShelf(
  db: Database,
  input: { shelfId: string; userId: string },
) {
  const [found] = await db
    .select(columns)
    .from(shelfMember)
    .innerJoin(shelf, eq(shelf.id, shelfMember.shelfId))
    .where(
      and(
        eq(shelfMember.shelfId, input.shelfId),
        eq(shelfMember.userId, input.userId),
      ),
    )

  return found
}
