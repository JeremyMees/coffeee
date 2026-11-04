import {
  and,
  asc,
  count,
  eq,
  inArray,
  isNull,
  notExists,
  sql,
} from 'drizzle-orm'
import type { Database } from '#server/types/database'
import { purchase, shelf, shelfMember, user } from '#server/db/schemas'
import { withFreshId } from '#server/utils/ids'
import { changeShelf } from '#server/utils/notifications'

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
    const [created] = await withFreshId(tx, (db, id) =>
      db
        .insert(shelf)
        .values({ ...input, id })
        .returning(columns),
    )

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

export function shelvesHolding(
  db: Database,
  input: { coffeeId: string; userId: string },
) {
  return db
    .select({
      id: shelf.id,
      name: shelf.name,
      bags: count(purchase.id),
      inStock: count(
        sql`case when ${isNull(purchase.finishedAt)} then ${purchase.id} end`,
      ),
    })
    .from(shelfMember)
    .innerJoin(shelf, eq(shelf.id, shelfMember.shelfId))
    .leftJoin(
      purchase,
      and(
        eq(purchase.shelfId, shelf.id),
        eq(purchase.coffeeId, input.coffeeId),
      ),
    )
    .where(eq(shelfMember.userId, input.userId))
    .groupBy(shelf.id, shelfMember.joinedAt)
    .orderBy(asc(shelfMember.joinedAt), asc(shelf.createdAt))
}

export function listShelfMembers(db: Database, shelfId: string) {
  return db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image,
      joinedAt: shelfMember.joinedAt,
    })
    .from(shelfMember)
    .innerJoin(user, eq(user.id, shelfMember.userId))
    .where(eq(shelfMember.shelfId, shelfId))
    .orderBy(asc(shelfMember.joinedAt))
}

export async function renameShelf(
  db: Database,
  input: { shelfId: string; name: string },
) {
  const [renamed] = await db
    .update(shelf)
    .set({ name: input.name })
    .where(eq(shelf.id, input.shelfId))
    .returning(columns)

  return renamed!
}

async function isMember(
  db: Database,
  input: { shelfId: string; userId: string },
) {
  const [found] = await db
    .select({ userId: shelfMember.userId })
    .from(shelfMember)
    .where(
      and(
        eq(shelfMember.shelfId, input.shelfId),
        eq(shelfMember.userId, input.userId),
      ),
    )

  return Boolean(found)
}

async function countShelves(db: Database, userId: string) {
  const [found] = await db
    .select({ shelves: count() })
    .from(shelfMember)
    .where(eq(shelfMember.userId, userId))

  return found!.shelves
}

async function countMembers(db: Database, shelfId: string) {
  const [found] = await db
    .select({ members: count() })
    .from(shelfMember)
    .where(eq(shelfMember.shelfId, shelfId))

  return found!.members
}

async function giveShelflessAShelf(db: Database, userIds: string[]) {
  if (userIds.length === 0) return

  const shelfless = await db
    .select({ id: user.id, name: user.name })
    .from(user)
    .where(
      and(
        inArray(user.id, userIds),
        notExists(
          db
            .select({ userId: shelfMember.userId })
            .from(shelfMember)
            .where(eq(shelfMember.userId, user.id)),
        ),
      ),
    )

  for (const found of shelfless) {
    await createShelf(db, { name: shelfNameFor(found.name), ownerId: found.id })
  }
}

export async function handOverShelf(
  db: Database,
  input: { shelfId: string; ownerId: string },
) {
  if (
    !(await isMember(db, { shelfId: input.shelfId, userId: input.ownerId }))
  ) {
    return { outcome: 'notMember' as const }
  }

  const [handedOver] = await db
    .update(shelf)
    .set({ ownerId: input.ownerId })
    .where(eq(shelf.id, input.shelfId))
    .returning(columns)

  return { outcome: 'handedOver' as const, shelf: handedOver! }
}

export function removeMember(
  db: Database,
  input: { shelfId: string; ownerId: string; userId: string; origin: string },
) {
  if (input.userId === input.ownerId) {
    return Promise.resolve({ outcome: 'owner' as const })
  }

  return changeShelf(db, input.origin, async (tx, notify) => {
    const removed = await tx
      .delete(shelfMember)
      .where(
        and(
          eq(shelfMember.shelfId, input.shelfId),
          eq(shelfMember.userId, input.userId),
        ),
      )
      .returning({ userId: shelfMember.userId })

    if (removed.length === 0) return { outcome: 'notMember' as const }

    await giveShelflessAShelf(tx, [input.userId])
    await notify({
      shelfId: input.shelfId,
      actorId: input.userId,
      kind: 'memberLeft',
      skip: input.ownerId,
    })

    return { outcome: 'removed' as const }
  })
}

export async function deleteShelf(
  db: Database,
  input: { shelfId: string; userId: string },
) {
  if ((await countShelves(db, input.userId)) <= 1) {
    return { outcome: 'lastShelf' as const }
  }

  await db.transaction(async tx => {
    const members = await tx
      .delete(shelfMember)
      .where(eq(shelfMember.shelfId, input.shelfId))
      .returning({ userId: shelfMember.userId })

    await tx.delete(shelf).where(eq(shelf.id, input.shelfId))
    await giveShelflessAShelf(
      tx,
      members.map(member => member.userId),
    )
  })

  return { outcome: 'deleted' as const }
}

export function leaveShelf(
  db: Database,
  input: { shelfId: string; ownerId: string; userId: string; origin: string },
) {
  return changeShelf(db, input.origin, async (tx, notify) => {
    if ((await countShelves(tx, input.userId)) <= 1) {
      return { outcome: 'lastShelf' as const }
    }

    if (input.userId === input.ownerId) {
      if ((await countMembers(tx, input.shelfId)) > 1) {
        return { outcome: 'handOverFirst' as const }
      }

      await tx.delete(shelf).where(eq(shelf.id, input.shelfId))

      return { outcome: 'deleted' as const }
    }

    const left = await tx
      .delete(shelfMember)
      .where(
        and(
          eq(shelfMember.shelfId, input.shelfId),
          eq(shelfMember.userId, input.userId),
        ),
      )
      .returning({ userId: shelfMember.userId })

    if (left.length > 0) {
      await notify({
        shelfId: input.shelfId,
        actorId: input.userId,
        kind: 'memberLeft',
      })
    }

    return { outcome: 'left' as const }
  })
}
