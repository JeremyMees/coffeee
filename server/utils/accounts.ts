import { and, asc, eq, inArray, ne } from 'drizzle-orm'
import type { Database } from '#server/types/database'
import {
  brewMethod,
  coffee,
  farm,
  flavorNote,
  grinder,
  grinderBrand,
  invite,
  processList,
  producer,
  region,
  roaster,
  shelf,
  shelfMember,
  user,
  varietal,
  washingStation,
} from '#server/db/schemas'

const catalogTables = [
  roaster,
  coffee,
  flavorNote,
  grinderBrand,
  grinder,
  brewMethod,
  processList,
  producer,
  varietal,
  region,
  farm,
  washingStation,
]

export async function listOwnedShelves(db: Database, userId: string) {
  const rows = await db
    .select({
      id: shelf.id,
      name: shelf.name,
      memberId: user.id,
      memberName: user.name,
    })
    .from(shelf)
    .leftJoin(
      shelfMember,
      and(eq(shelfMember.shelfId, shelf.id), ne(shelfMember.userId, userId)),
    )
    .leftJoin(user, eq(user.id, shelfMember.userId))
    .where(eq(shelf.ownerId, userId))
    .orderBy(asc(shelf.createdAt), asc(shelfMember.joinedAt))

  const shelves = new Map<
    string,
    { id: string; name: string; members: { id: string; name: string }[] }
  >()

  for (const row of rows) {
    const owned = shelves.get(row.id) ?? {
      id: row.id,
      name: row.name,
      members: [],
    }

    if (row.memberId)
      owned.members.push({ id: row.memberId, name: row.memberName! })

    shelves.set(row.id, owned)
  }

  return [...shelves.values()]
}

async function findOtherAdmin(db: Database, userId: string) {
  const [found] = await db
    .select({ id: user.id })
    .from(user)
    .where(and(eq(user.role, 'admin'), ne(user.id, userId)))
    .orderBy(asc(user.createdAt))
    .limit(1)

  return found
}

export async function deleteAccount(
  db: Database,
  input: { userId: string; heirs: Record<string, string> },
) {
  const admin = await findOtherAdmin(db, input.userId)

  if (!admin) return { outcome: 'noAdmin' as const }

  const owned = await listOwnedShelves(db, input.userId)
  const missing = owned.find(
    found =>
      found.members.length > 0 &&
      !found.members.some(member => member.id === input.heirs[found.id]),
  )

  if (missing) return { outcome: 'heirMissing' as const, shelf: missing }

  await db.transaction(async tx => {
    const empty = owned.filter(found => found.members.length === 0)

    if (empty.length > 0) {
      await tx.delete(shelf).where(
        inArray(
          shelf.id,
          empty.map(found => found.id),
        ),
      )
    }

    for (const found of owned) {
      if (found.members.length === 0) continue

      await tx
        .update(shelf)
        .set({ ownerId: input.heirs[found.id]! })
        .where(eq(shelf.id, found.id))
    }

    for (const table of catalogTables) {
      await tx
        .update(table)
        .set({ createdBy: admin.id })
        .where(eq(table.createdBy, input.userId))
    }

    await tx
      .update(invite)
      .set({ createdBy: admin.id })
      .where(eq(invite.createdBy, input.userId))

    await tx.delete(user).where(eq(user.id, input.userId))
  })

  return { outcome: 'deleted' as const }
}
